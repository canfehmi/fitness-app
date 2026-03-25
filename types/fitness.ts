import type { Database, Goal, Level } from "./database";

export type { Goal, Level };

/** Canonical client shape for `user_preferences` fitness fields (single source of truth). */
export interface UserFitnessPreferences {
  goal: Goal | null;
  level: Level | null;
  preferred_minutes: number | null;
  current_weight: number | null;
  target_weight: number | null;
  height_cm: number | null;
}

export const EMPTY_USER_FITNESS_PREFERENCES: UserFitnessPreferences = {
  goal: null,
  level: null,
  preferred_minutes: null,
  current_weight: null,
  target_weight: null,
  height_cm: null,
};

export type WeightLogRow = Database["public"]["Tables"]["weight_logs"]["Row"];
export type WorkoutSessionRow = Database["public"]["Tables"]["workout_sessions"]["Row"];

/** Completed sessions only (used on Progress). */
export type WorkoutHistoryEntry = Pick<
  WorkoutSessionRow,
  "id" | "started_at" | "completed_at" | "duration_seconds"
>;
