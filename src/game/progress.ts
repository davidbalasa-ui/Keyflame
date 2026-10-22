// Rules for turning typing into rewards: warmth, embers, dragon growth, and eggs.
// Pure functions on a Profile so they are easy to test.

import { LESSONS, UNITS, lessonsInUnit, type Lesson } from '../content/lessons';
import { mergeKeyStats, type SessionSummary } from '../engine/typing';
import { NAME_ENDS, NAME_STARTS, TRIBES, rollPalette, stageFor, type Stage, type TribeId } from './dragons';
import { today, type OwnedDragon, type Profile } from '../save/store';

export interface TypingRewards {
  embers: number;
  warmthAdded: number;
  eggReady: boolean;
  grewTo: Stage | null;
  newEgg: TribeId | null;
}

function rollDaily(p: Profile): void {
  const d = today();
  if (p.daily.date !== d) p.daily = { date: d, races: 0, lessons: 0 };
}

export function activeDragon(p: Profile): OwnedDragon | null {
  return p.dragons.find((d) => d.id === p.activeDragonId) ?? p.dragons[0] ?? null;
}

export function eggProgress(p: Profile): number {
  if (!p.nest) return 0;
  return Math.min(1, p.nest.warmth / TRIBES[p.nest.tribe].hatchKeys);
}

/** Shared bookkeeping for any finished typing session. */
function applySession(p: Profile, s: SessionSummary): Omit<TypingRewards, 'embers' | 'newEgg'> {
  rollDaily(p);
  mergeKeyStats(p.keyStats, s.keyStats);
  p.totals.correctKeys += s.correct;
  p.totals.minutes += s.durationMs / 60000;

  let warmthAdded = 0;
  if (p.nest) {
    const need = TRIBES[p.nest.tribe].hatchKeys;
    warmthAdded = Math.min(s.correct, Math.max(0, need - p.nest.warmth));
    p.nest.warmth += warmthAdded;
  }

  let grewTo: Stage | null = null;
  const d = activeDragon(p);
  if (d) {
    const before = stageFor(d.xp);
    d.xp += s.correct;
    const after = stageFor(d.xp);
    if (after !== before) grewTo = after;
  }
  return { warmthAdded, eggReady: eggProgress(p) >= 1, grewTo };
}

/** Embers for a race: a floor for finishing, more for clean typing and placing well. */
export function raceEmbers(correct: number, accuracy: number, place: number): number {
  const placeBonus = [15, 10, 6, 4][place - 1] ?? 4;
  return Math.max(3, Math.round(correct / 12 * accuracy + placeBonus));
}

export function recordRace(p: Profile, s: SessionSummary, place: number): TypingRewards {
  const base = applySession(p, s);
  const embers = raceEmbers(s.correct, s.accuracy, place);
  p.embers += embers;
  p.totals.races++;
  p.daily.races++;
  p.totals.bestWpm = Math.max(p.totals.bestWpm, s.wpm);
  p.races.unshift({ at: Date.now(), wpm: s.wpm, accuracy: s.accuracy, place });
  p.races = p.races.slice(0, 50);
  return { ...base, embers, newEgg: null };
}

export function recordLesson(p: Profile, lesson: Lesson, s: SessionSummary, stars: number): TypingRewards {
  const base = applySession(p, s);
  const prev = p.lessons[lesson.id];
  p.lessons[lesson.id] = {
    stars: Math.max(prev?.stars ?? 0, stars),
    bestWpm: Math.max(prev?.bestWpm ?? 0, s.wpm),
    bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, s.accuracy),
  };
  const embers = stars > 0 ? 5 + stars * 5 : 2;
  p.embers += embers;
  p.totals.lessons++;
  p.daily.lessons++;
  const newEgg = checkUnitReward(p, lesson.unit);
  return { ...base, embers, newEgg, eggReady: eggProgress(p) >= 1 };
}

/** Awards a unit's egg the first time every lesson in it is passed. */
export function checkUnitReward(p: Profile, unit: Lesson['unit']): TribeId | null {
  if (p.unitsRewarded.includes(unit)) return null;
  const done = lessonsInUnit(unit).every((l) => (p.lessons[l.id]?.stars ?? 0) > 0);
  if (!done) return null;
  const tribe = UNITS.find((u) => u.id === unit)!.reward;
  p.unitsRewarded.push(unit);
  if (p.nest) p.basket.push(tribe);
  else p.nest = { tribe, warmth: 0, seed: Math.floor(Math.random() * 1e9) };
  return tribe;
}

export function randomDragonName(rand: () => number = Math.random): string {
  const s = NAME_STARTS[Math.floor(rand() * NAME_STARTS.length)];
  const e = NAME_ENDS[Math.floor(rand() * NAME_ENDS.length)];
  return s + e;
}

/** Hatches the egg in the nest and moves the next waiting egg in. */
export function hatchEgg(p: Profile, name: string, rand: () => number = Math.random): OwnedDragon | null {
  if (!p.nest || eggProgress(p) < 1) return null;
  const dragon: OwnedDragon = {
    id: Math.random().toString(36).slice(2, 10),
    tribe: p.nest.tribe,
    palette: rollPalette(p.nest.tribe, rand),
    name,
    xp: 0,
    hatchedAt: Date.now(),
  };
  p.dragons.push(dragon);
  if (!p.activeDragonId) p.activeDragonId = dragon.id;
  const next = p.basket.shift();
  p.nest = next ? { tribe: next, warmth: 0, seed: Math.floor(rand() * 1e9) } : null;
  return dragon;
}

export function lessonUnlocked(p: Profile, index: number): boolean {
  return index === 0 || (p.lessons[LESSONS[index - 1].id]?.stars ?? 0) > 0;
}

/** Letters the player has reached, never fewer than the home row, for race text. */
export function knownLetters(p: Profile): Set<string> {
  let reached = 0;
  LESSONS.forEach((_, i) => {
    if (lessonUnlocked(p, i)) reached = i;
  });
  const keys = new Set(LESSONS[reached].keys.filter((k) => /[a-z;,./]/.test(k)));
  'asdfghjkl'.split('').forEach((k) => keys.add(k));
  return keys;
}

/** Rival speeds sit just around the player's recent form, so races stay close. */
export function ghostSpeeds(p: Profile): number[] {
  const recent = p.races.slice(0, 5).map((r) => r.wpm);
  const form = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 12;
  const f = Math.max(6, form);
  return [f * 0.8, f * 0.97, f * 1.12];
}

/** Where a ghost is, 0 to 1, after `ms` of racing. */
export function ghostProgress(wpm: number, ms: number, length: number): number {
  return Math.min(1, ((wpm * 5) / 60000) * ms / length);
}
