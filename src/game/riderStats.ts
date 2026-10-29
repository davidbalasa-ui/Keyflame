// What the Progress tab and the Family view show, worked out from what each rider's
// save already holds. Nothing here is sent anywhere.

import { LESSONS, UNITS, lessonsInUnit, type UnitId } from '../content/lessons';
import type { Profile } from '../save/store';
import { currentStreak } from './streak';

export interface SpeedPoint {
  at: number;
  wpm: number;
  accuracy: number;
  kind: 'race' | 'lesson';
}

/** Recent races and timed lessons, oldest first. */
export function recentSessions(p: Profile, n = 20): SpeedPoint[] {
  const races: SpeedPoint[] = p.races.map((r) => ({ at: r.at, wpm: r.wpm, accuracy: r.accuracy, kind: 'race' }));
  const lessons: SpeedPoint[] = (p.lessonLog ?? []).filter((l) => l.wpm !== null).map((l) => ({ at: l.at, wpm: l.wpm!, accuracy: l.accuracy, kind: 'lesson' }));
  return [...races, ...lessons].sort((a, b) => b.at - a.at).slice(0, n).reverse();
}

/** Average accuracy over the last few races and lessons (relaxed ones count too), or null. */
export function recentAccuracy(p: Profile, n = 10): number | null {
  const all = [...p.races.map((r) => ({ at: r.at, a: r.accuracy })), ...(p.lessonLog ?? []).map((l) => ({ at: l.at, a: l.accuracy }))].sort((x, y) => y.at - x.at).slice(0, n);
  return all.length ? all.reduce((s, x) => s + x.a, 0) / all.length : null;
}

export interface UnitProgress {
  id: UnitId;
  title: string;
  passed: number;
  total: number;
  stars: number;
}

export function unitProgress(p: Profile): UnitProgress[] {
  return UNITS.map((u) => {
    const list = lessonsInUnit(u.id);
    return {
      id: u.id,
      title: u.title,
      passed: list.filter((l) => (p.lessons[l.id]?.stars ?? 0) > 0).length,
      total: list.length,
      stars: list.reduce((s, l) => s + (p.lessons[l.id]?.stars ?? 0), 0),
    };
  });
}

export function lessonsPassed(p: Profile): { passed: number; total: number } {
  return { passed: LESSONS.filter((l) => (p.lessons[l.id]?.stars ?? 0) > 0).length, total: LESSONS.length };
}

/** When this rider last finished a race or lesson, or null if never. */
export function lastPlayed(p: Profile): number | null {
  const t = Math.max(p.races[0]?.at ?? 0, p.lessonLog?.[0]?.at ?? 0);
  return t || null;
}

/** "Today", "Yesterday", "3 days ago" or "Not yet". */
export function lastPlayedText(at: number | null, now = Date.now()): string {
  if (!at) return 'Not yet';
  const day = (t: number): number => {
    const d = new Date(t);
    return Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5);
  };
  const days = day(now) - day(at);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
}

export interface Bests {
  keyboardWpm: number;
  touchWpm: number;
  bestAccuracy: number | null;
  streak: number;
  bestStreak: number;
  wins: number;
}

export function personalBests(p: Profile): Bests {
  const accs = [...p.races.map((r) => r.accuracy), ...Object.values(p.lessons).map((l) => l.bestAccuracy)];
  return {
    keyboardWpm: Math.round(p.totals.bestWpm),
    touchWpm: Math.round(p.totals.bestTouchWpm),
    bestAccuracy: accs.length ? Math.max(...accs) : null,
    streak: currentStreak(p),
    bestStreak: p.streak?.best ?? 0,
    wins: p.totals.wins,
  };
}
