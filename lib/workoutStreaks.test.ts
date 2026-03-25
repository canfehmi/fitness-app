import { describe, expect, it } from "vitest";
import {
  analyzeWorkoutStreaks,
  calendarDaysBetweenLocalDates,
  completionLocalDateKey,
  computeCurrentStreakDays,
} from "./workoutStreaks";

describe("analyzeWorkoutStreaks", () => {
  const noon = (isoDate: string) => `${isoDate}T12:00:00.000Z`;

  it("counts consecutive local days from latest completion (no off-by-one)", () => {
    const now = new Date(noon("2025-03-22"));
    const r = analyzeWorkoutStreaks(
      [
        { completed_at: noon("2025-03-20") },
        { completed_at: noon("2025-03-21") },
      ],
      now,
    );
    expect(r.currentStreakDays).toBe(2);
    expect(r.workedOutToday).toBe(false);
    expect(r.workedOutYesterday).toBe(true);
    expect(r.streakBroken).toBe(false);
    expect(r.calendarDaysSinceLastCompletion).toBe(1);
  });

  it("marks streak broken when last workout was before yesterday", () => {
    const now = new Date(noon("2025-03-22"));
    const r = analyzeWorkoutStreaks([{ completed_at: noon("2025-03-19") }], now);
    expect(r.streakBroken).toBe(true);
    expect(r.currentStreakDays).toBe(1);
    expect(r.calendarDaysSinceLastCompletion).toBe(3);
  });

  it("workedOutToday uses local calendar bucket", () => {
    const now = new Date("2025-03-22T20:00:00.000Z");
    const r = analyzeWorkoutStreaks(
      [{ completed_at: "2025-03-22T08:00:00.000Z" }],
      now,
    );
    expect(r.workedOutToday).toBe(true);
    expect(r.streakBroken).toBe(false);
  });

  it("counts multiple sessions same day as one streak day", () => {
    const now = new Date(noon("2025-03-22"));
    const r = analyzeWorkoutStreaks(
      [
        { completed_at: noon("2025-03-22") },
        { completed_at: "2025-03-22T18:00:00.000Z" },
      ],
      now,
    );
    expect(r.workoutsCompletedThisWeek).toBe(2);
    expect(r.currentStreakDays).toBe(1);
    expect(r.workedOutToday).toBe(true);
  });
});

describe("computeCurrentStreakDays", () => {
  it("dedupes same day", () => {
    const n = computeCurrentStreakDays([
      { completed_at: "2025-03-22T08:00:00.000Z" },
      { completed_at: "2025-03-22T20:00:00.000Z" },
    ]);
    expect(n).toBe(1);
  });
});

describe("calendarDaysBetweenLocalDates", () => {
  it("returns whole days in local calendar", () => {
    const a = new Date(2025, 2, 20);
    const b = new Date(2025, 2, 22);
    expect(calendarDaysBetweenLocalDates(a, b)).toBe(2);
  });
});
