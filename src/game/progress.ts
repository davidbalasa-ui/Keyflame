// Rules for turning typing into rewards: warmth, embers, dragon growth, and eggs.
// Pure functions on a Profile so they are easy to test.

import { LESSONS, UNITS, lessonsInUnit, type Lesson } from '../content/lessons';
import { mergeKeyStats, type SessionSummary } from '../engine/typing';
import { MARKINGS, NAME_ENDS, NAME_STARTS, TRIBES, rollMarking, rollPalette, stageFor, type Stage, type TribeId } from './dragons';
import { LESSON_LOG_MAX, isStarglint, today, type InputMode, type OwnedDragon, type Profile } from '../save/store';
import { courseById } from './courses';
import { bumpStreak } from './streak';
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
  bumpStreak(p);
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

export function recordLesson(p: Profile, lesson: Lesson, s: SessionSummary, stars: number, relaxed = false): TypingRewards {
  const base = applySession(p, s);
  p.lessonLog = [{ at: Date.now(), lesson: lesson.id, stars, wpm: relaxed ? null : s.wpm, accuracy: s.accuracy }, ...(p.lessonLog ?? [])].slice(0, LESSON_LOG_MAX);
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

/** A look can evolve this many times: one star per extra copy, so five copies max it out. */
export const MAX_STARS = 4;
export const STAR_NAMES = ['', 'Evolved', 'Radiant', 'Mythic', 'Elder'];
/** Growth a dragon gets each time it evolves. */
export const EVOLVE_XP = 1500;
/** Embers a hatch turns into if every look it could be is already at full stars. */
export const MAXED_EMBERS = 300;

/** What kind of dragon this is, for labels: its tribe, or the supporter dragon. */
export const kindName = (d: OwnedDragon): string => (isStarglint(d) ? 'supporter dragon' : TRIBES[d.tribe].name);

/** The supporter pack never makes anyone faster, so Starglint races with no perk. */
export const perkText = (d: OwnedDragon): string => (isStarglint(d) ? 'Special: type from memory' : TRIBES[d.tribe].perk);

/** Starglint's special is a challenge, not a boost: the keyboard stops showing where to press. */
export const hidesHints = (d: OwnedDragon | null): boolean => !!d && isStarglint(d) && d.noHints === true;
export const perkTribe = (d: OwnedDragon | null): TribeId | null => (d && !isStarglint(d) ? d.tribe : null);

const sameLook = (d: OwnedDragon, tribe: TribeId, palette: number, marking: number): boolean => !isStarglint(d) && d.tribe === tribe && d.palette === palette && (d.marking ?? 0) === marking;

/** The dragon that wears a look and collects its stars: the most evolved, then the most grown. */
export function lookHolder(p: Profile, tribe: TribeId, palette: number, marking: number): OwnedDragon | null {
  const mine = p.dragons.filter((d) => sameLook(d, tribe, palette, marking));
  return mine.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0) || b.xp - a.xp)[0] ?? null;
}

export function lookMaxed(p: Profile, tribe: TribeId, palette: number, marking: number): boolean {
  return (lookHolder(p, tribe, palette, marking)?.stars ?? 0) >= MAX_STARS;
}

/** True when every regular look of a tribe is at full stars, so its eggs are no longer offered. */
export function tribeMaxed(p: Profile, tribe: TribeId): boolean {
  return TRIBES[tribe].palettes.every((_, palette) => MARKINGS.every((_, m) => lookMaxed(p, tribe, palette, m)));
}

export interface HatchResult {
  /** The new dragon, or the one that evolved. Null when the hatch turned into embers. */
  dragon: OwnedDragon | null;
  evolved: boolean;
  /** Embers given instead of a dragon, when every possible look was already maxed. */
  embers: number;
}

/**
 * Hatches the egg in the nest and moves the next waiting egg in. A look the rider
 * already has evolves that dragon instead of adding a copy. A look at full stars is
 * never rolled, so no hatch is wasted.
 */
export function hatchNest(p: Profile, name: string, rand: () => number = Math.random, now: Date = new Date()): HatchResult | null {
  if (!p.nest || eggProgress(p) < 1) return null;
  const tribe = p.nest.tribe;
  let palette = rollPalette(tribe, rand);
  let marking = rollMarking(rand);
  palette = rollSeasonPalette(now, rand) ?? palette;
  for (let i = 0; i < 40 && lookMaxed(p, tribe, palette, marking); i++) {
    palette = rollSeasonPalette(now, rand) ?? rollPalette(tribe, rand);
    marking = rollMarking(rand);
  }
  let open = !lookMaxed(p, tribe, palette, marking);
  if (!open) {
    const left = TRIBES[tribe].palettes.flatMap((_, pi) => MARKINGS.map((_, m) => [pi, m] as const)).find(([pi, m]) => !lookMaxed(p, tribe, pi, m));
    if (left) [palette, marking, open] = [left[0], left[1], true];
  }
  const next = p.basket.shift();
  p.nest = next ? { tribe: next, warmth: 0, seed: Math.floor(rand() * 1e9) } : null;
  if (!open) {
    p.embers += MAXED_EMBERS;
    p.totals.embersEarned += MAXED_EMBERS;
    return { dragon: null, evolved: false, embers: MAXED_EMBERS };
  }
  const holder = lookHolder(p, tribe, palette, marking);
  if (holder) {
    holder.stars = (holder.stars ?? 0) + 1;
    holder.xp += EVOLVE_XP;
    return { dragon: holder, evolved: true, embers: 0 };
  }
  const dragon: OwnedDragon = { id: Math.random().toString(36).slice(2, 10), tribe, palette, marking, name, xp: 0, hatchedAt: Date.now() };
  p.dragons.push(dragon);
  if (!p.activeDragonId) p.activeDragonId = dragon.id;
  return { dragon, evolved: false, embers: 0 };
}

/**
 * Moves a waiting egg into the nest, and the nest egg back into its basket spot.
 * The nest keeps its warmth, so the new egg is just as close to hatching and no
 * typing is lost by switching.
 */
export function swapNestEgg(p: Profile, index: number, rand: () => number = Math.random): boolean {
  const next = p.basket[index];
  if (!p.nest || !next) return false;
  const share = eggProgress(p);
  p.basket[index] = p.nest.tribe;
  p.nest = { tribe: next, warmth: Math.ceil(share * TRIBES[next].hatchKeys), seed: Math.floor(rand() * 1e9) };
  return true;
}

/** Hatches and returns the dragon, new or evolved. */
export function hatchEgg(p: Profile, name: string, rand: () => number = Math.random, now: Date = new Date()): OwnedDragon | null {
  return hatchNest(p, name, rand, now)?.dragon ?? null;
}

/** Embers can warm the egg in the nest, so they always have a use. */
export const WARM_PRICE = 100;
/** Share of a whole egg that one ember warming adds. */
export const WARM_SHARE = 0.25;

export function canWarmWithEmbers(p: Profile): boolean {
  return !!p.nest && eggProgress(p) < 1 && p.embers >= WARM_PRICE;
}

export function warmWithEmbers(p: Profile): boolean {
  if (!canWarmWithEmbers(p) || !p.nest) return false;
  const need = TRIBES[p.nest.tribe].hatchKeys;
  p.embers -= WARM_PRICE;
  p.nest.warmth = Math.min(need, p.nest.warmth + Math.ceil(need * WARM_SHARE));
  return true;
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
