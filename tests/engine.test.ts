import { describe, expect, it } from 'vitest';
import { TypingSession, computeWpm, weakKeys } from '../src/engine/typing';
import { LESSONS, buildLessonText, buildRaceText, starsFor } from '../src/content/lessons';
import { createProfile, exportBackupCode, importBackupCode, migrate } from '../src/save/store';
import { checkUnitReward, eggProgress, ghostProgress, hatchEgg, knownLetters, recordLesson, recordRace } from '../src/game/progress';
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
