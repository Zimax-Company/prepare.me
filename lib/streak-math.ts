// Pure date + streak maths (no database), shared by lib/streaks.ts and unit-testable on its own.

// ---- Dates (YYYY-MM-DD strings, calendar arithmetic in UTC) ----------------------------------

export function validTimezone(tz: unknown): string | null {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return null
  try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return tz } catch { return null }
}

const fmtCache = new Map<string, Intl.DateTimeFormat>()
/** The calendar date of `date` in time zone `tz`. */
export function localDay(tz: string, date: Date = new Date()) {
  let f = fmtCache.get(tz)
  if (!f) { f = new Intl.DateTimeFormat('en-CA', { timeZone: validTimezone(tz) ?? 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }); fmtCache.set(tz, f) }
  return f.format(date)
}
const toUTC = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))
export const addDays = (d: string, n: number) => new Date(toUTC(d) + n * 86_400_000).toISOString().slice(0, 10)
/** Monday of the week containing d (weeks run Monday–Sunday). */
export const weekOf = (d: string) => addDays(d, -((new Date(toUTC(d)).getUTCDay() + 6) % 7))

// ---- Streak maths ------------------------------------------------------------------------

export type DayStatus = 'met' | 'frozen' | 'missed' | 'today' | 'future' | 'before'

/**
 * Current and longest streak. One missed day per calendar week is covered by a "freeze",
 * provided the day before it was met (a freeze never bridges two missed days in a row).
 * Today never breaks a streak: until it's met, the streak is still alive.
 */
export function computeStreak(met: Set<string>, today: string, firstDay: string) {
  const isMet = (d: string) => met.has(d)
  const frozen = new Set<string>()
  const usedWeeks = new Set<string>()
  let current = 0
  if (isMet(today)) current++
  for (let d = addDays(today, -1); d >= firstDay; d = addDays(d, -1)) {
    if (isMet(d)) { current++; continue }
    const w = weekOf(d)
    // Freeze a single missed day if the chain after it is alive (or it's yesterday and today is still open).
    if (!usedWeeks.has(w) && isMet(addDays(d, -1)) && (current > 0 || d === addDays(today, -1))) {
      usedWeeks.add(w)
      frozen.add(d)
      continue
    }
    break
  }
  // Longest: a forward pass with the same rules.
  let longest = 0
  let run = 0
  const usedL = new Set<string>()
  const start = [...met].sort()[0]
  if (start) {
    for (let d = start; d <= today; d = addDays(d, 1)) {
      if (isMet(d)) { run++; longest = Math.max(longest, run); continue }
      if (d === today) break
      const w = weekOf(d)
      if (run > 0 && !usedL.has(w) && (isMet(addDays(d, 1)) || addDays(d, 1) === today)) { usedL.add(w); continue }
      run = 0
    }
  }
  longest = Math.max(longest, current)
  return {
    current,
    longest,
    todayMet: isMet(today),
    frozen,
    freezeAvailable: !usedWeeks.has(weekOf(today)),
  }
}

