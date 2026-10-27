// Rules for turning typing into rewards: warmth, embers, dragon growth, and eggs.
// Pure functions on a Profile so they are easy to test.

import { LESSONS, UNITS, lessonsInUnit, type Lesson } from '../content/lessons';
import { mergeKeyStats, type SessionSummary } from '../engine/typing';
import { NAME_ENDS, NAME_STARTS, TRIBES, rollMarking, rollPalette, stageFor, type Stage, type TribeId } from './dragons';
import { today, type InputMode, type OwnedDragon, type Profile } from '../save/store';
import { courseById } from './courses';
import { noteSeasonLesson, noteSeasonRace, rollSeasonPalette, type ChallengeState } from './seasons';

export interface TypingRewards {
  embers: number;
  warmthAdded: number;
  eggReady: boolean;
  grewTo: Stage | null;
  newEgg: TribeId | null;
  /** True the first time this course's story rival is beaten. */
  rivalFirstWin?: boolean;
  newBest?: boolean;
  /** Season challenges finished by this session. */
  seasonDone?: ChallengeState[];
}

/** Touch typing is slower than ten-finger typing, so rivals ease off for touch players. */
export const TOUCH_SPEED_FACTOR = 0.7;

export function isTouch(input: InputMode | undefined): boolean {
  return input === 'touch' || input === 'device';
}

/** Puts an egg in the nest, or in the basket if the nest is busy. */
export function giveEgg(p: Profile, tribe: TribeId): void {
  if (p.nest) p.basket.push(tribe);
  else p.nest = { tribe, warmth: 0, seed: Math.floor(Math.random() * 1e9) };
}

export const MILESTONES: Array<{ id: string; tribe: TribeId; label: string; done: (p: Profile) => boolean }> = [
  { id: 'accuracy', tribe: 'frostspine', label: 'Finish 3 races with 95% accuracy', done: (p) => p.races.filter((r) => r.accuracy >= 0.95).length >= 3 },
  { id: 'speed', tribe: 'duneskimmer', label: 'Race at 25 WPM on a keyboard, or 18 WPM on touch', done: (p) => p.totals.bestWpm >= 25 || p.totals.bestTouchWpm >= 18 },
];

/** Awards any milestone eggs newly earned. */
export function checkMilestones(p: Profile): TribeId | null {
  let got: TribeId | null = null;
  for (const m of MILESTONES) {
    if (p.milestones.includes(m.id) || !m.done(p)) continue;
    p.milestones.push(m.id);
    giveEgg(p, m.tribe);
    got ??= m.tribe;
  }
  return got;
}

/** Counts a new play day the first time a race or lesson finishes that day. */
function countPlayDay(p: Profile): void {
  if (p.daily.races + p.daily.lessons === 0) p.totals.playDays++;
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

/** Practice that is neither a race nor a lesson, like the placement check. */
export function recordPractice(p: Profile, s: SessionSummary): Omit<TypingRewards, 'embers' | 'newEgg'> {
  return applySession(p, s);
}

/** Embers for a race: a floor for finishing, more for clean typing and placing well. */
export function raceEmbers(correct: number, accuracy: number, place: number): number {
  const placeBonus = [15, 10, 6, 4][place - 1] ?? 4;
  return Math.max(3, Math.round(correct / 12 * accuracy + placeBonus));
}

export interface RaceInfo {
  input: InputMode;
  courseId: string;
  beatRival: boolean;
}

export function recordRace(p: Profile, s: SessionSummary, place: number, info: RaceInfo = { input: 'keyboard', courseId: 'volcano', beatRival: false }): TypingRewards {
  const base = applySession(p, s);
  let embers = raceEmbers(s.correct, s.accuracy, place);
  p.totals.races++;
  countPlayDay(p);
  p.daily.races++;
  const touch = isTouch(info.input);
  const prevBest = touch ? p.totals.bestTouchWpm : p.totals.bestWpm;
  if (touch) p.totals.bestTouchWpm = Math.max(prevBest, s.wpm);
  else p.totals.bestWpm = Math.max(prevBest, s.wpm);
  p.races.unshift({ at: Date.now(), wpm: s.wpm, accuracy: s.accuracy, place, input: info.input, course: info.courseId });
  p.races = p.races.slice(0, 50);
  let rivalFirstWin = false;
  if (info.beatRival && !p.rivalsBeaten.includes(info.courseId)) {
    p.rivalsBeaten.push(info.courseId);
    rivalFirstWin = true;
    embers += 25;
  }
  if (place === 1) p.totals.wins++;
  if (s.accuracy >= 0.98) p.totals.cleanRaces++;
  if (s.accuracy >= 1) p.totals.perfectRaces++;
  p.embers += embers;
  p.totals.embersEarned += embers;
  const seasonDone = noteSeasonRace(p, s, place);
  const newEgg = checkMilestones(p);
  return { ...base, embers, newEgg, seasonDone, rivalFirstWin, newBest: prevBest > 0 && s.wpm > prevBest, eggReady: eggProgress(p) >= 1 };
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
  p.totals.embersEarned += embers;
  p.totals.lessons++;
  countPlayDay(p);
  p.daily.lessons++;
  const seasonDone = noteSeasonLesson(p, s);
  const newEgg = checkUnitReward(p, lesson.unit) ?? checkMilestones(p);
  return { ...base, embers, newEgg, seasonDone, eggReady: eggProgress(p) >= 1 };
}

/** Awards a unit's egg the first time every lesson in it is passed. */
export function checkUnitReward(p: Profile, unit: Lesson['unit']): TribeId | null {
  if (p.unitsRewarded.includes(unit)) return null;
  const done = lessonsInUnit(unit).every((l) => (p.lessons[l.id]?.stars ?? 0) > 0);
  if (!done) return null;
  const tribe = UNITS.find((u) => u.id === unit)!.reward;
  p.unitsRewarded.push(unit);
  giveEgg(p, tribe);
  return tribe;
}

export function randomDragonName(rand: () => number = Math.random): string {
  const s = NAME_STARTS[Math.floor(rand() * NAME_STARTS.length)];
  const e = NAME_ENDS[Math.floor(rand() * NAME_ENDS.length)];
  return s + e;
}

/** Hatches the egg in the nest and moves the next waiting egg in. */
export function hatchEgg(p: Profile, name: string, rand: () => number = Math.random, now: Date = new Date()): OwnedDragon | null {
  if (!p.nest || eggProgress(p) < 1) return null;
  const palette = rollPalette(p.nest.tribe, rand);
  const marking = rollMarking(rand);
  const dragon: OwnedDragon = {
    id: Math.random().toString(36).slice(2, 10),
    tribe: p.nest.tribe,
    palette: rollSeasonPalette(now, rand) ?? palette,
    marking,
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

/** Races switch from practice sentences to real facts once every letter is learned. */
export function factsUnlocked(p: Profile): boolean {
  const known = knownLetters(p);
  return [...'abcdefghijklmnopqrstuvwxyz'].every((c) => known.has(c));
}

/** Capital letters are taught in the Capital Letters lesson; before that, facts are typed in lowercase. */
export function capitalsKnown(p: Profile): boolean {
  const i = LESSONS.findIndex((l) => l.title === 'Capital Letters');
  return i >= 0 && (p.lessons[LESSONS[i].id]?.stars ?? 0) > 0;
}

/** Adds a typed fact to the Fact Book, moving it to the end if it was already there. */
export function recordFact(p: Profile, id: string): boolean {
  const isNew = !p.factsSeen.includes(id);
  p.factsSeen = [...p.factsSeen.filter((f) => f !== id), id];
  return isNew;
}

/** Rival speeds sit just around the player's recent form for this input, so races stay close. */
export function ghostSpeeds(p: Profile, input: InputMode = 'keyboard'): number[] {
  const touch = isTouch(input);
  const recent = p.races.filter((r) => isTouch(r.input) === touch).slice(0, 5).map((r) => r.wpm);
  const start = touch ? 8 : 12;
  const form = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : start;
  const f = Math.max(5, form);
  return [f * 0.8, f * 1.1];
}

/** The story rival flies at a fixed speed, eased off for touch players. */
export function rivalSpeed(courseId: string, input: InputMode): number {
  const w = courseById(courseId).rival.wpm;
  return isTouch(input) ? w * TOUCH_SPEED_FACTOR : w;
}

export function courseUnlocked(p: Profile, courseId: string): boolean {
  const unit = courseById(courseId).unlockUnit;
  return unit === null || p.unitsRewarded.includes(unit);
}

/** Placement check: skips lessons the player already knows. Returns how many units it opened. */
export function applyPlacement(p: Profile, wpm: number, accuracy: number): number {
  if (accuracy < 0.88) return 0;
  const units: Lesson['unit'][] = wpm >= 22 ? ['home', 'top', 'bottom'] : wpm >= 14 ? ['home', 'top'] : wpm >= 7 ? ['home'] : [];
  for (const u of units) {
    for (const l of lessonsInUnit(u)) {
      const prev = p.lessons[l.id];
      if (!prev || prev.stars === 0) p.lessons[l.id] = { stars: 1, bestWpm: prev?.bestWpm ?? 0, bestAccuracy: prev?.bestAccuracy ?? 0 };
    }
    checkUnitReward(p, u);
  }
  return units.length;
}

/** Where a ghost is, 0 to 1, after `ms` of racing. */
export function ghostProgress(wpm: number, ms: number, length: number): number {
  return Math.min(1, ((wpm * 5) / 60000) * ms / length);
}
