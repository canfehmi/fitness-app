import type { Goal, UserFitnessPreferences, WeightLogRow } from "@/types/fitness";
import { parseMetric } from "@/lib/userPreferencesMetrics";
import { parseIsoToLocalDate } from "@/lib/workoutStreaks";

export type GoalProgressInput = {
  goal: Goal | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  weightLogs: Pick<WeightLogRow, "weight_kg" | "logged_at">[];
};

export type GoalProgressResult = {
  startingWeightKg: number | null;
  latestLoggedWeightKg: number | null;
  targetWeightKg: number | null;
  totalWeightChangeNeededKg: number;
  achievedProgressKg: number;
  remainingProgressKg: number;
  goalCompletionPercent: number;
};

export type GoalProgressCardValues = {
  startingWeightLabel: string;
  latestWeightLabel: string;
  targetWeightLabel: string;
  achievedLabel: string;
  remainingLabel: string;
  completionLabel: string;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clampPct(p: number): number {
  return Math.round(Math.max(0, Math.min(100, p)));
}

function safeWeight(value: unknown): number | null {
  const n = parseMetric(value);
  if (n == null) return null;
  if (!Number.isFinite(n) || n <= 0 || n > 500) return null;
  return n;
}

function sortLogsByDateAsc(logs: Pick<WeightLogRow, "weight_kg" | "logged_at">[]) {
  return [...logs].sort(
    (a, b) =>
      parseIsoToLocalDate(a.logged_at).getTime() -
      parseIsoToLocalDate(b.logged_at).getTime(),
  );
}

/**
 * Core progress math for weight-based goals.
 *
 * FORMULAS (weight-loss):
 * - starting = earliest logged weight, fallback to profile current weight when no logs
 * - latest = most recent logged weight, fallback to profile current weight
 * - total needed = max(0, starting - target)
 * - achieved = max(0, starting - latest)
 * - remaining = max(0, total needed - achieved)
 * - completion % = achieved / total needed, clamped 0..100
 *
 * Why clamp with max(0)?
 * - Prevents misleading negatives like "-2.5 kg remaining" when the user has not started
 *   or gained weight after starting.
 *
 * Maintenance goal (`stay_fit`):
 * - There is no required weight delta by definition, so needed/achieved/remaining are 0
 *   and completion is 100 to keep UI cards simple and non-alarming.
 */
export function computeGoalProgress(input: GoalProgressInput): GoalProgressResult {
  const logs = Array.isArray(input.weightLogs) ? input.weightLogs : [];
  const sorted = sortLogsByDateAsc(logs);

  const earliestLogged = safeWeight(sorted[0]?.weight_kg);
  const latestLogged = safeWeight(sorted[sorted.length - 1]?.weight_kg);
  const current = safeWeight(input.currentWeightKg);
  const target = safeWeight(input.targetWeightKg);

  const startingWeightKg = earliestLogged ?? current ?? null;
  const latestLoggedWeightKg = latestLogged ?? current ?? null;
  const targetWeightKg = target ?? null;

  if (
    input.goal !== "lose_weight" ||
    startingWeightKg == null ||
    latestLoggedWeightKg == null ||
    targetWeightKg == null
  ) {
    return {
      startingWeightKg,
      latestLoggedWeightKg,
      targetWeightKg,
      totalWeightChangeNeededKg: 0,
      achievedProgressKg: 0,
      remainingProgressKg: 0,
      goalCompletionPercent: input.goal === "stay_fit" ? 100 : 0,
    };
  }

  const totalWeightChangeNeededKg = Math.max(0, round1(startingWeightKg - targetWeightKg));
  const achievedProgressKg = Math.max(0, round1(startingWeightKg - latestLoggedWeightKg));
  const remainingProgressKg = Math.max(
    0,
    round1(totalWeightChangeNeededKg - achievedProgressKg),
  );

  const goalCompletionPercent =
    totalWeightChangeNeededKg > 0
      ? clampPct((achievedProgressKg / totalWeightChangeNeededKg) * 100)
      : 100;

  return {
    startingWeightKg,
    latestLoggedWeightKg,
    targetWeightKg,
    totalWeightChangeNeededKg,
    achievedProgressKg,
    remainingProgressKg,
    goalCompletionPercent,
  };
}

export function computeGoalProgressFromPreferences(options: {
  preferences: UserFitnessPreferences | null;
  weightLogs: Pick<WeightLogRow, "weight_kg" | "logged_at">[];
}): GoalProgressResult {
  const p = options.preferences;
  return computeGoalProgress({
    goal: p?.goal ?? null,
    currentWeightKg: p?.current_weight ?? null,
    targetWeightKg: p?.target_weight ?? null,
    weightLogs: options.weightLogs,
  });
}

function kgLabel(value: number | null): string {
  if (value == null) return "-";
  const s = Number.isInteger(value) ? String(value) : String(round1(value));
  return `${s} kg`;
}

export function toGoalProgressCardValues(progress: GoalProgressResult): GoalProgressCardValues {
  return {
    startingWeightLabel: kgLabel(progress.startingWeightKg),
    latestWeightLabel: kgLabel(progress.latestLoggedWeightKg),
    targetWeightLabel: kgLabel(progress.targetWeightKg),
    achievedLabel: `${round1(progress.achievedProgressKg)} kg`,
    remainingLabel: `${round1(progress.remainingProgressKg)} kg`,
    completionLabel: `%${progress.goalCompletionPercent}`,
  };
}
