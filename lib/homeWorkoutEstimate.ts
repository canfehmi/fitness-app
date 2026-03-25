import type { Level } from "@/types/database";

type ExerciseLike = {
  work_seconds: number;
  rest_seconds: number;
  rounds: number;
};

/**
 * Rough kcal estimate from session length (moderate circuit-style work).
 * Not medical advice — for motivation / orientation only.
 */
export function estimateSessionKcal(
  estimatedMinutes: number,
  exercises: ExerciseLike[],
): number {
  const fromStructure = exercises.reduce((sum, ex) => {
    const secPerRound = ex.work_seconds + ex.rest_seconds;
    return sum + (ex.rounds * secPerRound) / 60;
  }, 0);
  const minutes = fromStructure > 0 ? fromStructure : estimatedMinutes;
  const kcal = Math.round(minutes * 6.5);
  return Math.min(520, Math.max(72, kcal));
}

export function difficultyI18nKey(level: Level | null | undefined): string {
  switch (level) {
    case "15min_1set":
      return "home.workout_value.level_beginner";
    case "30min_1set":
      return "home.workout_value.level_intermediate";
    case "15min_2set":
      return "home.workout_value.level_intermediate";
    case "30min_2set":
      return "home.workout_value.level_advanced";
    default:
      return "home.workout_value.level_beginner";
  }
}

export function goalI18nKey(
  goal: "lose_weight" | "stay_fit" | null | undefined,
): string {
  if (goal === "stay_fit") return "home.workout_value.goal_stay_fit";
  return "home.workout_value.goal_lose_weight";
}
