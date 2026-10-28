// Classroom rules that don't need the network: class codes, who starts a race, places,
// and how a classmate's dragon moves between the updates their device sends.

import { pickFact, type Fact } from '../content/facts';
import { COURSES } from './courses';
import type { TribeId } from './dragons';
import type { Stage } from './dragons';
import { NAME_ADJECTIVES, NAME_NOUNS } from '../save/store';

/** Consonants only, so a class code can never spell a word. */
export const CODE_LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';
export const CODE_LENGTH = 6;

/** Most racers in one race started by riders themselves. */
export const MAX_QUICK_RACERS = 6;
/** Most classmates drawn on the track; the rest still count for places. */
export const MAX_LANES = 5;
/** How long the lobby waits for more riders once two are ready. */
export const GATHER_MS = 5000;

/** Turns what a kid typed into a class code: capitals, letters only. */
export function normalizeCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, CODE_LENGTH);
}

export function isClassCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_LETTERS.includes(c));
}

/** Shows a code in two halves, like BXT KRP, so it is easy to read off a board. */
export function spacedCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/**
 * Rider names are built from preset words. A name from an old backup or anywhere else
 * that isn't two preset words shows as plain "Rider", so classmates never see free text.
 */
export function classRiderName(name: string): string {
  const [a, b, ...rest] = name.trim().split(/\s+/);
  if (rest.length || !NAME_ADJECTIVES.includes(a) || !NAME_NOUNS.includes(b)) return 'Rider';
  return `${a} ${b}`;
}

/** What classmates see of a rider: a name and a dragon. */
export interface Look {
  tribe: TribeId;
  palette: number;
  stage: Stage;
  marking: number;
  stars: number;
  skin?: 'starglint';
}

export type MemberStatus = 'lobby' | 'waiting' | 'racing';

export interface Member {
  /** Random per visit; never a device or save id. */
  id: string;
  name: string;
  look: Look | null;
  role: 'rider' | 'teacher';
  status: MemberStatus;
  touch: boolean;
  /** When this member came online, for picking who starts a race. */
  since: number;
}

export interface RaceStart {
  raceId: string;
  text: string;
  factId: string | null;
  courseId: string;
  racers: string[];
}

/**
 * Riders who tap Race wait together. The one who has waited longest (ties go to the
 * lower id) starts the race, so every device agrees without a server deciding.
 */
export function raceHost(waiting: Member[]): Member | null {
  const sorted = [...waiting].sort((a, b) => a.since - b.since || (a.id < b.id ? -1 : 1));
  return sorted[0] ?? null;
}

export function waitingRiders(members: Member[]): Member[] {
  return members.filter((m) => m.role === 'rider' && m.status === 'waiting');
}

/** Builds a race: the same short fact for everyone, on a random course. */
export function newRace(racers: Member[], rand: () => number = Math.random): RaceStart {
  const fact: Fact = pickFact('younger', [], [], rand, true);
  const course = COURSES[Math.floor(rand() * COURSES.length)];
  return {
    raceId: Math.floor(rand() * 36 ** 6).toString(36).padStart(6, '0'),
    text: fact.text,
    factId: fact.id,
    courseId: course.id,
    racers: racers.map((m) => m.id),
  };
}

/** Riders for a quick race: those who have waited longest, up to the limit. */
export function quickRacers(waiting: Member[]): Member[] {
  return [...waiting].sort((a, b) => a.since - b.since || (a.id < b.id ? -1 : 1)).slice(0, MAX_QUICK_RACERS);
}

/** Every rider who isn't already racing joins a race the teacher starts. */
export function teacherRacers(members: Member[]): Member[] {
  return members.filter((m) => m.role === 'rider' && m.status !== 'racing');
}

/** Your place: one more than the classmates who finished in less time. */
export function placeFor(myMs: number, othersMs: Array<number | null>): number {
  return 1 + othersMs.filter((ms) => ms !== null && ms < myMs).length;
}

/** The latest a classmate's device told us about their race. */
export interface Tick {
  progress: number;
  /** Their race clock when they sent it. */
  ms: number;
  /** Our clock when it arrived. */
  at: number;
}

/**
 * Where to draw a classmate now. Updates arrive about once a second, so in between their
 * dragon keeps flying at their own average pace. It never reaches the line before they do.
 */
export function estimateProgress(tick: Tick | null, now: number, done: boolean): number {
  if (done) return 1;
  if (!tick) return 0;
  const rate = tick.ms > 0 ? tick.progress / tick.ms : 0;
  const ahead = rate * Math.min(3000, Math.max(0, now - tick.at));
  return Math.min(0.985, tick.progress + ahead);
}

/** How often to send progress: slower in big races to stay well inside the free plan. */
export function tickEvery(racers: number): number {
  return Math.max(1000, Math.round((racers * racers * 1000) / 60));
}
