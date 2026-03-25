import { describe, expect, it } from "vitest";
import {
  formatHeightCmDisplay,
  formatKgDisplay,
  formatKgValueOnly,
  metricsForUpsert,
  normalizePreferencesMetrics,
  parseMetric,
  parsePreferredMinutes,
} from "./userPreferencesMetrics";

describe("parseMetric", () => {
  it("parses Postgres-style string numerics", () => {
    expect(parseMetric("73")).toBe(73);
    expect(parseMetric("73.4")).toBe(73.4);
    expect(parseMetric("175")).toBe(175);
  });

  it("accepts comma decimals", () => {
    expect(parseMetric("73,5")).toBe(73.5);
  });

  it("passes through finite numbers", () => {
    expect(parseMetric(73)).toBe(73);
  });

  it("returns null for empty or invalid", () => {
    expect(parseMetric(null)).toBeNull();
    expect(parseMetric(undefined)).toBeNull();
    expect(parseMetric("")).toBeNull();
    expect(parseMetric("  ")).toBeNull();
    expect(parseMetric(Number.NaN)).toBeNull();
    expect(parseMetric(Infinity)).toBeNull();
  });
});

describe("normalizePreferencesMetrics", () => {
  it("coerces string metrics to numbers on a Supabase-shaped row", () => {
    const row = {
      id: "x",
      user_id: "u",
      current_weight: "73",
      target_weight: "65",
      height_cm: "175",
      goal: "lose_weight",
      preferred_minutes: "30",
    };
    const n = normalizePreferencesMetrics(row)!;
    expect(n.current_weight).toBe(73);
    expect(n.target_weight).toBe(65);
    expect(n.height_cm).toBe(175);
    expect(n.preferred_minutes).toBe(30);
    expect(n.goal).toBe("lose_weight");
  });
});

describe("metricsForUpsert", () => {
  it("normalizes mixed types before DB write", () => {
    expect(
      metricsForUpsert({
        current_weight: "70",
        target_weight: 65,
        height_cm: "180",
      }),
    ).toEqual({
      current_weight: 70,
      target_weight: 65,
      height_cm: 180,
    });
  });
});

describe("formatKgValueOnly", () => {
  it("matches kg display without unit", () => {
    expect(formatKgValueOnly("73.4")).toBe("73.4");
    expect(formatKgDisplay("73.4")).toBe("73.4 kg");
  });
});

describe("formatKgDisplay / formatHeightCmDisplay", () => {
  it("formats string or number metrics for UI", () => {
    expect(formatKgDisplay("73")).toBe("73 kg");
    expect(formatHeightCmDisplay("179")).toBe("179 cm");
  });

  it("shows dash when missing", () => {
    expect(formatKgDisplay(null)).toBe("-");
    expect(formatHeightCmDisplay(undefined)).toBe("-");
  });
});

describe("parsePreferredMinutes", () => {
  it("rounds to integer minutes", () => {
    expect(parsePreferredMinutes("29.6")).toBe(30);
    expect(parsePreferredMinutes(15)).toBe(15);
  });
});
