import type { Goal, Level } from "@/types/fitness";

/** Profile screen — Program Bilgileri (unchanged copy). */
export const PROFILE_GOAL_LABELS_TR: Record<Goal, string> = {
  lose_weight: "🔥 Kilo Vermek",
  stay_fit: "💪 Formda Kalmak",
};

/** Home stat row — Hedef (unchanged copy). */
export const HOME_GOAL_STAT_LABELS_TR: Record<Goal, string> = {
  lose_weight: "🔥 Kilo Ver",
  stay_fit: "💪 Formda Kal",
};

/** Profile + home plan row — same labels everywhere (replaces fragile string replace on `level`). */
export const LEVEL_PLAN_LABELS_TR: Record<Level, string> = {
  "15min_1set": "15 dk / 1 Set",
  "30min_1set": "30 dk / 1 Set",
  "15min_2set": "15 dk / 2 Set",
  "30min_2set": "30 dk / 2 Set",
};

export function profileGoalLabelTr(goal: Goal | null | undefined): string {
  if (!goal) return "-";
  return PROFILE_GOAL_LABELS_TR[goal] ?? "-";
}

/** Home stat row when `goal` is missing — matches previous fallback (non-lose_weight branch). */
export function homeGoalStatLabelTr(goal: Goal | null | undefined): string {
  if (goal === "lose_weight") return HOME_GOAL_STAT_LABELS_TR.lose_weight;
  return HOME_GOAL_STAT_LABELS_TR.stay_fit;
}

export function levelPlanLabelTr(level: Level | null | undefined): string {
  if (!level) return "-";
  return LEVEL_PLAN_LABELS_TR[level] ?? "-";
}
