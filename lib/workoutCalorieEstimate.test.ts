import { describe, expect, it } from "vitest";
import {
  DEFAULT_REFERENCE_WEIGHT_KG,
  estimatePlannedWorkoutCalorieRange,
  formatPlannedWorkoutCalorieRangeTr,
} from "./workoutCalorieEstimate";

describe("estimatePlannedWorkoutCalorieRange", () => {
  it("returns a range with min <= max and midpoint between them (70 kg)", () => {
    const r = estimatePlannedWorkoutCalorieRange({
      planLevel: "15min_1set",
      userWeightKg: 70,
    });
    expect(r.min).toBeLessThanOrEqual(r.max);
    expect(r.min).toBeGreaterThanOrEqual(60);
    expect(r.max).toBeLessThanOrEqual(600);
    expect(r.midpoint).toBeGreaterThanOrEqual(r.min);
    expect(r.midpoint).toBeLessThanOrEqual(r.max);
  });

  it("uses default weight when user weight is missing", () => {
    const withW = estimatePlannedWorkoutCalorieRange({
      planLevel: "30min_1set",
      userWeightKg: DEFAULT_REFERENCE_WEIGHT_KG,
    });
    const without = estimatePlannedWorkoutCalorieRange({
      planLevel: "30min_1set",
      userWeightKg: null,
    });
    expect(withW.midpoint).toBe(without.midpoint);
  });

  it("scales up slightly for heavier users", () => {
    const light = estimatePlannedWorkoutCalorieRange({
      planLevel: "15min_2set",
      userWeightKg: 60,
    });
    const heavy = estimatePlannedWorkoutCalorieRange({
      planLevel: "15min_2set",
      userWeightKg: 90,
    });
    expect(heavy.midpoint).toBeGreaterThan(light.midpoint);
  });

  it("2-set tier is not lower than 1-set at same duration (30 min)", () => {
    const one = estimatePlannedWorkoutCalorieRange({
      planLevel: "30min_1set",
      userWeightKg: 70,
    });
    const two = estimatePlannedWorkoutCalorieRange({
      planLevel: "30min_2set",
      userWeightKg: 70,
    });
    expect(two.midpoint).toBeGreaterThanOrEqual(one.midpoint);
  });
});

describe("formatPlannedWorkoutCalorieRangeTr", () => {
  it("formats Turkish sentence", () => {
    expect(
      formatPlannedWorkoutCalorieRangeTr({ min: 120, max: 170, midpoint: 145 }),
    ).toBe("Bugün yaklaşık 120–170 kcal yakabilirsin");
  });
});
