/**
 * Workout streak analysis for `workout_sessions` rows from Supabase.
 *
 * STORAGE MODEL (this app):
 * - Rows are inserted from `app/workout/session.tsx` when the timer finishes.
 * - A “completed” session always has `completed_at` set to an ISO-8601 timestamp.
 * - Queries for streaks should use `.not("completed_at", "is", null)` (see Progress / useWorkout).
 * - We only trust `completed_at` for streak math (not `started_at`), so late-night
 *   completions still bucket to the correct **local calendar day**.
 *
 * TIMEZONE / OFF-BY-ONE:
 * - All streak logic uses the device’s **local** calendar (same as `Date` in RN).
 * - We normalize each `completed_at` to a local `YYYY-MM-DD` string before comparing.
 *   This avoids UTC-vs-local “yesterday” bugs (e.g. 23:30 local stored as next UTC day).
 * - “Today” is the local date of the injected `now` parameter (tests should pass a fixed `now`).
 *
 * STREAK DEFINITION:
 * - **Current streak (days)** = length of the longest suffix of consecutive local calendar days
 *   ending at the **most recent** day that has at least one completed workout.
 *   Multiple sessions on the same day still count as **one** streak day.
 *
 * STREAK “BROKEN” (product default here):
 * - `streakBroken === true` when there has **never** been a completion, OR the **local date**
 *   of the latest completion is **strictly before “yesterday”** relative to `now`.
 *   Equivalently: gap in local calendar days between “last workout day” and “today” is **≥ 2**.
 *   So: worked out **yesterday** but not yet today → **not** broken. Worked out **3 days ago** → broken.
 *
 * EDGE CASES:
 * - User changes timezone while traveling: historical ISO strings reinterpret in new TZ —
 *   dates may shift slightly; acceptable for a consumer app.
 * - DST: local midnight math uses JS `Date`; streak uses **date keys**, not raw ms deltas
 *   between events, so “consecutive days” stay consistent.
 */

import type { WorkoutSessionRow } from "@/types/fitness";

const MS_PER_DAY = 86_400_000;

/** Minimal shape for streak math; matches `workout_sessions` completion fields. */
export type WorkoutCompletionLike = Pick<WorkoutSessionRow, "completed_at">;

export type WorkoutStreakAnalysis = {
  /** Consecutive local days with ≥1 completion, ending at the latest workout day. */
  currentStreakDays: number;
  /** At least one completed session on today’s local date (relative to `now`). */
  workedOutToday: boolean;
  /** At least one completed session on yesterday’s local date. */
  workedOutYesterday: boolean;
  /**
   * `true` if there is no history, or the last workout local date is **before yesterday**
   * (gap of ≥2 calendar days from last workout to today). See module comment.
   */
  streakBroken: boolean;
  /** Completed sessions with `completed_at` in [Mon 00:00, next Mon 00:00) local, ISO week. */
  workoutsCompletedThisWeek: number;
  /** Latest completion local date key (`YYYY-MM-DD`), or `null` if none. */
  lastCompletionLocalDateKey: string | null;
  /**
   * Whole calendar days between last completion’s local date and today’s local date.
   * `0` = last workout was today; `1` = yesterday; `2+` implies streakBroken for this app.
   */
  calendarDaysSinceLastCompletion: number | null;
};

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Local calendar key — single source for bucketing completions. */
export function completionLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoToLocalDate(iso: string): Date {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t) : new Date();
}

function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Whole days between two local calendar dates (non-negative; `a` ≤ `b`). */
export function calendarDaysBetweenLocalDates(a: Date, b: Date): number {
  const start = startOfLocalDay(a).getTime();
  const end = startOfLocalDay(b).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

function startOfIsoWeekLocal(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function endOfIsoWeekLocal(d: Date): Date {
  const start = startOfIsoWeekLocal(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return end;
}

/** Unique local dates that have at least one completion. */
function collectCompletionLocalDateKeys(sessions: WorkoutCompletionLike[]): Set<string> {
  const days = new Set<string>();
  for (const s of sessions) {
    if (s.completed_at == null) continue;
    const d = parseIsoToLocalDate(s.completed_at);
    if (!Number.isFinite(d.getTime())) continue;
    days.add(completionLocalDateKey(d));
  }
  return days;
}

/**
 * Longest run of consecutive local days ending at `newestKey` (must exist in `days`).
 */
export function computeCurrentStreakDaysFromDateKeys(days: Set<string>): number {
  if (days.size === 0) return 0;
  const sorted = [...days].sort();
  const newest = sorted[sorted.length - 1]!;
  let cursor = parseLocalDateKey(newest);
  let streak = 0;
  for (;;) {
    const key = completionLocalDateKey(cursor);
    if (!days.has(key)) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }
  return streak;
}

export function computeCurrentStreakDays(sessions: WorkoutCompletionLike[]): number {
  return computeCurrentStreakDaysFromDateKeys(collectCompletionLocalDateKeys(sessions));
}

export function computeWorkedOutToday(sessions: WorkoutCompletionLike[], now: Date): boolean {
  const todayKey = completionLocalDateKey(startOfLocalDay(now));
  for (const s of sessions) {
    if (s.completed_at == null) continue;
    const k = completionLocalDateKey(parseIsoToLocalDate(s.completed_at));
    if (k === todayKey) return true;
  }
  return false;
}

export function computeWorkedOutYesterday(sessions: WorkoutCompletionLike[], now: Date): boolean {
  const y = new Date(startOfLocalDay(now));
  y.setDate(y.getDate() - 1);
  const yesterdayKey = completionLocalDateKey(y);
  for (const s of sessions) {
    if (s.completed_at == null) continue;
    const k = completionLocalDateKey(parseIsoToLocalDate(s.completed_at));
    if (k === yesterdayKey) return true;
  }
  return false;
}

export function computeWorkoutsCompletedThisWeek(
  sessions: WorkoutCompletionLike[],
  now: Date,
): number {
  const start = startOfIsoWeekLocal(now);
  const end = endOfIsoWeekLocal(now);
  let n = 0;
  for (const s of sessions) {
    if (s.completed_at == null) continue;
    const t = parseIsoToLocalDate(s.completed_at).getTime();
    if (t >= start.getTime() && t < end.getTime()) n += 1;
  }
  return n;
}

function latestCompletionLocalDateKey(sessions: WorkoutCompletionLike[]): string | null {
  let bestKey: string | null = null;
  let bestT = -Infinity;
  for (const s of sessions) {
    if (s.completed_at == null) continue;
    const d = parseIsoToLocalDate(s.completed_at);
    const t = d.getTime();
    if (!Number.isFinite(t)) continue;
    if (t > bestT) {
      bestT = t;
      bestKey = completionLocalDateKey(d);
    }
  }
  return bestKey;
}

/**
 * Full streak snapshot for home / progress / profile.
 * Pass the same `sessions` array you get from Supabase (completed rows only recommended).
 */
export function analyzeWorkoutStreaks(
  sessions: WorkoutCompletionLike[],
  now: Date = new Date(),
): WorkoutStreakAnalysis {
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  const currentStreakDays = computeCurrentStreakDays(safeSessions);
  const workedOutToday = computeWorkedOutToday(safeSessions, now);
  const workedOutYesterday = computeWorkedOutYesterday(safeSessions, now);
  const workoutsCompletedThisWeek = computeWorkoutsCompletedThisWeek(safeSessions, now);

  const lastKey = latestCompletionLocalDateKey(safeSessions);
  const todayStart = startOfLocalDay(now);

  let calendarDaysSinceLastCompletion: number | null = null;
  if (lastKey != null) {
    const lastDate = parseLocalDateKey(lastKey);
    calendarDaysSinceLastCompletion = calendarDaysBetweenLocalDates(lastDate, todayStart);
  }

  /**
   * Broken: no history, or last local workout day is **before yesterday**
   * (i.e. gap from last workout **date** to today’s date is ≥ 2).
   */
  const streakBroken =
    lastKey == null ||
    (calendarDaysSinceLastCompletion != null && calendarDaysSinceLastCompletion >= 2);

  return {
    currentStreakDays,
    workedOutToday,
    workedOutYesterday,
    streakBroken,
    workoutsCompletedThisWeek,
    lastCompletionLocalDateKey: lastKey,
    calendarDaysSinceLastCompletion,
  };
}
