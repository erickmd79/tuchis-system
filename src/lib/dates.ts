// Shared date utilities — all displayed dates use America/Mexico_City.
//
// Supabase stores created_at as a UTC ISO timestamp (e.g. "2026-07-09T04:43:00Z").
// Naive split("T")[0] returns the UTC calendar day, which is wrong for users in
// Mexico who may be up to 6 hours behind UTC. These helpers always convert UTC
// timestamps to the local Mexico City date before any display or filtering.
//
// Pure date strings (YYYY-MM-DD, e.g. delivery dates typed by the user) have no
// time component and are treated as calendar days without timezone conversion.

const TZ = "America/Mexico_City"

/** Formats a Date object as "YYYY-MM-DD" in the Mexico City timezone. */
export const fechaMX = (d: Date): string => {
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00"
  return `${get("year")}-${get("month")}-${get("day")}`
}

/**
 * Converts any date string or ISO timestamp to "YYYY-MM-DD" in Mexico City.
 * Pure date strings (YYYY-MM-DD) are returned unchanged.
 * Used for date comparisons in dashboard filters.
 */
export const obtenerClaveFechaMX = (valor?: string): string => {
  if (!valor) return ""
  const s = String(valor).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s.slice(0, 10)
  return fechaMX(d)
}

/**
 * Formats a date value for display (e.g. "08 jul 2026") in the es-MX locale.
 *
 * - Pure date strings (YYYY-MM-DD, like delivery dates): parsed as a local
 *   calendar day — no timezone shift applied.
 * - ISO timestamps with time component (like Supabase created_at): parsed as
 *   UTC and converted to America/Mexico_City before extracting the display date.
 *
 * Returns `fallback` (default "—") when the value is absent or unparseable.
 */
export const formatearFechaMX = (valor?: string, fallback = "—"): string => {
  if (!valor) return fallback
  const s = String(valor).trim()

  // Pure date string — treat as calendar day, no UTC conversion.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number)
    if (!y || !m || !d) return fallback
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  // ISO timestamp — convert to Mexico City timezone.
  const date = new Date(s)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}
