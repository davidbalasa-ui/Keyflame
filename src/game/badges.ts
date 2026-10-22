// Skill badges, worked out from the profile so they never get out of sync.

import { lessonsInUnit } from '../content/lessons';
import type { Profile } from '../save/store';
import { COURSES } from './courses';
import { TRIBES } from './dragons';

export interface Badge {
  id: string;
  name: string;
  how: string;
  earned: boolean;
}

export function badges(p: Profile): Badge[] {
  const best = Math.max(p.totals.bestWpm, p.totals.bestTouchWpm);
  const tribes = new Set(p.dragons.map((d) => d.tribe));
  const list: Array<[string, string, string, boolean]> = [
    ['first-flight', 'First Flight', 'Finish a race', p.totals.races >= 1],
    ['first-win', 'Sky Champion', 'Win a race', p.races.some((r) => r.place === 1)],
    ['races-10', 'Frequent Flyer', 'Finish 10 races', p.totals.races >= 10],
    ['races-50', 'Sky Veteran', 'Finish 50 races', p.totals.races >= 50],
    ['wpm-15', 'Quick Claws', 'Reach 15 WPM', best >= 15],
    ['wpm-25', 'Swift Wings', 'Reach 25 WPM', best >= 25],
    ['wpm-40', 'Lightning Talons', 'Reach 40 WPM', best >= 40],
    ['acc-98', 'Steady Flame', 'Finish a race with 98% accuracy', p.races.some((r) => r.accuracy >= 0.98)],
    ['home-3', 'Home Row Hero', 'Get 3 stars on every Home Row lesson', lessonsInUnit('home').every((l) => (p.lessons[l.id]?.stars ?? 0) >= 3)],
    ['hatch-1', 'Egg Warmer', 'Hatch your first dragon', p.dragons.length >= 1],
    ['hatch-4', 'Dragon Keeper', 'Raise 4 dragons', p.dragons.length >= 4],
    ['tribes-all', 'Friend of Every Tribe', `Hatch one of all ${Object.keys(TRIBES).length} tribes`, tribes.size >= Object.keys(TRIBES).length],
    ['rare', 'Lucky Find', 'Hatch a rare color', p.dragons.some((d) => TRIBES[d.tribe].palettes[d.palette]?.rare)],
    ['champions', 'Legend of the Skies', 'Beat every course champion', COURSES.every((c) => p.rivalsBeaten.includes(c.id))],
  ];
  return list.map(([id, name, how, earned]) => ({ id, name, how, earned }));
}
