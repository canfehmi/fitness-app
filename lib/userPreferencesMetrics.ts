/**
 * PostgREST often serializes Postgres `numeric` as JSON strings.
 * AsyncStorage drafts may also contain string numbers. Normalize at boundaries.
 */
export function parseMetric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const t = value.trim().replace(",", ".");
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parsePreferredMinutes(value: unknown): number | null {
  const n = parseMetric(value);
  if (n === null) return null;
  const r = Math.round(n);
  return Number.isFinite(r) ? r : null;
}

/** Full `user_preferences` row from Supabase (or merged draft) — keep extra keys. */
export function normalizePreferencesMetrics(
  row: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (row == null) return null;
  return {
    ...row,
    current_weight: parseMetric(row.current_weight),
    target_weight: parseMetric(row.target_weight),
    height_cm: parseMetric(row.height_cm),
    preferred_minutes:
      row.preferred_minutes === null || row.preferred_minutes === undefined
        ? row.preferred_minutes
        : parsePreferredMinutes(row.preferred_minutes),
  };
}

export function metricsForUpsert(p: {
  current_weight: unknown;
  target_weight: unknown;
  height_cm: unknown;
}) {
  return {
    current_weight: parseMetric(p.current_weight),
    target_weight: parseMetric(p.target_weight),
    height_cm: parseMetric(p.height_cm),
  };
}

/** Numeric string for UI (no unit) — same rounding as `formatKgDisplay`. */
export function formatKgValueOnly(value: unknown): string {
  const n = parseMetric(value);
  if (n === null) return "-";
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1)));
}

export function formatKgDisplay(value: unknown): string {
  const s = formatKgValueOnly(value);
  if (s === "-") return "-";
  return `${s} kg`;
}

export function formatHeightCmDisplay(value: unknown): string {
  const n = parseMetric(value);
  if (n === null) return "-";
  const s = Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1)));
  return `${s} cm`;
}
