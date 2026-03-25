/**
 * Planned workout calorie burn — simple range estimate for a beginner app.
 *
 * ASSUMPTIONS (read before trusting numbers):
 * - Uses the common “MET × body mass” style linear model tuned for circuit-style
 *   bodyweight / mixed home workouts (not steady-state running or heavy lifting).
 * - Reference body mass 70 kg when the user’s weight is unknown (population average).
 * - `Level` already encodes typical session length and set count; we still allow
 *   overrides when the loaded workout row differs from the plan defaults.
 * - Does not know age, sex, heart rate, or actual exercise selection — expect ±20%
 *   vs reality for any individual session.
 *
 * LIMITATIONS:
 * - Not medical advice; for motivation and rough planning only.
 * - Very light or very heavy users may deviate more; we clamp outputs to sane bounds.
 */

import type { Level } from "@/types/database";

/** Reference mass (kg) for “typical adult” when user weight is missing. */
export const DEFAULT_REFERENCE_WEIGHT_KG = 70;

/** Absolute bounds so UI never shows absurd values (beginner circuit context). */
const KCAL_ABS_MIN = 60;
const KCAL_ABS_MAX = 600;

/**
 * MET (metabolic equivalent) bands per plan.
 * Tuned so 15–30 min sessions land in believable ranges at ~70 kg,
 * with 2-set plans slightly higher MET (more work per clock minute).
 */
const MET_BY_LEVEL: Record<Level, number> = {
  "15min_1set": 4.9,
  "30min_1set": 5.1,
  "15min_2set": 5.6,
  "30min_2set": 5.9,
};

/** Small nudge when `setCount` is 2 but duration is user-overridden (extra volume). */
const SET_COUNT_VOLUME_FACTOR: Record<1 | 2, number> = {
  1: 1,
  2: 1.06,
};

const PLAN_DEFAULTS: Record<Level, { durationMinutes: number; setCount: 1 | 2 }> = {
  "15min_1set": { durationMinutes: 15, setCount: 1 },
  "30min_1set": { durationMinutes: 30, setCount: 1 },
  "15min_2set": { durationMinutes: 15, setCount: 2 },
  "30min_2set": { durationMinutes: 30, setCount: 2 },
};

/**
 * ACSM-style linear estimate (same shape as many consumer apps):
 *   kcal ≈ MET × 3.5 × weightKg / 200 × durationMinutes
 * where 3.5 mL O₂/kg/min is the per-MET oxygen anchor.
 */
function kcalFromMet(
  met: number,
  weightKg: number,
  durationMinutes: number,
): number {
  if (!Number.isFinite(met) || !Number.isFinite(weightKg) || !Number.isFinite(durationMinutes)) {
    return NaN;
  }
  if (durationMinutes <= 0 || weightKg <= 0) return NaN;
  return (met * 3.5 * weightKg) / 200 * durationMinutes;
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.round(Math.min(hi, Math.max(lo, n)));
}

export type PlannedWorkoutCalorieInput = {
  /** Selected onboarding / profile plan — drives MET tier. */
  planLevel: Level;
  /** User mass in kg; null/invalid → {@link DEFAULT_REFERENCE_WEIGHT_KG}. */
  userWeightKg: number | null | undefined;
  /**
   * Total planned session length in minutes (e.g. from `workouts.estimated_minutes`).
   * Omit to use the default for `planLevel` (15 or 30).
   */
  durationMinutes?: number;
  /**
   * Number of sets (1 or 2). Omit to infer from `planLevel`.
   */
  setCount?: 1 | 2;
};

export type PlannedWorkoutCalorieRange = {
  /** Lower end of a believable band (not a floor guarantee). */
  min: number;
  /** Upper end of a believable band (not a ceiling guarantee). */
  max: number;
  /** Midpoint used before spreading into a range. */
  midpoint: number;
};

/**
 * Returns a calorie **range** (not a single fake-precise value).
 *
 * Logic:
 * 1. Pick MET from `planLevel` (intensity tier for this app’s four plans).
 * 2. Apply a small volume factor when `setCount === 2` (more work in the same clock time).
 * 3. Scale linearly with `userWeightKg` (heavier people burn more at the same MET).
 * 4. Spread ±14% around the midpoint so the UI can show “about X–Y kcal”.
 */
export function estimatePlannedWorkoutCalorieRange(
  input: PlannedWorkoutCalorieInput,
): PlannedWorkoutCalorieRange {
  const defaults = PLAN_DEFAULTS[input.planLevel];
  const duration =
    input.durationMinutes != null && Number.isFinite(input.durationMinutes)
      ? Math.max(1, input.durationMinutes)
      : defaults.durationMinutes;
  const sets =
    input.setCount === 1 || input.setCount === 2 ? input.setCount : defaults.setCount;

  const wRaw = input.userWeightKg;
  const weightKg =
    wRaw != null && Number.isFinite(wRaw) && wRaw > 0 && wRaw < 400
      ? wRaw
      : DEFAULT_REFERENCE_WEIGHT_KG;

  const metBase = MET_BY_LEVEL[input.planLevel];
  const met = metBase * SET_COUNT_VOLUME_FACTOR[sets];

  const raw = kcalFromMet(met, weightKg, duration);
  const safeMid = Number.isFinite(raw)
    ? raw
    : kcalFromMet(metBase, DEFAULT_REFERENCE_WEIGHT_KG, duration);

  const spread = 0.14;
  const minU = safeMid * (1 - spread);
  const maxU = safeMid * (1 + spread);

  let min = clampInt(minU, KCAL_ABS_MIN, KCAL_ABS_MAX);
  let max = clampInt(maxU, KCAL_ABS_MIN, KCAL_ABS_MAX);
  if (min > max) {
    const t = min;
    min = max;
    max = t;
  }

  const midClamped = clampInt(safeMid, KCAL_ABS_MIN, KCAL_ABS_MAX);
  const midpoint = Math.min(max, Math.max(min, midClamped));

  return {
    midpoint,
    min,
    max,
  };
}

/**
 * Turkish UI string: "Bugün yaklaşık 120–170 kcal yakabilirsin"
 * (Caller can swap template for i18n.)
 */
export function formatPlannedWorkoutCalorieRangeTr(range: PlannedWorkoutCalorieRange): string {
  const lo = Math.min(range.min, range.max);
  const hi = Math.max(range.min, range.max);
  return `Bugün yaklaşık ${lo}–${hi} kcal yakabilirsin`;
}
