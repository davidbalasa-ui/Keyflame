// Achievements and titles, worked out from the profile so they never get out of sync.
// Each track has tiers; every tier is its own achievement and unlocks a title.
// Nothing here can be lost once earned, and nothing has a timer.

import { LESSONS } from '../content/lessons';
import type { Profile } from '../save/store';
import { COURSES } from './courses';
import { TOTAL_LOOKS, codexSets, foundLooks } from './collection';
import { TRIBES, stageFor } from './dragons';
import { SUPPORTER_TITLE, SUPPORTER_TITLE_ID } from './supporter';

export type Medal = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend';
const MEDALS: Medal[] = ['bronze', 'silver', 'gold', 'platinum', 'legend'];

interface Track {
  id: string;
  name: string;
  icon: string;
  how: (goal: number) => string;
  value: (p: Profile) => number;
  goals: number[];
  /** One title per goal. */
  titles: string[];
}

const ALL_SETS = Object.keys(TRIBES).length * 2;

const plural = (n: number, one: string, many = one + 's'): string => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

const TRACKS: Track[] = [
  {
    id: 'races', name: 'Racer', icon: '🏁', goals: [1, 10, 50, 150, 500],
    how: (g) => (g === 1 ? 'Finish a race' : `Finish ${plural(g, 'race')}`),
    value: (p) => p.totals.races,
    titles: ['Sky Rookie', 'Frequent Flyer', 'Sky Veteran', 'Cloud Captain', 'Sky Legend'],
  },
  {
    id: 'wins', name: 'Winner', icon: '🏆', goals: [1, 5, 25, 100, 250],
    how: (g) => (g === 1 ? 'Win a race' : `Win ${plural(g, 'race')}`),
    value: (p) => p.totals.wins,
    titles: ['Sky Champion', 'Race Winner', 'Trophy Hunter', 'Gold Wing', 'Hall of Flames'],
  },
  {
    id: 'speed', name: 'Speed', icon: '⚡', goals: [15, 25, 35, 50, 70],
    how: (g) => `Race at ${g} WPM`,
    value: (p) => Math.max(p.totals.bestWpm, p.totals.bestTouchWpm),
    titles: ['Quick Claws', 'Swift Wings', 'Lightning Talons', 'Comet Rider', 'Starstreak'],
  },
  {
    id: 'clean', name: 'Careful', icon: '🎯', goals: [1, 10, 50],
    how: (g) => (g === 1 ? 'Finish a race with 98% accuracy' : `Finish ${plural(g, 'race')} with 98% accuracy`),
    value: (p) => p.totals.cleanRaces,
    titles: ['Steady Flame', 'Sharp Eye', 'Precision Pilot'],
  },
  {
    id: 'perfect', name: 'Flawless', icon: '💎', goals: [1, 5, 25],
    how: (g) => (g === 1 ? 'Finish a race with no mistakes' : `Finish ${plural(g, 'race')} with no mistakes`),
    value: (p) => p.totals.perfectRaces,
    titles: ['Flawless', 'Spotless Scales', 'Perfect Flight'],
  },
  {
    id: 'keys', name: 'Keys', icon: '⌨️', goals: [1000, 10000, 50000, 200000, 1000000],
    how: (g) => `Type ${plural(g, 'correct key')}`,
    value: (p) => p.totals.correctKeys,
    titles: ['Key Tapper', 'Key Crafter', 'Key Master', 'Key Wizard', 'Keyflame Legend'],
  },
  {
    id: 'minutes', name: 'Practice', icon: '⏱️', goals: [10, 60, 300, 1000],
    how: (g) => `Practice for ${plural(g, 'minute')}`,
    value: (p) => Math.floor(p.totals.minutes),
    titles: ['Practice Pal', 'Hard Worker', 'Sky Scholar', 'Grand Master'],
  },
  {
    id: 'stars', name: 'Stars', icon: '⭐', goals: [10, 30, LESSONS.length * 3],
    how: (g) => (g === LESSONS.length * 3 ? 'Get 3 stars on every lesson' : `Earn ${plural(g, 'lesson star')}`),
    value: (p) => Object.values(p.lessons).reduce((n, l) => n + l.stars, 0),
    titles: ['Star Catcher', 'Star Gazer', 'Constellation'],
  },
  {
    id: 'units', name: 'Lessons', icon: '📘', goals: [1, 2, 3, 4],
    how: (g) => (g === 4 ? 'Pass every lesson unit' : g === 1 ? 'Pass a lesson unit' : `Pass ${plural(g, 'lesson unit')}`),
    value: (p) => p.unitsRewarded.length,
    titles: ['Home Row Hero', 'Cloud Climber', 'Forest Finder', 'Storyteller'],
  },
  {
    id: 'hatch', name: 'Hatcher', icon: '🥚', goals: [1, 4, 10, 25],
    how: (g) => (g === 1 ? 'Hatch your first dragon' : `Hatch ${plural(g, 'dragon')}`),
    value: (p) => p.dragons.length,
    titles: ['Egg Warmer', 'Dragon Keeper', 'Dragon Friend', 'Dragon Whisperer'],
  },
  {
    id: 'tribes', name: 'Tribes', icon: '🗺️', goals: [3, 5, Object.keys(TRIBES).length],
    how: (g) => (g === Object.keys(TRIBES).length ? `Hatch one of all ${g} tribes` : `Hatch dragons from ${g} tribes`),
    value: (p) => new Set(p.dragons.map((d) => d.tribe)).size,
    titles: ['Tribe Visitor', 'Tribe Friend', 'Friend of Every Tribe'],
  },
  {
    id: 'rare', name: 'Rare colors', icon: '🌈', goals: [1, 3],
    how: (g) => (g === 1 ? 'Hatch a rare color' : `Hatch ${plural(g, 'rare color')}`),
    value: (p) => p.dragons.filter((d) => TRIBES[d.tribe].palettes[d.palette]?.rare).length,
    titles: ['Lucky Find', 'Treasure Seeker'],
  },
  {
    id: 'looks', name: 'Collector', icon: '🔍', goals: [5, 15, 30, 50, TOTAL_LOOKS],
    how: (g) => (g === TOTAL_LOOKS ? 'Find every dragon look in the Codex' : `Find ${g} dragon looks for your Codex`),
    value: (p) => foundLooks(p).size,
    titles: ['Collector', 'Look Hunter', 'Codex Keeper', 'Master Collector', 'Living Codex'],
  },
  {
    id: 'sets', name: 'Codex sets', icon: '🧩', goals: [1, 4, ALL_SETS],
    how: (g) => (g === ALL_SETS ? 'Finish every Codex set' : g === 1 ? 'Finish a Codex set' : `Finish ${g} Codex sets`),
    value: (p) => codexSets(p).filter((s) => s.done).length,
    titles: ['Set Starter', 'Set Builder', 'Codex Champion'],
  },
  {
    id: 'grown', name: 'Grown up', icon: '🐉', goals: [1, 3],
    how: (g) => (g === 1 ? 'Raise a dragon to full size' : `Raise ${plural(g, 'dragon')} to full size`),
    value: (p) => p.dragons.filter((d) => stageFor(d.xp) === 'adult').length,
    titles: ['Dragon Raiser', 'Wise Keeper'],
  },
  {
    id: 'champions', name: 'Champions', icon: '👑', goals: [1, 3, COURSES.length],
    how: (g) => (g === COURSES.length ? 'Beat every course champion' : g === 1 ? 'Beat a course champion' : `Beat ${plural(g, 'course champion')}`),
    value: (p) => p.rivalsBeaten.length,
    titles: ['Rival Beater', 'Course Conqueror', 'Legend of the Skies'],
  },
  {
    id: 'facts', name: 'Facts', icon: '📚', goals: [5, 25, 100, 300],
    how: (g) => `Collect ${plural(g, 'fact')} in your Fact Book`,
    value: (p) => p.factsSeen.length,
    titles: ['Curious Mind', 'Fact Finder', 'Walking Library', 'Sky Professor'],
  },
  {
    id: 'days', name: 'Visits', icon: '📅', goals: [3, 10, 30, 100],
    how: (g) => `Play on ${plural(g, 'different day')}`,
    value: (p) => p.totals.playDays,
    titles: ['Welcome Back', 'Loyal Rider', 'Old Friend', 'Sky Elder'],
  },
  {
    id: 'embers', name: 'Embers', icon: '🔥', goals: [100, 1000, 5000, 20000],
    how: (g) => `Earn ${plural(g, 'ember')}`,
    value: (p) => p.totals.embersEarned,
    titles: ['Ember Saver', 'Spark Collector', 'Flame Keeper', 'Dragon Hoard'],
  },
];

export interface Achievement {
  id: string;
  track: string;
  name: string;
  icon: string;
  how: string;
  title: string;
  medal: Medal;
  goal: number;
  /** Progress toward the goal, capped at the goal. */
  value: number;
  earned: boolean;
}

export function achievements(p: Profile): Achievement[] {
  return TRACKS.flatMap((t) => {
    const v = t.value(p);
    return t.goals.map((goal, i) => ({
      id: `${t.id}-${i + 1}`,
      track: t.id,
      name: t.name,
      icon: t.icon,
      how: t.how(goal),
      title: t.titles[i],
      medal: medalFor(i, t.goals.length),
      goal,
      value: Math.min(v, goal),
      earned: v >= goal,
    }));
  });
}

/** Short tracks still end on gold, so the last tier always feels big. */
function medalFor(i: number, count: number): Medal {
  if (count <= 3) return (['bronze', 'silver', 'gold'] as Medal[])[i] ?? 'gold';
  if (count === 4) return (['bronze', 'silver', 'gold', 'platinum'] as Medal[])[i];
  return MEDALS[i] ?? 'legend';
}

export function achievementById(p: Profile, id: string): Achievement | undefined {
  return achievements(p).find((a) => a.id === id);
}

/** The title the player picked, if they still have it. */
export function currentTitle(p: Profile): string | null {
  if (!p.title) return null;
  if (p.title === SUPPORTER_TITLE_ID) return p.supporter ? SUPPORTER_TITLE : null;
  const a = achievementById(p, p.title);
  return a?.earned ? a.title : null;
}

/** Titles the player can pick from, best medals first. */
export function earnedTitles(p: Profile): Achievement[] {
  return achievements(p)
    .filter((a) => a.earned)
    .sort((a, b) => MEDALS.indexOf(b.medal) - MEDALS.indexOf(a.medal));
}

/**
 * Achievements earned since the last call, marked as seen. The first call on an
 * older save quietly marks everything already earned, so nobody gets a flood.
 */
export function claimNewAchievements(p: Profile, before?: Set<string>): Achievement[] {
  const all = achievements(p).filter((a) => a.earned);
  if (!p.achievements) {
    p.achievements = all.filter((a) => !before || before.has(a.id)).map((a) => a.id);
  }
  const seen = new Set(p.achievements);
  const fresh = all.filter((a) => !seen.has(a.id));
  p.achievements.push(...fresh.map((a) => a.id));
  return fresh;
}

/** Ids earned right now, to pass to claimNewAchievements after a session. */
export function earnedIds(p: Profile): Set<string> {
  return new Set(achievements(p).filter((a) => a.earned).map((a) => a.id));
}

export const ALL_TITLES = TRACKS.flatMap((t) => t.titles);
