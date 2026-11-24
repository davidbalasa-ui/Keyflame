// The demo wing: a wing the server marks as a showcase, so a grown-up can look at every
// part of the game in the real app. A rider who joins it gets everything unlocked on that
// device: every lesson and word challenge, every course and champion, every dragon look
// at every star tier and size, Starglint, every season color, the whole aerie, every
// achievement and a full Fact Book. Nothing is taken away, so it is safe to run twice.
// Demo riders never add to the usage counts.

import { STARGLINT_ID, ensureStarglint, today, type LessonRecord, type Profile, type RaceRecord } from '../save/store';
import { LESSONS, UNITS } from '../content/lessons';
import { CHALLENGES } from '../content/challenges';
import { FACTS } from '../content/facts';
import { SEASONS } from '../content/seasons';
import { MARKINGS, TRIBES, type TribeId } from './dragons';
import { COURSES } from './courses';
import { MILESTONES, MAX_STARS, randomDragonName } from './progress';
import { codexSets } from './collection';
import { seasonPalette } from './seasons';
import { achievements } from './achievements';
import { DECOR } from '../ui/screens/aerie';

const DAY = 86_400_000;
const KEYS = 'abcdefghijklmnopqrstuvwxyz;,./'.split('');

/** XP for each size, so the nest shows hatchlings, young dragons and adults. */
const XP = { hatchling: 300, young: 3000, adult: 9000 };

/** A steady, made-up history so the Progress and Family charts have something to show. */
function history(now: number): { races: RaceRecord[]; lessons: LessonRecord[] } {
  const races: RaceRecord[] = [];
  const lessons: LessonRecord[] = [];
  for (let i = 0; i < 30; i++) {
    const at = now - i * DAY - 3_600_000;
    races.push({ at, wpm: Math.round(42 - i * 0.6), accuracy: 0.97 - (i % 4) * 0.005, place: (i % 3) + 1, input: i % 5 === 4 ? 'touch' : 'keyboard', course: COURSES[i % COURSES.length].id });
    lessons.push({ at: at - 600_000, lesson: LESSONS[(LESSONS.length - 1 - i + LESSONS.length * 2) % LESSONS.length].id, stars: 3, wpm: Math.round(38 - i * 0.5), accuracy: 0.98 });
  }
  return { races, lessons };
}

/** Unlocks everything for a demo rider. Adds and raises, never removes. */
export function unlockEverything(p: Profile, now: Date = new Date()): void {
  const t = now.getTime();
  p.demo = true;
  p.nestSeen = true;

  for (const l of LESSONS) p.lessons[l.id] = { stars: 3, bestWpm: Math.max(p.lessons[l.id]?.bestWpm ?? 0, 40), bestAccuracy: Math.max(p.lessons[l.id]?.bestAccuracy ?? 0, 0.99) };
  p.challenges = { ...(p.challenges ?? {}) };
  for (const c of CHALLENGES) p.challenges[c.id] = { stars: 3, bestWpm: Math.max(p.challenges[c.id]?.bestWpm ?? 0, 30), bestAccuracy: 0.99 };
  p.unitsRewarded = [...new Set([...p.unitsRewarded, ...UNITS.map((u) => u.id)])];
  p.rivalsBeaten = [...new Set([...p.rivalsBeaten, ...COURSES.map((c) => c.id)])];
  p.milestones = [...new Set([...p.milestones, ...MILESTONES.map((m) => m.id)])];
  p.decor = [...new Set([...p.decor, ...DECOR.map((d) => d.id)])];
  p.factsSeen = [...new Set([...p.factsSeen, ...FACTS.map((f) => f.id)])];
  p.keysMastered = [...new Set([...(p.keysMastered ?? []), ...KEYS])];
  for (const k of KEYS) {
    const s = p.keyStats[k] ?? { hits: 0, misses: 0, totalMs: 0 };
    if (s.hits < 400) p.keyStats[k] = { ...s, hits: 400, misses: Math.min(s.misses, 8), totalMs: 400 * 260 };
  }

  // Every look of every tribe: colors x markings. Star tiers and sizes are spread out so
  // each one shows up somewhere, and the first look of each tribe is a full four-star adult.
  const have = new Set(p.dragons.map((d) => `${d.tribe}:${d.palette}:${d.marking ?? 0}`));
  (Object.keys(TRIBES) as TribeId[]).forEach((tribe, ti) => {
    TRIBES[tribe].palettes.forEach((_, palette) => {
      MARKINGS.forEach((_, marking) => {
        const key = `${tribe}:${palette}:${marking}`;
        const n = palette * MARKINGS.length + marking;
        const stars = n === 0 ? MAX_STARS : (n + ti) % (MAX_STARS + 1);
        const xp = n === 0 ? XP.adult : [XP.adult, XP.young, XP.hatchling][(n + ti) % 3];
        const own = p.dragons.find((d) => `${d.tribe}:${d.palette}:${d.marking ?? 0}` === key);
        if (own) {
          own.stars = Math.max(own.stars ?? 0, stars);
          own.xp = Math.max(own.xp, xp);
        } else if (!have.has(key)) {
          p.dragons.push({ id: `demo-${key}`, tribe, palette, marking, name: randomDragonName(), xp, hatchedAt: t - (ti * 12 + n) * 3_600_000, stars });
        }
      });
    });
  });
  // One dragon in every season color, on tribes in turn.
  const tribes = Object.keys(TRIBES) as TribeId[];
  SEASONS.forEach((s, i) => {
    const palette = seasonPalette(s);
    if (!p.dragons.some((d) => d.palette === palette)) {
      p.dragons.push({ id: `demo-season-${s.id}`, tribe: tribes[i % tribes.length], palette, marking: i % MARKINGS.length, name: randomDragonName(), xp: XP.adult, hatchedAt: t - i * DAY, stars: 0 });
    }
  });
  // Every season finished, so every season title and Codex page shows.
  p.seasonLog = { ...(p.seasonLog ?? {}) };
  for (const s of SEASONS) {
    const log = p.seasonLog[s.id];
    p.seasonLog[s.id] = { season: s.id, races: 40, wins: 20, clean: 15, perfect: 8, keys: 20000, lessons: 20, days: 20, lastDay: log?.lastDay ?? `${s.id}-28`, paid: s.challenges.map((_, i) => i) };
  }

  // The supporter's Starglint, wearing its Lightning look.
  p.supporter = true;
  ensureStarglint(p);
  if (!p.activeDragonId || !p.dragons.some((d) => d.id === p.activeDragonId)) p.activeDragonId = p.dragons.find((d) => d.id !== STARGLINT_ID)?.id ?? STARGLINT_ID;

  // An egg ready to hatch and two in the basket, leaving room to buy one more.
  p.nest = { tribe: 'shadeglide', warmth: TRIBES.shadeglide.hatchKeys, seed: Math.floor(t % 1e9) };
  if (p.basket.length < 2) p.basket = [...p.basket, 'emberback' as TribeId, 'tidefin' as TribeId].slice(0, 2);

  const { races, lessons } = history(t);
  if (p.races.length < races.length) p.races = [...p.races, ...races].sort((a, b) => b.at - a.at).slice(0, 50);
  p.lessonLog = [...(p.lessonLog ?? []), ...lessons].sort((a, b) => b.at - a.at).slice(0, 50);
  p.startSpeed = p.startSpeed ?? { keyboard: { wpm: 20, at: t - 120 * DAY }, touch: { wpm: 12, at: t - 120 * DAY } };

  const tot = p.totals;
  tot.correctKeys = Math.max(tot.correctKeys, 250_000);
  tot.races = Math.max(tot.races, 600);
  tot.lessons = Math.max(tot.lessons, 300);
  tot.bestWpm = Math.max(tot.bestWpm, 75);
  tot.bestTouchWpm = Math.max(tot.bestTouchWpm, 40);
  tot.minutes = Math.max(tot.minutes, 1200);
  tot.wins = Math.max(tot.wins, 300);
  tot.cleanRaces = Math.max(tot.cleanRaces, 60);
  tot.perfectRaces = Math.max(tot.perfectRaces, 30);
  tot.embersEarned = Math.max(tot.embersEarned, 30_000);
  tot.playDays = Math.max(tot.playDays, 120);
  p.embers = Math.max(p.embers, 20_000);
  p.streak = { last: today(now), days: Math.max(p.streak?.days ?? 0, 30), best: Math.max(p.streak?.best ?? 0, 100) };

  // Sets and achievements are marked as already paid and seen, so nothing floods in.
  p.setsClaimed = [...new Set([...p.setsClaimed, ...codexSets(p).filter((s) => s.done).map((s) => s.id)])];
  p.achievements = [...new Set([...(p.achievements ?? []), ...achievements(p, now).filter((a) => a.earned).map((a) => a.id)])];
}
