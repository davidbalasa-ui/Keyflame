import { describe, expect, it } from 'vitest';
import { ALL_TITLES, achievements, claimNewAchievements, currentTitle, earnedIds, earnedTitles } from '../src/game/achievements';
import { recordRace } from '../src/game/progress';
import { hasBlockedRoot } from '../src/content/safety';
import { createProfile, normalizeProfile } from '../src/save/store';

const summary = (accuracy = 0.96, wpm = 20) => ({ wpm, accuracy, correct: 200, errors: 2, durationMs: 60000, keyStats: {} });

describe('achievements', () => {
  it('has about sixty, with unique ids and titles', () => {
    const all = achievements(createProfile('Brave Rider'));
    expect(all.length).toBeGreaterThanOrEqual(50);
    expect(new Set(all.map((a) => a.id)).size).toBe(all.length);
    expect(new Set(ALL_TITLES).size).toBe(ALL_TITLES.length);
  });

  it('titles are kid safe', () => {
    for (const t of ALL_TITLES) for (const w of t.toLowerCase().split(' ')) expect(hasBlockedRoot(w), t).toBe(false);
  });

  it('announces each achievement once', () => {
    const p = createProfile('Swift Flyer');
    let before = earnedIds(p);
    recordRace(p, summary(1, 26), 1);
    const fresh = claimNewAchievements(p, before).map((a) => a.id);
    expect(fresh).toEqual(expect.arrayContaining(['races-1', 'wins-1', 'speed-1', 'speed-2', 'clean-1', 'perfect-1']));
    before = earnedIds(p);
    recordRace(p, summary(0.9, 10), 3);
    expect(claimNewAchievements(p, before)).toEqual([]);
  });

  it('older saves do not get a flood of old achievements', () => {
    const p = createProfile('Old Friend');
    p.totals.races = 12;
    delete p.achievements;
    const before = earnedIds(p);
    recordRace(p, summary(), 2);
    const fresh = claimNewAchievements(p, before).map((a) => a.id);
    expect(fresh).not.toContain('races-1');
    expect(fresh).not.toContain('races-2');
  });

  it('migrates counters from the race list and keeps only earned titles', () => {
    const raw = { ...createProfile('Lucky Scout'), races: [{ at: 1, wpm: 20, accuracy: 1, place: 1 }, { at: 2, wpm: 18, accuracy: 0.97, place: 2 }], totals: { correctKeys: 0, races: 2, lessons: 0, bestWpm: 20, bestTouchWpm: 0, minutes: 2 } } as unknown;
    const p = normalizeProfile(raw)!;
    expect(p.totals.wins).toBe(1);
    expect(p.totals.perfectRaces).toBe(1);
    expect(p.totals.cleanRaces).toBe(1);
    p.title = 'wins-1';
    expect(currentTitle(p)).toBe('Sky Champion');
    p.title = 'wins-5';
    expect(currentTitle(p)).toBeNull();
    expect(earnedTitles(p).map((a) => a.title)).toContain('Flawless');
  });
});
