import { describe, expect, it } from 'vitest';
import { createProfile, normalizeProfile, STARGLINT_ID } from '../src/save/store';
import { unlockEverything } from '../src/game/demo';
import { achievements } from '../src/game/achievements';
import { codexSets, foundLooks, TOTAL_LOOKS } from '../src/game/collection';
import { LESSONS } from '../src/content/lessons';
import { COURSES } from '../src/game/courses';
import { SEASONS } from '../src/content/seasons';
import { courseUnlocked, eggProgress, lessonUnlocked } from '../src/game/progress';
import { DECOR } from '../src/ui/screens/aerie';

describe('demo wing rider', () => {
  const now = new Date('2026-11-24T12:00:00Z');

  it('unlocks every part of the game', () => {
    const p = createProfile('Brave Comet');
    unlockEverything(p, now);
    expect(p.demo).toBe(true);
    expect(LESSONS.every((_, i) => lessonUnlocked(p, i) && p.lessons[LESSONS[i].id].stars === 3)).toBe(true);
    expect(COURSES.every((c) => courseUnlocked(p, c.id) && p.rivalsBeaten.includes(c.id))).toBe(true);
    expect(foundLooks(p).size).toBe(TOTAL_LOOKS);
    expect(codexSets(p).every((s) => s.done && s.claimed)).toBe(true);
    expect(achievements(p, now).every((a) => a.earned)).toBe(true);
    expect(achievements(p, now).filter((a) => a.track === 'season').length).toBe(SEASONS.length);
    expect(DECOR.every((d) => p.decor.includes(d.id))).toBe(true);
    expect(p.dragons.some((d) => d.id === STARGLINT_ID)).toBe(true);
    // Every star tier shows up, and the egg in the nest is ready to hatch.
    expect(new Set(p.dragons.map((d) => d.stars ?? 0))).toEqual(new Set([0, 1, 2, 3, 4]));
    expect(eggProgress(p)).toBe(1);
  });

  it('never takes anything away and survives a save', () => {
    const p = createProfile('Brave Comet');
    p.dragons.push({ id: 'mine', tribe: 'emberback', palette: 0, marking: 0, name: 'Ash', xp: 50_000, hatchedAt: 1, stars: 4 });
    p.totals.bestWpm = 99;
    unlockEverything(p, now);
    const count = p.dragons.length;
    unlockEverything(p, now);
    expect(p.dragons.length).toBe(count);
    expect(p.dragons.find((d) => d.id === 'mine')?.xp).toBe(50_000);
    expect(p.totals.bestWpm).toBe(99);
    expect(normalizeProfile(JSON.parse(JSON.stringify(p)))?.demo).toBe(true);
    expect(normalizeProfile(createProfile('X'))?.demo).toBeUndefined();
  });
});
