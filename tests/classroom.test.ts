import { describe, expect, it } from 'vitest';
import {
  CODE_LETTERS, MAX_QUICK_RACERS, classRiderName, estimateProgress, isClassCode, newRace, normalizeCode, placeFor, quickRacers, raceHost, spacedCode,
  teacherRacers, tickEvery, waitingRiders, type Member,
} from '../src/game/classroom';
import { isSafeText } from '../src/content/safety';
import { typableOnTouch } from '../src/content/keyboard';

const member = (id: string, since: number, extra: Partial<Member> = {}): Member => ({ id, name: 'Brave Comet', look: null, role: 'rider', status: 'waiting', touch: true, since, ...extra });

describe('class codes', () => {
  it('normalizes what kids type', () => {
    expect(normalizeCode(' bxt-krp ')).toBe('BXTKRP');
    expect(normalizeCode('bxt krp zz')).toBe('BXTKRP');
    expect(isClassCode('BXTKRP')).toBe(true);
    expect(isClassCode('BXTKR')).toBe(false);
    expect(isClassCode('BATKRP')).toBe(false);
    expect(spacedCode('BXTKRP')).toBe('BXT KRP');
  });

  it('uses no vowels, so a code never spells a word', () => {
    expect(CODE_LETTERS).not.toMatch(/[AEIOUY]/);
    expect(CODE_LETTERS).toHaveLength(20);
  });
});

describe('rider names in class', () => {
  it('passes preset names and hides anything else', () => {
    expect(classRiderName('Brave Comet')).toBe('Brave Comet');
    expect(classRiderName('  Swift   Ember ')).toBe('Swift Ember');
    expect(classRiderName('Jane Smith')).toBe('Rider');
    expect(classRiderName('Brave Comet Extra')).toBe('Rider');
    expect(classRiderName('')).toBe('Rider');
  });
});

describe('starting races', () => {
  it('lets the rider who waited longest host, so all devices agree', () => {
    const a = member('b', 200);
    const b = member('a', 100);
    const c = member('c', 100);
    expect(raceHost([a, b, c])?.id).toBe('a');
    expect(raceHost([c, a])?.id).toBe('c');
    expect(raceHost([])).toBeNull();
  });

  it('only counts ready riders, and caps quick races', () => {
    const all = [member('t', 1, { role: 'teacher' }), member('l', 2, { status: 'lobby' }), ...Array.from({ length: 9 }, (_, i) => member(`w${i}`, 10 + i))];
    expect(waitingRiders(all)).toHaveLength(9);
    expect(quickRacers(waitingRiders(all)).map((m) => m.id)).toEqual(['w0', 'w1', 'w2', 'w3', 'w4', 'w5'].slice(0, MAX_QUICK_RACERS));
    expect(teacherRacers([...all, member('r', 3, { status: 'racing' })]).map((m) => m.id)).not.toContain('r');
    expect(teacherRacers(all).map((m) => m.id)).not.toContain('t');
  });

  it('gives everyone the same short, safe, tap-keyboard text', () => {
    let seed = 1;
    const rand = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 300; i++) {
      const race = newRace([member('a', 1), member('b', 2)], rand);
      expect(race.racers).toEqual(['a', 'b']);
      expect(isSafeText(race.text)).toBe(true);
      expect([...race.text].every(typableOnTouch)).toBe(true);
      expect(race.text.split(/\s+/).length).toBeLessThanOrEqual(20);
    }
  });
});

describe('places and progress', () => {
  it('ranks by finish time, ignoring riders still flying', () => {
    expect(placeFor(5000, [])).toBe(1);
    expect(placeFor(5000, [4000, null, 6000])).toBe(2);
    expect(placeFor(5000, [1000, 2000])).toBe(3);
  });

  it('keeps a classmate flying between updates without passing the line early', () => {
    const tick = { progress: 0.5, ms: 10000, at: 1000 };
    expect(estimateProgress(null, 5000, false)).toBe(0);
    expect(estimateProgress(tick, 1000, false)).toBe(0.5);
    expect(estimateProgress(tick, 2000, false)).toBeCloseTo(0.55);
    expect(estimateProgress(tick, 60000, false)).toBeLessThan(1);
    expect(estimateProgress(tick, 60000, true)).toBe(1);
  });

  it('sends less often in big races', () => {
    expect(tickEvery(2)).toBe(1000);
    expect(tickEvery(25)).toBeGreaterThan(5000);
  });
});
