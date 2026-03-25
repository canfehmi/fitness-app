import {
  EMPTY_USER_FITNESS_PREFERENCES,
  type Goal,
  type Level,
  type UserFitnessPreferences,
} from "@/types/fitness";
import {
  parseMetric,
  parsePreferredMinutes,
} from "@/lib/userPreferencesMetrics";

const LEVELS: readonly Level[] = [
  "15min_1set",
  "30min_1set",
  "15min_2set",
  "30min_2set",
] as const;

export function parseGoal(value: unknown): Goal | null {
  if (value === "lose_weight" || value === "stay_fit") return value;
  return null;
}

export function parseLevel(value: unknown): Level | null {
  if (typeof value !== "string") return null;
  return (LEVELS as readonly string[]).includes(value) ? (value as Level) : null;
}

/**
 * Normalize a Supabase `user_preferences` row, draft JSON, or partial patch.
 * Prevents string numerics and invalid enums from propagating as wrong types.
 */
export function normalizeUserFitnessPreferences(
  row: Record<string, unknown> | null | undefined,
): UserFitnessPreferences | null {
  if (row == null) return null;
  return {
    goal: parseGoal(row.goal),
    level: parseLevel(row.level),
    preferred_minutes: parsePreferredMinutes(row.preferred_minutes),
    current_weight: parseMetric(row.current_weight),
    target_weight: parseMetric(row.target_weight),
    height_cm: parseMetric(row.height_cm),
  };
}

export function mergeUserFitnessPreferences(
  base: UserFitnessPreferences | null,
  patch: Partial<UserFitnessPreferences>,
): UserFitnessPreferences {
  const b = base ?? { ...EMPTY_USER_FITNESS_PREFERENCES };
  return {
    goal: patch.goal !== undefined ? patch.goal : b.goal,
    level: patch.level !== undefined ? patch.level : b.level,
    preferred_minutes:
      patch.preferred_minutes !== undefined
        ? patch.preferred_minutes
        : b.preferred_minutes,
    current_weight:
      patch.current_weight !== undefined ? patch.current_weight : b.current_weight,
    target_weight:
      patch.target_weight !== undefined ? patch.target_weight : b.target_weight,
    height_cm: patch.height_cm !== undefined ? patch.height_cm : b.height_cm,
  };
}

export function parseWeightKgForLog(value: unknown): number | null {
  const n = parseMetric(value);
  if (n === null) return null;
  if (n <= 0 || n > 500) return null;
  return n;
}
