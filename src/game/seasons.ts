// Season challenges and season colors. Each month's season has three challenges;
// each pays embers once, and finishing all three earns the season's title.
// Progress is kept per month the season runs, so a season that comes back starts fresh.
// Nothing here has a timer, and a season's color can still turn up later.

import { SEASONS, challengeText, pastSeasons, seasonAt, seasonRun, type ChallengeKind, type Season } from '../content/seasons';
import type { SessionSummary } from '../engine/typing';
import { today, type Profile, type SeasonLog } from '../save/store';
import { SEASON_PALETTE } from './dragons';

export const CHALLENGE_EMBERS = 40;
/** Chance an egg hatches in this season's color, and in an earlier season's color. */
export const SEASON_COLOR_CHANCE = 0.25;
export const VAULT_COLOR_CHANCE = 0.05;

export interface ChallengeState {
  kind: ChallengeKind;
  text: string;
  goal: number;
  value: number;
  done: boolean;
}

function logFor(p: Profile, now: Date): SeasonLog | null {
  const s = seasonAt(now);
  if (!s) return null;
  p.seasonLog ??= {};
  const run = seasonRun(now);
  return (p.seasonLog[run] ??= { season: s.id, races: 0, wins: 0, clean: 0, perfect: 0, keys: 0, lessons: 0, days: 0, lastDay: '', paid: [] });
}

function valueOf(log: SeasonLog | undefined, kind: ChallengeKind): number {
  return log ? log[kind] : 0;
}

/** This month's challenges and how far along they are. */
export function seasonChallenges(p: Profile, now: Date = new Date()): ChallengeState[] {
  const s = seasonAt(now);
  if (!s) return [];
  const log = p.seasonLog?.[seasonRun(now)];
  return s.challenges.map(([kind, goal]) => {
    const value = Math.min(goal, valueOf(log, kind));
    return { kind, text: challengeText(kind, goal), goal, value, done: value >= goal };
  });
}

/** Counts a finished session and pays for challenges finished by it. Returns the new ones. */
function note(p: Profile, s: SessionSummary, now: Date, add: (log: SeasonLog) => void): ChallengeState[] {
  const log = logFor(p, now);
  if (!log) return [];
  const d = today(now);
  if (log.lastDay !== d) {
    log.lastDay = d;
    log.days++;
  }
  log.keys += s.correct;
  add(log);
  const fresh: ChallengeState[] = [];
  seasonChallenges(p, now).forEach((c, i) => {
    if (!c.done || log.paid.includes(i)) return;
    log.paid.push(i);
    p.embers += CHALLENGE_EMBERS;
    p.totals.embersEarned += CHALLENGE_EMBERS;
    fresh.push(c);
  });
  return fresh;
}

export function noteSeasonRace(p: Profile, s: SessionSummary, place: number, now: Date = new Date()): ChallengeState[] {
  return note(p, s, now, (log) => {
    log.races++;
    if (place === 1) log.wins++;
    if (s.accuracy >= 0.98) log.clean++;
    if (s.accuracy >= 1) log.perfect++;
  });
}

export function noteSeasonLesson(p: Profile, s: SessionSummary, now: Date = new Date()): ChallengeState[] {
  return note(p, s, now, (log) => log.lessons++);
}

/** Season ids whose three challenges the player finished in any month. */
export function seasonsFinished(p: Profile): Set<string> {
  const done = new Set<string>();
  for (const log of Object.values(p.seasonLog ?? {})) {
    const s = SEASONS.find((x) => x.id === log.season);
    if (s && log.paid.length >= s.challenges.length) done.add(s.id);
  }
  return done;
}

export const seasonPalette = (s: Season): number => SEASON_PALETTE + SEASONS.indexOf(s);

/**
 * Maybe swaps a hatching egg's color for a season color: this season's often,
 * an earlier season's now and then (the Starfall Vault). Null keeps the tribe color.
 */
export function rollSeasonPalette(now: Date = new Date(), rand: () => number = Math.random): number | null {
  const s = seasonAt(now);
  if (!s) return null;
  const r = rand();
  if (r < SEASON_COLOR_CHANCE) return seasonPalette(s);
  const vault = pastSeasons(now).filter((x) => x !== s);
  if (r < SEASON_COLOR_CHANCE + VAULT_COLOR_CHANCE && vault.length) return seasonPalette(vault[Math.floor(rand() * vault.length)]);
  return null;
}
