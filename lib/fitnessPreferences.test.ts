import { describe, expect, it } from "vitest";
import {
  normalizeUserFitnessPreferences,
  parseGoal,
  parseLevel,
  parseWeightKgForLog,
} from "./fitnessPreferences";

describe("parseGoal / parseLevel", () => {
  it("accepts valid enums only", () => {
    expect(parseGoal("lose_weight")).toBe("lose_weight");
    expect(parseGoal("stay_fit")).toBe("stay_fit");
    expect(parseGoal("bogus")).toBeNull();
    expect(parseGoal(null)).toBeNull();
  });

  it("parses level union", () => {
    expect(parseLevel("30min_2set")).toBe("30min_2set");
    expect(parseLevel("invalid")).toBeNull();
  });
});

describe("normalizeUserFitnessPreferences", () => {
  it("coerces metrics and enums from a loose row", () => {
    const row = {
      goal: "lose_weight",
      level: "15min_1set",
      preferred_minutes: "30",
      current_weight: "73",
      target_weight: 65,
      height_cm: "175",
    };
    const n = normalizeUserFitnessPreferences(row)!;
    expect(n.goal).toBe("lose_weight");
    expect(n.level).toBe("15min_1set");
    expect(n.preferred_minutes).toBe(30);
    expect(n.current_weight).toBe(73);
    expect(n.target_weight).toBe(65);
    expect(n.height_cm).toBe(175);
  });

  it("nulls invalid goal/level", () => {
    const n = normalizeUserFitnessPreferences({
      goal: "nope",
      level: "x",
      preferred_minutes: null,
      current_weight: null,
      target_weight: null,
      height_cm: null,
    })!;
    expect(n.goal).toBeNull();
    expect(n.level).toBeNull();
  });
});

describe("parseWeightKgForLog", () => {
  it("rejects out-of-range values", () => {
    expect(parseWeightKgForLog("0")).toBeNull();
    expect(parseWeightKgForLog("600")).toBeNull();
    expect(parseWeightKgForLog("75.2")).toBe(75.2);
  });
});
