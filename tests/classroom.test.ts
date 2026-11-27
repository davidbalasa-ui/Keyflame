import { describe, expect, it } from 'vitest';
import {
  CODE_LETTERS, MAX_QUICK_RACERS, classRaceText, classRiderName, estimateProgress, isClassCode, newRace, normalizeCode, placeFor, quickRacers, raceHost, spacedCode,
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
    expect(teacherRacers([...all, member('d', 4, { status: 'done' })]).map((m) => m.id)).not.toContain('d');
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

describe('class race text for each rider', () => {
  const race = { raceId: 'abc123', text: 'Komodo dragons are the biggest lizards in the world. They smell with their tongues.', factId: 'f1' };
  const homeRow = new Set('asdfghjkl;'.split(''));

  it('gives riders who know every letter the fact, in lowercase until capitals are learned', () => {
    expect(classRaceText(race, new Set(), true, true)).toEqual({ text: race.text, factId: 'f1' });
    expect(classRaceText(race, new Set(), true, false).text).toBe(race.text.toLowerCase());
  });

  it('gives beginners only their letters, the same text for classmates at the same lesson', () => {
    const a = classRaceText(race, homeRow, false, false);
    expect(a.factId).toBeNull();
    expect([...a.text].every((c) => c === ' ' || homeRow.has(c))).toBe(true);
    expect(classRaceText(race, new Set(homeRow), false, false).text).toBe(a.text);
    expect(classRaceText({ ...race, raceId: 'zzz999' }, homeRow, false, false).text).not.toBe(a.text);
  });

  it('keeps a classmate flying until just past their next update in a big race', () => {
    const tick = { progress: 0.2, ms: 10000, at: 0 };
    // 30 racers send about every 15 s; the dragon keeps moving instead of stopping at 3 s.
    expect(estimateProgress(tick, 12000, false, tickEvery(30))).toBeGreaterThan(estimateProgress(tick, 3000, false, tickEvery(30)));
    expect(estimateProgress(tick, 12000, false, 1000)).toBeCloseTo(estimateProgress(tick, 3000, false, 1000));
  });
});
