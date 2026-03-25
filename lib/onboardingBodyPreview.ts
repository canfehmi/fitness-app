import type { Goal } from "@/types/database";

export type WeeklyFatPreview =
  | { kind: "lose_range"; min: number; max: number }
  | { kind: "lose_generic" }
  | { kind: "stay_fit" }
  | { kind: "maintain" };

/**
 * Heuristic “preview” only — not medical advice. Keeps numbers in a plausible band.
 */
export function weeklyFatPreview(
  goal: Goal | null,
  currentKg: number | undefined,
  targetKg: number | undefined,
): WeeklyFatPreview {
  if (goal === "stay_fit") return { kind: "stay_fit" };
  if (goal !== "lose_weight") return { kind: "lose_generic" };

  const cw = currentKg;
  const tw = targetKg;
  if (
    cw === undefined ||
    tw === undefined ||
    !Number.isFinite(cw) ||
    !Number.isFinite(tw)
  ) {
    return { kind: "lose_generic" };
  }

  const diff = cw - tw;
  if (diff <= 0) return { kind: "maintain" };

  const min = Math.max(0.2, Math.min(0.35, 0.25 + diff * 0.015));
  const max = Math.min(0.9, Math.max(0.4, 0.45 + diff * 0.025));
  return {
    kind: "lose_range",
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
  };
}
