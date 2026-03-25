import { describe, expect, it } from "vitest";
import {
  computeGoalCompletionPercent,
  computeRemainingWeightToGoalKg,
  computeTodayCalorieBurnRange,
  computeWorkedOutToday,
  computeWorkoutStreakDays,
  computeWorkoutsCompletedThisWeek,
  deriveCoachInsights,
} from "./coachInsights";

describe("computeRemainingWeightToGoalKg", () => {
  it("returns kg left to lose for lose_weight", () => {
    expect(computeRemainingWeightToGoalKg("lose_weight", 80, 75)).toBe(5);
    expect(computeRemainingWeightToGoalKg("lose_weight", 75, 75)).toBe(0);
  });

  it("returns null for stay_fit or missing numbers", () => {
    expect(computeRemainingWeightToGoalKg("stay_fit", 80, 75)).toBeNull();
    expect(computeRemainingWeightToGoalKg("lose_weight", null, 75)).toBeNull();
  });
});

describe("computeGoalCompletionPercent", () => {
  it("computes percent from earliest log to target", () => {
    const pct = computeGoalCompletionPercent({
      goal: "lose_weight",
      currentKg: 75,
      targetKg: 70,
      weightLogs: [
        { weight_kg: 80, logged_at: "2025-01-01T10:00:00.000Z" },
        { weight_kg: 77, logged_at: "2025-01-08T10:00:00.000Z" },
      ],
    });
    expect(pct).toBe(50);
  });
});

describe("streak and week", () => {
  it("counts consecutive days ending at most recent workout day", () => {
    const streak = computeWorkoutStreakDays([
      { completed_at: "2025-03-20T08:30:00.000Z" },
      { completed_at: "2025-03-21T08:30:00.000Z" },
    ]);
    expect(streak).toBe(2);
  });

  it("detects workout today", () => {
    const now = new Date("2025-03-22T12:00:00.000Z");
    const ok = computeWorkedOutToday(
      [{ completed_at: "2025-03-22T08:30:00.000Z" }],
      now,
    );
    expect(ok).toBe(true);
  });
});

describe("deriveCoachInsights", () => {
  it("returns safe defaults for empty input", () => {
    const r = deriveCoachInsights({
      goal: null,
      level: null,
      currentWeightKg: null,
      targetWeightKg: null,
      heightCm: null,
      workoutSessions: [],
      weightLogs: [],
      now: new Date("2025-03-22T12:00:00.000Z"),
    });
    expect(r.currentStreakDays).toBe(0);
    expect(r.workoutsCompletedThisWeek).toBe(0);
    expect(r.workedOutToday).toBe(false);
    expect(r.suggestedNextAction).toBe("fill_body_metrics");
    expect(r.todayCalorieBurnRange).toBeNull();
  });

  it("estimates kcal range from todayWorkout", () => {
    const r = deriveCoachInsights({
      goal: "stay_fit",
      level: "15min_1set",
      currentWeightKg: 70,
      targetWeightKg: 70,
      heightCm: 175,
      workoutSessions: [],
      weightLogs: [],
      todayWorkout: {
        estimatedMinutes: 20,
        exercises: [
          { work_seconds: 30, rest_seconds: 15, rounds: 2 },
          { work_seconds: 30, rest_seconds: 15, rounds: 2 },
        ],
      },
      now: new Date("2025-03-22T12:00:00.000Z"),
    });
    expect(r.todayCalorieBurnRange).not.toBeNull();
    expect(r.todayCalorieBurnRange!.min).toBeLessThanOrEqual(
      r.todayCalorieBurnRange!.midpoint,
    );
    expect(r.todayCalorieBurnRange!.max).toBeGreaterThanOrEqual(
      r.todayCalorieBurnRange!.midpoint,
    );
  });
});

describe("computeTodayCalorieBurnRange", () => {
  it("returns null without exercises", () => {
    expect(
      computeTodayCalorieBurnRange({ estimatedMinutes: 20, exercises: [] }),
    ).toBeNull();
  });
});
