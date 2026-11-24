import { describe, expect, it } from 'vitest';
import { TypingSession } from '../src/engine/typing';
import { buildRaceText } from '../src/content/lessons';
import { FIRST_HATCH_KEYS, RACE_STEP_WPM, TOUCH_SPEED_FACTOR, eggProgress, factsUnlocked, hatchNeed, keysToHatch, knownLetters, raceLetters, recordRace } from '../src/game/progress';
import { TRIBES, seededRandom } from '../src/game/dragons';
import { createProfile, STARGLINT_ID, type RaceRecord } from '../src/save/store';
import { typableOnTouch } from '../src/content/keyboard';

const race = (wpm: number, accuracy = 0.97, input: RaceRecord['input'] = 'keyboard'): RaceRecord => ({ at: Date.now(), wpm, accuracy, place: 1, input });

describe('accuracy counts each letter once', () => {
  it('pressing the same wrong key again does not lower accuracy further', () => {
    const s = new TypingSession('ab');
    s.type('x', 0);
    s.type('x', 10);
    s.type('z', 20);
    s.type('a', 30);
    s.type('b', 40);
    expect(s.errors).toBe(1);
    expect(s.accuracy()).toBeCloseTo(2 / 3);
    expect(s.keyStats.a.misses).toBe(1);
  });

  it('a miss on a later letter still counts', () => {
    const s = new TypingSession('ab');
    s.type('x', 0);
    s.type('a', 10);
    s.type('x', 20);
    s.type('b', 30);
    expect(s.errors).toBe(2);
    expect(s.accuracy()).toBeCloseTo(0.5);
  });
});

describe('first egg hatches fast', () => {
  it('needs far fewer keys before any dragon has hatched', () => {
    const p = createProfile('Brave Comet');
    expect(p.nest?.tribe).toBe('emberback');
    expect(hatchNeed(p, 'emberback')).toBe(FIRST_HATCH_KEYS);
    expect(FIRST_HATCH_KEYS).toBeLessThan(TRIBES.emberback.hatchKeys / 2);
    p.nest!.warmth = 60;
    expect(eggProgress(p)).toBeCloseTo(0.5);
    expect(keysToHatch(p)).toBe(60);
  });

  it('a supporter Starglint does not count as the first dragon', () => {
    const p = createProfile('Brave Comet');
    p.dragons.push({ id: STARGLINT_ID, tribe: 'stormcrest', palette: 0, name: 'Starglint', xp: 0, hatchedAt: 0, skin: 'starglint' });
    expect(hatchNeed(p, 'emberback')).toBe(FIRST_HATCH_KEYS);
  });

  it('goes back to the tribe count once a dragon has hatched', () => {
    const p = createProfile('Brave Comet');
    p.dragons.push({ id: 'd1', tribe: 'emberback', palette: 0, name: 'Ash', xp: 0, hatchedAt: 0 });
    expect(hatchNeed(p, 'emberback')).toBe(TRIBES.emberback.hatchKeys);
  });

  it('a first race and lesson can hatch it', () => {
    const p = createProfile('Brave Comet');
    const keys = FIRST_HATCH_KEYS;
    recordRace(p, { wpm: 12, accuracy: 0.95, correct: keys, errors: 3, durationMs: 60000, keyStats: {} }, 1);
    expect(eggProgress(p)).toBe(1);
  });
});

describe('race letters grow with speed', () => {
  it('stays on learned letters for a new or slow rider', () => {
    const p = createProfile('Brave Comet');
    expect(raceLetters(p, 'keyboard')).toEqual(knownLetters(p));
    p.races = [race(RACE_STEP_WPM.top - 1)];
    expect(raceLetters(p, 'keyboard')).toEqual(knownLetters(p));
  });

  it('adds the top row, then every letter, for fast accurate typists', () => {
    const p = createProfile('Brave Comet');
    p.races = [race(RACE_STEP_WPM.top + 1)];
    const top = raceLetters(p, 'keyboard');
    expect(top.has('e') && top.has('t') && top.has('o')).toBe(true);
    expect(top.has('m')).toBe(false);
    expect(factsUnlocked(p, top)).toBe(false);
    p.races = [race(RACE_STEP_WPM.all + 5), race(RACE_STEP_WPM.all + 5)];
    const all = raceLetters(p, 'keyboard');
    expect(factsUnlocked(p, all)).toBe(true);
    // Lessons are untouched: they still teach the letters in order.
    expect(knownLetters(p).has('e')).toBe(false);
  });

  it('ignores sloppy races and keeps touch and keyboard apart', () => {
    const p = createProfile('Brave Comet');
    p.races = [race(40, 0.8)];
    expect(raceLetters(p, 'keyboard')).toEqual(knownLetters(p));
    p.races = [race(40)];
    expect(raceLetters(p, 'touch')).toEqual(knownLetters(p));
    p.races = [race(RACE_STEP_WPM.top * TOUCH_SPEED_FACTOR + 0.5, 0.97, 'touch')];
    expect(raceLetters(p, 'touch').has('e')).toBe(true);
  });

  it('widened race text stays typeable on the tap keyboard and varied', () => {
    const p = createProfile('Brave Comet');
    p.races = [race(RACE_STEP_WPM.top + 1)];
    const letters = raceLetters(p, 'keyboard');
    const rand = seededRandom(9);
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const text = buildRaceText(letters, 14, rand);
      for (const c of text) expect(c === ' ' || letters.has(c) || c === ';', text).toBe(true);
      expect([...text].every((c) => typableOnTouch(c)), text).toBe(true);
      seen.add(text);
    }
    expect(seen.size).toBeGreaterThan(25);
  });
});

describe('earned eggs are never blocked', () => {
  it('reward eggs still land in the basket past the three-egg buying limit', async () => {
    const { giveEgg } = await import('../src/game/progress');
    const { MAX_BASKET, canBuyEgg } = await import('../src/game/collection');
    const p = createProfile('Brave Comet');
    p.dragons.push({ id: 'd1', tribe: 'emberback', palette: 0, name: 'Ash', xp: 0, hatchedAt: 0 });
    p.embers = 1000;
    for (let i = 0; i < MAX_BASKET + 2; i++) giveEgg(p, 'tidefin');
    expect(p.basket.length).toBe(MAX_BASKET + 2);
    expect(canBuyEgg(p, 'emberback')).toBe('full');
  });
});
