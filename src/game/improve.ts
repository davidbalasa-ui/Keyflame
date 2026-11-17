// Small ember rewards for getting better, not just for playing a lot (KF-11).
// Two kinds: beating your usual speed, and mastering a key. Both are capped so
// playing longer never beats playing better, and nothing changes the egg economy much.

import type { SessionSummary } from '../engine/typing';
import type { Profile } from '../save/store';
import { today } from '../save/store';

export interface Improvement {
  kind: 'faster' | 'mastered';
  /** For 'mastered', the key. */
  key?: string;
  embers: number;
}

export const FASTER_EMBERS = 5;
export const MASTER_EMBERS = 10;
/** "Faster than usual" pays at most this many times a day. */
export const FASTER_PER_DAY = 2;
/** At most this many keys can be mastered in one run, so a big jump doesn't flood the screen. */
const MASTER_PER_RUN = 2;
/** A key counts as mastered after this many tries at 95% or better, reached in under 0.7 s. */
const MASTER_TRIES = 40;
const MASTER_ACC = 0.95;
const MASTER_MS = 700;

/** Typing the 26 letters and the four marks the lessons teach. */
const KEYS = 'abcdefghijklmnopqrstuvwxyz;,./'.split('');

/** True when this run was clearly faster than the rider's usual speed on the same input. */
export function fasterThanUsual(prevWpms: number[], wpm: number, accuracy: number): boolean {
  if (prevWpms.length < 3 || accuracy < 0.9) return false;
  const recent = prevWpms.slice(0, 5);
  const usual = recent.reduce((a, b) => a + b, 0) / recent.length;
  return wpm >= usual * 1.1 && wpm >= usual + 1;
}

/** Keys that just reached mastery and were not mastered before. */
export function newlyMastered(p: Profile): string[] {
  const done = new Set(p.keysMastered ?? []);
  return KEYS.filter((k) => {
    if (done.has(k)) return false;
    const s = p.keyStats[k];
    if (!s) return false;
    const tries = s.hits + s.misses;
    return tries >= MASTER_TRIES && s.hits / tries >= MASTER_ACC && s.hits > 0 && s.totalMs / s.hits <= MASTER_MS;
  });
}

/**
 * Pays improvement rewards after a race or lesson has been recorded. prevWpms are the
 * rider's earlier speeds on the same input, newest first, not counting this run.
 */
export function payImprovements(p: Profile, s: SessionSummary, prevWpms: number[] | null): Improvement[] {
  const out: Improvement[] = [];
  const day = today();
  if (p.improveDay?.date !== day) p.improveDay = { date: day, faster: 0 };
  if (prevWpms && p.improveDay.faster < FASTER_PER_DAY && fasterThanUsual(prevWpms, s.wpm, s.accuracy)) {
    p.improveDay.faster++;
    out.push({ kind: 'faster', embers: FASTER_EMBERS });
  }
  const keys = newlyMastered(p).slice(0, MASTER_PER_RUN);
  p.keysMastered = [...(p.keysMastered ?? []), ...keys];
  for (const key of keys) out.push({ kind: 'mastered', key, embers: MASTER_EMBERS });
  const total = out.reduce((a, i) => a + i.embers, 0);
  p.embers += total;
  p.totals.embersEarned += total;
  return out;
}
