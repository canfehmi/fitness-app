import { describe, expect, it } from "vitest";
import {
  computeGoalProgress,
  toGoalProgressCardValues,
} from "./goalProgress";

describe("computeGoalProgress", () => {
  it("computes weight-loss progress from logs", () => {
    const r = computeGoalProgress({
      goal: "lose_weight",
      currentWeightKg: 78,
      targetWeightKg: 70,
      weightLogs: [
        { weight_kg: 82, logged_at: "2025-01-10T08:00:00.000Z" },
        { weight_kg: 79, logged_at: "2025-01-20T08:00:00.000Z" },
        { weight_kg: 78, logged_at: "2025-01-29T08:00:00.000Z" },
      ],
    });

    expect(r.startingWeightKg).toBe(82);
    expect(r.latestLoggedWeightKg).toBe(78);
    expect(r.targetWeightKg).toBe(70);
    expect(r.totalWeightChangeNeededKg).toBe(12);
    expect(r.achievedProgressKg).toBe(4);
    expect(r.remainingProgressKg).toBe(8);
    expect(r.goalCompletionPercent).toBe(33);
  });

  it("falls back to profile current weight when no logs", () => {
    const r = computeGoalProgress({
      goal: "lose_weight",
      currentWeightKg: 80,
      targetWeightKg: 74,
      weightLogs: [],
    });
    expect(r.startingWeightKg).toBe(80);
    expect(r.latestLoggedWeightKg).toBe(80);
    expect(r.totalWeightChangeNeededKg).toBe(6);
    expect(r.achievedProgressKg).toBe(0);
    expect(r.remainingProgressKg).toBe(6);
    expect(r.goalCompletionPercent).toBe(0);
  });

  it("never returns negative remaining when user gained weight", () => {
    const r = computeGoalProgress({
      goal: "lose_weight",
      currentWeightKg: 82,
      targetWeightKg: 75,
      weightLogs: [
        { weight_kg: 80, logged_at: "2025-02-01T08:00:00.000Z" },
        { weight_kg: 82, logged_at: "2025-02-10T08:00:00.000Z" },
      ],
    });
    expect(r.achievedProgressKg).toBe(0);
    expect(r.remainingProgressKg).toBe(5);
    expect(r.goalCompletionPercent).toBe(0);
  });

  it("returns stable values for maintenance goal", () => {
    const r = computeGoalProgress({
      goal: "stay_fit",
      currentWeightKg: 74,
      targetWeightKg: 74,
      weightLogs: [{ weight_kg: 74.2, logged_at: "2025-02-01T08:00:00.000Z" }],
    });
    expect(r.totalWeightChangeNeededKg).toBe(0);
    expect(r.achievedProgressKg).toBe(0);
    expect(r.remainingProgressKg).toBe(0);
    expect(r.goalCompletionPercent).toBe(100);
  });
});

describe("toGoalProgressCardValues", () => {
  it("creates UI-friendly labels", () => {
    const labels = toGoalProgressCardValues({
      startingWeightKg: 82,
      latestLoggedWeightKg: 78.5,
      targetWeightKg: 70,
      totalWeightChangeNeededKg: 12,
      achievedProgressKg: 3.5,
      remainingProgressKg: 8.5,
      goalCompletionPercent: 29,
    });

    expect(labels.startingWeightLabel).toBe("82 kg");
    expect(labels.latestWeightLabel).toBe("78.5 kg");
    expect(labels.targetWeightLabel).toBe("70 kg");
    expect(labels.achievedLabel).toBe("3.5 kg");
    expect(labels.remainingLabel).toBe("8.5 kg");
    expect(labels.completionLabel).toBe("%29");
  });
});
