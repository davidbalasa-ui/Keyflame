import { describe, expect, it } from 'vitest';
import { LESSONS, buildLessonText, buildRaceText } from '../src/content/lessons';
import { PASSAGES } from '../src/content/words';
import { ROWS, TOUCH_ROWS, TOUCH_ROW_INSET, baseKey, fingerFor, keyLabel, touchKeyCenter, touchThumb, typableOnTouch } from '../src/content/keyboard';
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

describe('key labels', () => {
  // David saw capitals on every key with shift off; keys must read lowercase until shift is on.
  it('shows lowercase letters and plain symbols with shift off', () => {
    for (const k of ROWS.flat()) expect(keyLabel(k, false)).toBe(k);
  });

  it('shows capitals and shifted symbols with shift on', () => {
    expect(keyLabel('a', true)).toBe('A');
    expect(keyLabel(';', true)).toBe(':');
    expect(keyLabel('/', true)).toBe('?');
    expect(keyLabel(' ', true)).toBe('space');
  });
});

describe('phone-style tap keyboard', () => {
  it('has every key of the full keyboard, and every row spans ten key widths', () => {
    const keys = TOUCH_ROWS.flat().map((t) => t.k);
    for (const k of [...ROWS.flat(), ' ', 'shift']) expect(keys).toContain(k);
    TOUCH_ROWS.forEach((row, i) => expect(row.reduce((n, t) => n + t.w, 0) + 2 * TOUCH_ROW_INSET[i]).toBe(10));
  });

  it('puts the bottom letter row where a phone keyboard does', () => {
    // On Gboard, Z starts after a 1.5-key shift and M ends before a 1.5-key backspace.
    expect(touchKeyCenter('z')).toBe(2);
    expect(touchKeyCenter('m')).toBe(8);
    expect(touchKeyCenter('a')).toBe(1);
    expect(touchKeyCenter('l')).toBe(9);
  });

  it('names the thumb by where the key is on the phone layout', () => {
    expect(touchThumb(';')).toBe('left');
    expect(touchThumb(',')).toBe('left');
    expect(touchThumb('.')).toBe('right');
    expect(touchThumb('c')).toBe('left');
    expect(touchThumb('n')).toBe('right');
    expect(touchThumb(' ')).toBe('either');
  });
});
