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

// ---------- Teacher dashboard ----------

/** A new random key that lets a class follow one rider. */
export function newRiderKey(rand: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  return [...rand(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type Trend = 'up' | 'down' | 'flat';

/** Is a rider's speed moving? Compares their last five timed sessions with the five before. */
export function speedTrend(recent: number | null, prev: number | null): Trend | null {
  if (recent === null || prev === null) return null;
  const step = Math.max(1, prev * 0.05);
  if (recent - prev >= step) return 'up';
  if (prev - recent >= step) return 'down';
  return 'flat';
}

const DAY = 86400000;

/** "Today", "Yesterday", "3 days ago", "2 weeks ago", in the teacher's own time zone. */
export function lastActive(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const startOf = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY);
}

/** Short notes that help a teacher spot who could use a hand. */
export function riderNotes(r: { last_seen: string; recent_accuracy: number | null; lessons: number; races: number }, now: Date = new Date()): string[] {
  const notes: string[] = [];
  if (daysSince(r.last_seen, now) >= 7) notes.push('Not seen this week');
  if (r.recent_accuracy !== null && r.lessons + r.races >= 3 && r.recent_accuracy < 0.85) notes.push('Accuracy under 85%');
  return notes;
}

/** This week and last week from the weekly rows (weeks start on Monday, UTC). */
export function weekCompare<T extends { week: string }>(weeks: T[], now: Date = new Date()): { thisWeek: T | null; lastWeek: T | null } {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
  const key = (d: Date): string => d.toISOString().slice(0, 10);
  const last = new Date(monday.getTime() - 7 * DAY);
  // The database sends a plain date; some drivers send a full timestamp.
  const find = (k: string): T | null => weeks.find((w) => w.week.slice(0, 10) === k) ?? null;
  return { thisWeek: find(key(monday)), lastWeek: find(key(last)) };
}

/** "Oct 26" for a week starting that day. */
export function weekLabel(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Turns a pasted class list into names, one per line, skipping blanks and numbering. */
export function parseStudentList(text: string, max = 99): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\d+[.)]?\s*/, '').trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, max);
}

/** The next free badge number after every one already given out or joined. */
export function nextBadge(used: number[]): number | null {
  const n = Math.max(0, ...used) + 1;
  return n <= 99 ? n : null;
}

export interface DashRow<R> {
  badge: number;
  /** The teacher's own name for this badge, kept only on their device. */
  student: string;
  /** Server progress, once the badge has joined. */
  rider: R | null;
}

/** Every badge on the teacher's list and every badge that joined, in badge order. */
export function mergeRoster<R extends { badge: number }>(roster: Record<number, string>, riders: R[]): Array<DashRow<R>> {
  const badges = new Set<number>([...Object.keys(roster).map(Number), ...riders.map((r) => r.badge)]);
  return [...badges].sort((a, b) => a - b).map((badge) => ({ badge, student: roster[badge] ?? '', rider: riders.find((r) => r.badge === badge) ?? null }));
}

/** A spreadsheet of the class for the teacher's own records. Names never leave their device. */
export function ridersCsv(
  rows: Array<DashRow<{ name: string; last_seen: string; lessons_passed: number; lessons: number; races: number; best_wpm: number | null; recent_wpm: number | null; recent_accuracy: number | null; active_days: number }>>,
  totalLessons: number,
): string {
  const cell = (v: string | number): string => {
    // A leading = + - or @ could run as a formula in a spreadsheet.
    const s = String(v).replace(/^([=+\-@])/, "'$1");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Badge', 'Student', 'Rider name', 'Last active', 'Lessons passed', 'Lessons played', 'Races', 'Best WPM', 'Recent WPM', 'Recent accuracy', 'Days played'];
  const body = rows.map(({ badge, student, rider: r }) =>
    r
      ? [
          badge,
          student,
          r.name,
          r.last_seen.slice(0, 10),
          `${r.lessons_passed}/${totalLessons}`,
          r.lessons,
          r.races,
          r.best_wpm === null ? '' : Math.round(r.best_wpm),
          r.recent_wpm === null ? '' : Math.round(r.recent_wpm),
          r.recent_accuracy === null ? '' : `${Math.round(r.recent_accuracy * 100)}%`,
          r.active_days,
        ]
      : [badge, student, 'Not joined yet', '', '', '', '', '', '', '', ''],
  );
  return [head, ...body].map((line) => line.map(cell).join(',')).join('\n') + '\n';
}
