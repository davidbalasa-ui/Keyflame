import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TypingSession, computeWpm, weakKeys } from '../src/engine/typing';
import { LESSONS, buildLessonText, buildRaceText, starsFor } from '../src/content/lessons';
import { createProfile, exportBackupCode, importBackupCode, migrate } from '../src/save/store';
import { MILESTONES, checkUnitReward, eggProgress, ghostProgress, hatchEgg, knownLetters, milestoneText, recordLesson, recordRace } from '../src/game/progress';
import { TRIBES, rollPalette, seededRandom, stageFor } from '../src/game/dragons';

describe('typing engine', () => {
  it('advances only on the correct key and counts errors', () => {
    const s = new TypingSession('ab');
    expect(s.type('x', 0)?.correct).toBe(false);
    expect(s.index).toBe(0);
    expect(s.type('a', 100)?.correct).toBe(true);
    expect(s.type('b', 200)?.finished).toBe(true);
    expect(s.errors).toBe(1);
    expect(s.accuracy()).toBeCloseTo(2 / 3);
    expect(s.keyStats.a.misses).toBe(1);
  });

  it('computes standard WPM', () => {
    expect(computeWpm(50, 60000)).toBe(10);
    expect(computeWpm(0, 0)).toBe(0);
  });

  it('measures elapsed time from the first key', () => {
    const s = new TypingSession('aaaaa');
    for (let i = 0; i < 5; i++) s.type('a', 1000 + i * 3000);
    expect(s.elapsedMs()).toBe(12000);
    expect(s.wpm()).toBeCloseTo(5);
  });

  it('finds weak keys only after enough attempts', () => {
    expect(weakKeys({ q: { hits: 1, misses: 1, totalMs: 900 } }, ['q'])).toEqual([]);
    expect(weakKeys({ q: { hits: 6, misses: 6, totalMs: 6000 } }, ['q'])).toEqual(['q']);
  });
});

describe('lessons', () => {
  it('lesson text uses only the lesson keys', () => {
    const rand = seededRandom(5);
    for (const l of LESSONS.filter((x) => x.kind !== 'passage')) {
      const allowed = new Set([...l.keys, ' ']);
      for (const ch of buildLessonText(l, [], rand)) expect(allowed.has(ch), `${l.title}: ${ch}`).toBe(true);
    }
  });

  it('race text uses only known letters', () => {
    const known = new Set('asdfghjkl;'.split(''));
    for (const ch of buildRaceText(known, 30, seededRandom(2))) expect(known.has(ch) || ch === ' ').toBe(true);
  });

  it('awards stars by accuracy and speed', () => {
    const l = LESSONS[0];
    expect(starsFor(l, 30, 0.85)).toBe(0);
    expect(starsFor(l, 5, 0.92)).toBe(1);
    expect(starsFor(l, 5, 0.96)).toBe(2);
    expect(starsFor(l, l.starWpm, 0.96)).toBe(3);
  });
});

describe('progress', () => {
  const summary = (correct: number) => ({ wpm: 15, accuracy: 0.96, correct, errors: 2, durationMs: 60000, keyStats: {} });

  it('warms and hatches the starter egg', () => {
    const p = createProfile('Brave Rider');
    recordRace(p, summary(TRIBES.emberback.hatchKeys + 50), 1);
    expect(eggProgress(p)).toBe(1);
    const d = hatchEgg(p, 'Ashclaw', seededRandom(1));
    expect(d?.tribe).toBe('emberback');
    expect(p.activeDragonId).toBe(d?.id);
    expect(p.nest).toBeNull();
  });

  it('does not hatch an egg that is not warm', () => {
    const p = createProfile('Bold Flyer');
    expect(hatchEgg(p, 'x')).toBeNull();
  });

  it('gives a unit egg once every lesson in it is passed', () => {
    const p = createProfile('Swift Scout');
    p.nest = null;
    for (const l of LESSONS.filter((x) => x.unit === 'home')) recordLesson(p, l, summary(40), 1);
    expect((p.nest as { tribe: string } | null)?.tribe).toBe('tidefin');
    expect(checkUnitReward(p, 'home')).toBeNull();
  });

  it('race letters never drop below the home row', () => {
    const p = createProfile('Lucky Comet');
    expect([...'asdfghjkl'].every((k) => knownLetters(p).has(k))).toBe(true);
  });

  it('grows dragons by stage', () => {
    expect(stageFor(0)).toBe('hatchling');
    expect(stageFor(2500)).toBe('young');
    expect(stageFor(9000)).toBe('adult');
  });

  it('rolls a valid palette', () => {
    for (let i = 0; i < 50; i++) {
      const idx = rollPalette('tidefin', seededRandom(i));
      expect(TRIBES.tidefin.palettes[idx]).toBeDefined();
    }
  });

  it('ghosts move forward at their WPM', () => {
    expect(ghostProgress(12, 60000, 60)).toBe(1);
    expect(ghostProgress(12, 30000, 60)).toBeCloseTo(0.5);
  });
});

describe('saves', () => {
  it('round-trips a backup code', () => {
    const p = createProfile('Clever Keeper');
    p.embers = 42;
    const back = importBackupCode(exportBackupCode(p));
    expect(back?.embers).toBe(42);
    expect(back?.name).toBe('Clever Keeper');
  });

  it('rejects junk codes', () => {
    expect(importBackupCode('hello')).toBeNull();
    expect(importBackupCode('KF1-!!!')).toBeNull();
  });

  it('migrates old or partial saves without crashing', () => {
    const data = migrate({ profiles: [{ id: 'a', name: 'Old Rider' }, { nope: true }], activeId: 'a' });
    expect(data.profiles).toHaveLength(1);
    expect(data.profiles[0].settings.sound).toBe(true);
    expect(data.activeId).toBe('a');
    expect(migrate(null).profiles).toEqual([]);
  });
});

describe('relaxed mode', () => {
  it('moves past mistakes but still counts them', () => {
    const s = new TypingSession('ab', { advanceOnError: true });
    s.type('x', 0);
    expect(s.index).toBe(1);
    expect(s.type('b', 100)?.finished).toBe(true);
    expect(s.errors).toBe(1);
    expect(s.correct).toBe(1);
  });
});

import { applyRaceKey, finishTime, newRaceState, perkTuning } from '../src/game/raceRules';
import { applyPlacement, courseUnlocked, ghostSpeeds, rivalSpeed } from '../src/game/progress';
import { achievements } from '../src/game/achievements';
import { buyDecor } from '../src/ui/screens/aerie';

describe('race rules', () => {
  const hit = (expected: string) => ({ correct: true, expected, typed: expected, finished: false, streak: 1 });
  const miss = { correct: false, expected: 'a', typed: 'x', finished: false, streak: 0 };

  it('a full flame meter adds a dash', () => {
    const tune = perkTuning(null);
    const st = newRaceState();
    let dashes = 0;
    for (let i = 0; i < tune.dashStreak; i++) if (applyRaceKey(st, hit('a'), tune, 0.1)) dashes++;
    expect(dashes).toBe(1);
    expect(st.bonus).toBe(tune.dashBonus);
  });

  it('Tidefins lose less on a typo, Shadeglides keep half the meter', () => {
    const t = newRaceState();
    applyRaceKey(t, miss, perkTuning('tidefin'), 0);
    expect(t.bonus).toBeCloseTo(-0.4);
    const s = newRaceState();
    for (let i = 0; i < 10; i++) applyRaceKey(s, hit('a'), perkTuning('shadeglide'), 0);
    applyRaceKey(s, miss, perkTuning('shadeglide'), 0);
    expect(s.meter).toBe(5);
  });

  it('Frostspines get a bonus for clean words, Duneskimmers sprint', () => {
    const f = newRaceState();
    applyRaceKey(f, hit('a'), perkTuning('frostspine'), 0);
    applyRaceKey(f, hit(' '), perkTuning('frostspine'), 0);
    expect(f.bonus).toBeCloseTo(0.5);
    const d = newRaceState();
    applyRaceKey(d, hit('a'), perkTuning('duneskimmer'), 0.9);
    expect(d.bonus).toBeCloseTo(0.25);
  });

  it('finish time matches WPM', () => {
    expect(finishTime(12, 60)).toBeCloseTo(60000);
  });
});

describe('campaign and milestones', () => {
  it('courses open with lesson units', () => {
    const p = createProfile('Bold Ranger');
    expect(courseUnlocked(p, 'volcano')).toBe(true);
    expect(courseUnlocked(p, 'reef')).toBe(false);
    p.unitsRewarded.push('home');
    expect(courseUnlocked(p, 'reef')).toBe(true);
  });

  it('beating a rival pays once', () => {
    const p = createProfile('Bold Ranger');
    const s = { wpm: 20, accuracy: 0.97, correct: 100, errors: 1, durationMs: 60000, keyStats: {} };
    const first = recordRace(p, s, 1, { input: 'keyboard', courseId: 'volcano', beatRival: true });
    const again = recordRace(p, s, 1, { input: 'keyboard', courseId: 'volcano', beatRival: true });
    expect(first.rivalFirstWin).toBe(true);
    expect(again.rivalFirstWin).toBe(false);
    expect(first.embers - again.embers).toBe(25);
  });

  it('three accurate races earn the Frostspine egg', () => {
    const p = createProfile('Quiet Seeker');
    const s = { wpm: 10, accuracy: 0.96, correct: 50, errors: 1, durationMs: 60000, keyStats: {} };
    recordRace(p, s, 2);
    recordRace(p, s, 2);
    const third = recordRace(p, s, 2);
    expect(third.newEgg).toBe('frostspine');
    expect(p.basket).toContain('frostspine');
  });

  it('touch records are kept apart and rivals ease off for touch', () => {
    const p = createProfile('Sunny Spark');
    const s = { wpm: 30, accuracy: 0.95, correct: 100, errors: 5, durationMs: 60000, keyStats: {} };
    recordRace(p, s, 1, { input: 'touch', courseId: 'volcano', beatRival: false });
    expect(p.totals.bestTouchWpm).toBe(30);
    expect(p.totals.bestWpm).toBe(0);
    expect(rivalSpeed('reef', 'touch')).toBeLessThan(rivalSpeed('reef', 'keyboard'));
    expect(ghostSpeeds(p, 'keyboard')[0]).toBeCloseTo(12 * 0.8);
  });

  it('the placement check skips units for fluent typists', () => {
    const p = createProfile('Mighty Comet');
    expect(applyPlacement(p, 30, 0.95)).toBe(3);
    expect(p.unitsRewarded).toEqual(['home', 'top', 'bottom']);
    expect(applyPlacement(createProfile('x'), 30, 0.7)).toBe(0);
  });

  it('badges and decor follow the profile', () => {
    const p = createProfile('Gentle Glider');
    expect(achievements(p).every((a) => !a.earned)).toBe(true);
    p.embers = 50;
    expect(buyDecor(p, 'moss')).toBe(true);
    expect(buyDecor(p, 'moss')).toBe(false);
    expect(buyDecor(p, 'stars')).toBe(false);
    expect(p.embers).toBe(10);
  });
});

describe('Duneskimmer by beating your starting speed', () => {
  const race = (wpm: number) => ({ wpm, accuracy: 0.9, correct: 40, errors: 4, durationMs: 60000, keyStats: {} });
  const touch = { input: 'touch' as const, courseId: 'volcano', beatRival: false };
  // Races finish at least a few seconds apart in real play.
  let clock = 1_700_000_000_000;
  beforeEach(() => vi.spyOn(Date, 'now').mockImplementation(() => (clock += 60_000)));
  afterEach(() => vi.restoreAllMocks());

  it('sets the starting speed from the first three races on each input', () => {
    const p = createProfile('Bold Ranger');
    recordRace(p, race(8), 3, touch);
    recordRace(p, race(10), 3, touch);
    expect(p.startSpeed).toBeUndefined();
    recordRace(p, race(12), 3, touch);
    expect(p.startSpeed?.touch?.wpm).toBe(10);
    expect(p.startSpeed?.keyboard).toBeUndefined();
    expect(milestoneText(MILESTONES.find((m) => m.id === 'speed')!, p)).toBe('Race at 15 WPM on touch');
  });

  it('a fast starting race never counts as beating the start', () => {
    const p = createProfile('Bold Ranger');
    for (const w of [6, 6, 17]) expect(recordRace(p, race(w), 3, touch).newEgg).toBeNull();
    expect(p.milestones).not.toContain('speed');
  });

  it('5 WPM over the starting speed earns the egg, below the usual 18 on touch', () => {
    const p = createProfile('Bold Ranger');
    for (const w of [6, 7, 8]) recordRace(p, race(w), 3, touch);
    expect(recordRace(p, race(11.4), 3, touch).newEgg).toBeNull();
    expect(recordRace(p, race(11.6), 3, touch).newEgg).toBe('duneskimmer');
  });

  it('keyboard and touch keep separate starting speeds', () => {
    const p = createProfile('Bold Ranger');
    for (const w of [15, 15, 15]) recordRace(p, race(w), 3, touch);
    // 9 WPM on a keyboard is not 5 over the touch start, and the keyboard start is not set yet.
    for (const w of [4, 4, 4]) recordRace(p, race(w), 3);
    expect(p.startSpeed?.keyboard?.wpm).toBe(4);
    expect(recordRace(p, race(9), 3).newEgg).toBe('duneskimmer');
  });

  it('older saves use their oldest kept races as the start', () => {
    const p = createProfile('Bold Ranger');
    p.races = [12, 11, 10, 9, 8].map((wpm, i) => ({ at: 1000 - i, wpm, accuracy: 0.9, place: 3, input: 'keyboard' as const }));
    const restored = migrate({ profiles: [JSON.parse(JSON.stringify(p))] }).profiles[0];
    expect(recordRace(restored, race(14), 3).newEgg).toBe('duneskimmer');
    expect(restored.startSpeed?.keyboard?.wpm).toBe(9);
  });
});
