/**
 * Personal coach insight engine — pure functions over local app data.
 * No network; safe with missing/empty inputs. UI can map strings to i18n if needed.
 */

import type { Goal, Level, UserFitnessPreferences } from "@/types/fitness";
import { parseMetric } from "@/lib/userPreferencesMetrics";
import { estimateSessionKcal } from "@/lib/homeWorkoutEstimate";
import {
  analyzeWorkoutStreaks,
  completionLocalDateKey,
  parseIsoToLocalDate,
} from "@/lib/workoutStreaks";

/** @see {@link analyzeWorkoutStreaks} — re-exported for older call sites. */
export {
  analyzeWorkoutStreaks,
  computeCurrentStreakDays as computeWorkoutStreakDays,
  computeWorkoutsCompletedThisWeek,
  computeWorkedOutToday,
} from "@/lib/workoutStreaks";
export type {
  WorkoutCompletionLike,
  WorkoutStreakAnalysis,
} from "@/lib/workoutStreaks";

// --- Input / output types ----------------------------------------------------

/** Minimal session shape the app already loads from Supabase. */
export type CoachSessionInput = {
  started_at: string;
  completed_at: string | null;
};

/** Minimal weight log shape. */
export type CoachWeightLogInput = {
  weight_kg: number | string | null;
  logged_at: string;
};

/** Exercise slice needed for kcal estimate (same as home workout). */
export type CoachExerciseEstimateInput = {
  work_seconds: number;
  rest_seconds: number;
  rounds: number;
};

export type CoachInsightsInput = {
  goal: Goal | null;
  /** Selected plan / level (e.g. 15min_1set). */
  level: Level | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  heightCm: number | null;
  /** Completed workouts (include incomplete rows only if you filter client-side). */
  workoutSessions: CoachSessionInput[];
  weightLogs: CoachWeightLogInput[];
  /**
   * Optional explicit “last time user finished a workout” — ISO string.
   * If omitted, derived from sessions with `completed_at` (max).
   */
  lastWorkoutCompletedAt?: string | null;
  /**
   * Today’s workout from `useWorkout` / home — drives kcal range.
   * If absent, we may still infer a rough range from `level` + `preferredMinutesFallback`.
   */
  todayWorkout?: {
    estimatedMinutes: number;
    exercises: CoachExerciseEstimateInput[];
  } | null;
  /** If level is set but no `todayWorkout`, used for rough kcal band. */
  preferredMinutesFallback?: number | null;
  /** Injectable clock (tests / previews). Defaults to `new Date()`. */
  now?: Date;
};

export type CoachNextAction =
  | "fill_body_metrics"
  | "start_workout"
  | "log_weight"
  | "rest_or_light_movement";

export type CoachDataQuality = "full" | "partial" | "minimal";

export type CoachInsightsResult = {
  /** kg still to lose toward target; null if not applicable or unknown. */
  remainingWeightToGoalKg: number | null;
  /** 0–100; null if we cannot compute (e.g. stay_fit, or bad numbers). */
  goalCompletionPercent: number | null;
  /**
   * Consecutive calendar days with ≥1 completed workout, counting backward
   * from the most recent workout day (forgiving if you haven’t trained “today” yet).
   */
  currentStreakDays: number;
  /** Completed sessions whose `completed_at` falls in the current ISO week (Mon–Sun, local). */
  workoutsCompletedThisWeek: number;
  /** Local calendar day: any completed session today. */
  workedOutToday: boolean;
  /** Longer motivational blurb. */
  motivationalSummary: string;
  /** Short line for a small card / hero. */
  dailyCoachCard: string;
  /**
   * Heuristic kcal band for today’s session (not medical advice).
   * Null if we cannot estimate.
   */
  todayCalorieBurnRange: { min: number; max: number; midpoint: number } | null;
  suggestedNextAction: CoachNextAction;
  dataQuality: CoachDataQuality;
};

// --- Core metrics ------------------------------------------------------------

/**
 * Remaining weight toward goal:
 * - lose_weight: max(0, current − target) = kg left to lose.
 * - stay_fit: no numeric “distance”; we return null (maintain, not chase a scale number).
 */
export function computeRemainingWeightToGoalKg(
  goal: Goal | null,
  currentKg: number | null,
  targetKg: number | null,
): number | null {
  if (goal !== "lose_weight") return null;
  if (currentKg == null || targetKg == null) return null;
  if (!Number.isFinite(currentKg) || !Number.isFinite(targetKg)) return null;
  const r = currentKg - targetKg;
  return r > 0 ? round1(r) : 0;
}

/**
 * Goal completion % for weight loss:
 * We need a “start” weight. We use the **earliest logged weight** if logs exist;
 * otherwise **profile current_weight** as a one-point baseline (degenerate but bounded).
 * Progress = (start − current) / (start − target) × 100, clamped [0, 100].
 * If start ≤ target or division unstable, return null.
 *
 * `currentKg` should be the same “current weight” you show in UI (usually profile
 * or latest log — pass explicitly when calling {@link deriveCoachInsights}).
 */
export function computeGoalCompletionPercent(input: {
  goal: Goal | null;
  currentKg: number | null;
  targetKg: number | null;
  weightLogs: CoachWeightLogInput[];
}): number | null {
  const { goal, currentKg, targetKg, weightLogs } = input;
  if (goal !== "lose_weight") return null;
  if (currentKg == null || targetKg == null) return null;
  if (!Number.isFinite(currentKg) || !Number.isFinite(targetKg)) return null;

  let startKg: number | null = null;
  if (weightLogs.length > 0) {
    const sorted = [...weightLogs].sort(
      (a, b) =>
        parseIsoToLocalDate(a.logged_at).getTime() -
        parseIsoToLocalDate(b.logged_at).getTime(),
    );
    const first = parseMetric(sorted[0]?.weight_kg);
    startKg = first;
  }
  if (startKg == null) startKg = currentKg;

  const denom = startKg - targetKg;
  if (denom <= 0) return null;
  const numer = startKg - currentKg;
  const pct = (numer / denom) * 100;
  if (!Number.isFinite(pct)) return null;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Uses the same formula as the home screen (`estimateSessionKcal`), then applies
 * a ±12% band to express uncertainty without implying false precision.
 */
export function computeTodayCalorieBurnRange(input: {
  estimatedMinutes: number;
  exercises: CoachExerciseEstimateInput[];
}): { min: number; max: number; midpoint: number } | null {
  const { estimatedMinutes, exercises } = input;
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) return null;
  if (!exercises?.length) return null;
  const mid = estimateSessionKcal(estimatedMinutes, exercises);
  if (!Number.isFinite(mid) || mid <= 0) return null;
  const spread = 0.12;
  return {
    midpoint: mid,
    min: Math.max(72, Math.round(mid * (1 - spread))),
    max: Math.min(520, Math.round(mid * (1 + spread))),
  };
}

/** Rough band when we only know typical session length (minutes) but not exercise list. */
function roughCalorieRangeFromMinutes(estimatedMinutes: number): {
  min: number;
  max: number;
  midpoint: number;
} | null {
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) return null;
  const mid = Math.round(Math.min(520, Math.max(72, estimatedMinutes * 6.5)));
  const spread = 0.15;
  return {
    midpoint: mid,
    min: Math.max(72, Math.round(mid * (1 - spread))),
    max: Math.min(520, Math.round(mid * (1 + spread))),
  };
}

function inferFallbackMinutes(
  level: Level | null,
  preferred: number | null | undefined,
): number | null {
  if (preferred != null && Number.isFinite(preferred) && preferred > 0) {
    return Math.round(preferred);
  }
  switch (level) {
    case "15min_1set":
    case "15min_2set":
      return 15;
    case "30min_1set":
      return 30;
    case "30min_2set":
      return 60;
    default:
      return null;
  }
}

function deriveDataQuality(input: CoachInsightsInput): CoachDataQuality {
  const hasBody =
    input.currentWeightKg != null &&
    input.targetWeightKg != null &&
    input.heightCm != null;
  const hasPrefs = input.goal != null && input.level != null;
  if (hasBody && hasPrefs) return "full";
  if (hasPrefs || input.currentWeightKg != null) return "partial";
  return "minimal";
}

function pickSuggestedNextAction(input: {
  goal: Goal | null;
  currentWeight: number | null;
  targetWeight: number | null;
  heightCm: number | null;
  workedOutToday: boolean;
  weightLogsCount: number;
}): CoachNextAction {
  const { goal, currentWeight, targetWeight, heightCm, workedOutToday, weightLogsCount } =
    input;
  if (
    goal == null ||
    currentWeight == null ||
    targetWeight == null ||
    heightCm == null
  ) {
    return "fill_body_metrics";
  }
  if (!workedOutToday) return "start_workout";
  if (weightLogsCount === 0 && goal === "lose_weight") return "log_weight";
  return "rest_or_light_movement";
}

function buildMessages(input: {
  goal: Goal | null;
  level: Level | null;
  remainingKg: number | null;
  pct: number | null;
  streak: number;
  thisWeek: number;
  workedOutToday: boolean;
  lastWorkoutLabel: string;
}): { summary: string; card: string } {
  const { goal, level, remainingKg, pct, streak, thisWeek, workedOutToday, lastWorkoutLabel } =
    input;

  const goalBit =
    goal === "lose_weight"
      ? "Kilo verme hedefin için tutarlılık en büyük güç."
      : goal === "stay_fit"
        ? "Formda kalmak; düzenli hareket ve iyi alışkanlıklarla mümkün."
        : "Hedefini netleştirdiğinde ilerleme daha görünür olur.";

  const numbersBit =
    pct != null && goal === "lose_weight"
      ? ` Tartı hedefine yaklaşık %${pct} mesafedesin.`
      : remainingKg != null && remainingKg > 0 && goal === "lose_weight"
        ? ` Yaklaşık ${remainingKg} kg daha hedefe yaklaşabilirsin.`
        : "";

  const streakBit =
    streak > 0
      ? ` Üst üste ${streak} gün antrenman ritmini taşıyorsun.`
      : " Bugün küçük bir adım bile seriyi başlatır.";

  const weekBit =
    thisWeek > 0
      ? ` Bu hafta ${thisWeek} antrenman tamamladın.`
      : " Bu hafta ilk antrenmanın için hazırsın.";

  const todayBit = workedOutToday
    ? " Bugün antrenmanını tamamladın; toparlanma da planın parçası."
    : " Bugün için hareket zamanı — vücudun hazır olduğunda başla.";

  const summary = [goalBit + numbersBit, streakBit, weekBit, todayBit].join("");

  const planHint = level ? ` (${String(level).replace(/_/g, " ")})` : "";
  const card = workedOutToday
    ? `Seri: ${streak} gün • Bu hafta ${thisWeek} • Son: ${lastWorkoutLabel}`
    : `Koç: ${streak > 0 ? `${streak} gün seriyi sürdür` : "Bugün ilk adımı at"}${planHint}`;

  return { summary, card };
}

/**
 * Main entry: derive all coach-facing fields from one input object.
 */
export function deriveCoachInsights(raw: CoachInsightsInput): CoachInsightsResult {
  const now = raw.now ?? new Date();
  const sessions = Array.isArray(raw.workoutSessions) ? raw.workoutSessions : [];
  const logs = Array.isArray(raw.weightLogs) ? raw.weightLogs : [];

  const currentKg = raw.currentWeightKg;
  const targetKg = raw.targetWeightKg;

  const remainingWeightToGoalKg = computeRemainingWeightToGoalKg(
    raw.goal,
    currentKg,
    targetKg,
  );

  const goalCompletionPercent = computeGoalCompletionPercent({
    goal: raw.goal,
    currentKg,
    targetKg,
    weightLogs: logs,
  });

  const streak = analyzeWorkoutStreaks(sessions, now);
  const currentStreakDays = streak.currentStreakDays;
  const workoutsCompletedThisWeek = streak.workoutsCompletedThisWeek;
  const workedOutToday = streak.workedOutToday;

  let todayCalorieBurnRange: CoachInsightsResult["todayCalorieBurnRange"] = null;
  if (raw.todayWorkout?.exercises?.length) {
    todayCalorieBurnRange = computeTodayCalorieBurnRange({
      estimatedMinutes: raw.todayWorkout.estimatedMinutes,
      exercises: raw.todayWorkout.exercises,
    });
  }
  if (todayCalorieBurnRange == null) {
    const mins = inferFallbackMinutes(raw.level, raw.preferredMinutesFallback);
    if (mins != null) {
      todayCalorieBurnRange = roughCalorieRangeFromMinutes(mins);
    }
  }

  const lastWorkoutLabel =
    raw.lastWorkoutCompletedAt != null
      ? completionLocalDateKey(parseIsoToLocalDate(raw.lastWorkoutCompletedAt))
      : streak.lastCompletionLocalDateKey ?? "—";

  const { summary: motivationalSummary, card: dailyCoachCard } = buildMessages({
    goal: raw.goal,
    level: raw.level,
    remainingKg: remainingWeightToGoalKg,
    pct: goalCompletionPercent,
    streak: currentStreakDays,
    thisWeek: workoutsCompletedThisWeek,
    workedOutToday,
    lastWorkoutLabel,
  });

  const suggestedNextAction = pickSuggestedNextAction({
    goal: raw.goal,
    currentWeight: currentKg,
    targetWeight: targetKg,
    heightCm: raw.heightCm,
    workedOutToday,
    weightLogsCount: logs.length,
  });

  const dataQuality = deriveDataQuality(raw);

  return {
    remainingWeightToGoalKg,
    goalCompletionPercent,
    currentStreakDays,
    workoutsCompletedThisWeek,
    workedOutToday,
    motivationalSummary,
    dailyCoachCard,
    todayCalorieBurnRange,
    suggestedNextAction,
    dataQuality,
  };
}

/**
 * Maps `UserFitnessPreferences` + fetched history into {@link CoachInsightsInput}
 * so screens don’t repeat field names (`current_weight` → `currentWeightKg`).
 */
export function buildCoachInsightsInput(options: {
  preferences: UserFitnessPreferences | null;
  workoutSessions: CoachSessionInput[];
  weightLogs: CoachWeightLogInput[];
  todayWorkout?: {
    estimatedMinutes: number;
    exercises: CoachExerciseEstimateInput[];
  } | null;
  lastWorkoutCompletedAt?: string | null;
  now?: Date;
}): CoachInsightsInput {
  const p = options.preferences;
  return {
    goal: p?.goal ?? null,
    level: p?.level ?? null,
    currentWeightKg: p?.current_weight ?? null,
    targetWeightKg: p?.target_weight ?? null,
    heightCm: p?.height_cm ?? null,
    workoutSessions: options.workoutSessions,
    weightLogs: options.weightLogs,
    lastWorkoutCompletedAt: options.lastWorkoutCompletedAt,
    todayWorkout: options.todayWorkout ?? null,
    preferredMinutesFallback: p?.preferred_minutes ?? null,
    now: options.now,
  };
}
