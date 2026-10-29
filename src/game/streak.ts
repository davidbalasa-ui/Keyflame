// Day streaks: days in a row with at least one race or lesson. Kind to kids: a missed
// day starts a new streak, it never takes anything away, and the best streak is kept.

import { today, type Profile } from '../save/store';

/** The day before a YYYY-MM-DD date, in the same format. */
export function dayBefore(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return today(new Date(y, m - 1, d - 1));
}

/** Called once on the first finished race or lesson of a day. */
export function bumpStreak(p: Profile, day = today()): void {
  const s = p.streak;
  if (s?.last === day) return;
  const days = s && s.last === dayBefore(day) ? s.days + 1 : 1;
  p.streak = { last: day, days, best: Math.max(s?.best ?? 0, days) };
}

/** The streak to show today: it still counts until the end of the day after the last play. */
export function currentStreak(p: Profile, day = today()): number {
  const s = p.streak;
  if (!s) return 0;
  return s.last === day || s.last === dayBefore(day) ? s.days : 0;
}

/** True when today already counts toward the streak. */
export function playedToday(p: Profile, day = today()): boolean {
  return p.streak?.last === day;
}
