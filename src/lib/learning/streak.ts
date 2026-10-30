/** Date helpers that work on "YYYY-MM-DD" strings in the learner's timezone. */

export function localDate(timezone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the ISO week containing `date`. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(date, -day);
}

/**
 * The streak to display today. The stored streak stays valid while the learner
 * was active today or yesterday; otherwise it is broken (0).
 */
export function effectiveStreak(storedStreak: number, lastActiveDate: string | null, today: string): number {
  if (!lastActiveDate) return 0;
  if (lastActiveDate >= addDays(today, -1)) return storedStreak;
  return 0;
}

/** Number of consecutive ISO weeks (ending this week or last week) with at least one active day. */
export function weeklyStreak(activeDates: string[], today: string): number {
  const weeks = new Set(activeDates.map(weekStart));
  let cursor = weekStart(today);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  let count = 0;
  while (weeks.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -7);
  }
  return count;
}

/** Pure reference implementation of the streak update used by record_activity (SQL). */
export function nextStreak(current: number, lastActiveDate: string | null, today: string): number {
  if (!lastActiveDate || lastActiveDate < addDays(today, -1)) return 1;
  if (lastActiveDate === addDays(today, -1)) return current + 1;
  return current; // same day (or clock moved backwards)
}
