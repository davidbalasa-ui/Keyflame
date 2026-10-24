import { describe, expect, it } from 'vitest';
import { LESSONS, buildLessonText, buildRaceText } from '../src/content/lessons';
import { PASSAGES } from '../src/content/words';
import { ROWS, baseKey, fingerFor, typableOnTouch } from '../src/content/keyboard';
import { seededRandom } from '../src/game/dragons';

const untypable = (text: string): string[] => [...new Set([...text].filter((c) => !typableOnTouch(c)))];

describe('tap keyboard coverage', () => {
  // Typing stops on a wrong key, so one character without a key leaves a phone player stuck.
  it('can type every passage', () => {
    for (const p of PASSAGES) expect(untypable(p), p).toEqual([]);
  });

  it('can type every generated lesson and race', () => {
    const all = new Set(ROWS.flat());
    for (let seed = 1; seed <= 40; seed++) {
      const rand = seededRandom(seed);
      for (const lesson of LESSONS) {
        const text = buildLessonText(lesson, [], rand);
        expect(untypable(text), `${lesson.id}: ${text}`).toEqual([]);
      }
      expect(untypable(buildRaceText(all, 22, rand))).toEqual([]);
    }
  });

  it('has no key for apostrophes, dashes, digits or quotes yet', () => {
    for (const c of ["'", '-', '1', '"', '!', '“']) expect(typableOnTouch(c)).toBe(false);
  });
});

describe('finger hints', () => {
  it('maps shifted symbols to their real base key', () => {
    expect(baseKey(':')).toBe(';');
    expect(baseKey('?')).toBe('/');
    expect(baseKey('A')).toBe('a');
    expect(baseKey('"')).toBe("'");
    expect(baseKey("'")).toBe("'");
  });

  it('gives the right finger for the number row and apostrophe', () => {
    expect(fingerFor('1')).toBe('left-pinky');
    expect(fingerFor('!')).toBe('left-pinky');
    expect(fingerFor('5')).toBe('left-index');
    expect(fingerFor("'")).toBe('right-pinky');
    expect(fingerFor(' ')).toBe('thumb');
  });
});
