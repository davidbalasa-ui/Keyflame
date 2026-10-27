// QWERTY layout with the finger that should press each key.

export type Finger =
  | 'left-pinky'
  | 'left-ring'
  | 'left-middle'
  | 'left-index'
  | 'thumb'
  | 'right-index'
  | 'right-middle'
  | 'right-ring'
  | 'right-pinky';

export const FINGER_LABEL: Record<Finger, string> = {
  'left-pinky': 'left pinky',
  'left-ring': 'left ring finger',
  'left-middle': 'left middle finger',
  'left-index': 'left pointer finger',
  thumb: 'either thumb',
  'right-index': 'right pointer finger',
  'right-middle': 'right middle finger',
  'right-ring': 'right ring finger',
  'right-pinky': 'right pinky',
};

export const ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

const COLUMN_FINGERS: Finger[] = [
  'left-pinky',
  'left-ring',
  'left-middle',
  'left-index',
  'left-index',
  'right-index',
  'right-index',
  'right-middle',
  'right-ring',
  'right-pinky',
];

const FINGER_OF: Record<string, Finger> = { ' ': 'thumb', "'": 'right-pinky', '-': 'right-pinky' };
ROWS.forEach((row) => row.forEach((k, i) => (FINGER_OF[k] = COLUMN_FINGERS[i])));
// The number row isn't on the game's keyboard, but physical-keyboard hints still need fingers.
'1234567890'.split('').forEach((k, i) => (FINGER_OF[k] = COLUMN_FINGERS[i]));

/** Shifted characters map to their base key. */
const SHIFTED: Record<string, string> = { ':': ';', '<': ',', '>': '.', '?': '/', '!': '1', '"': "'", _: '-' };

/** Every character the game's tap keyboard can type (letters in both cases, the four symbol keys and their shifts). */
const TOUCH_TYPABLE = new Set([' ', ...ROWS.flat(), ...ROWS.flat().map((k) => k.toUpperCase()), ':', '<', '>', '?']);

/** False for characters a tap-keyboard player has no key for. Typing stops on errors, so lesson text must pass this. */
export function typableOnTouch(ch: string): boolean {
  return TOUCH_TYPABLE.has(ch);
}

export function baseKey(ch: string): string {
  if (SHIFTED[ch]) return SHIFTED[ch];
  return ch.toLowerCase();
}

export function fingerFor(ch: string): Finger {
  return FINGER_OF[baseKey(ch)] ?? 'right-pinky';
}

export const HOME_KEYS = new Set(['a', 's', 'd', 'f', 'j', 'k', 'l', ';']);

/** What a symbol key types with shift on. */
export const SHIFT_SYMBOL: Record<string, string> = { ';': ':', ',': '<', '.': '>', '/': '?' };

/** The label on an on-screen key: lowercase like a phone keyboard, capitals and symbols only while shift is on. */
export function keyLabel(k: string, shifted: boolean): string {
  if (k === ' ') return 'space';
  return shifted ? (SHIFT_SYMBOL[k] ?? k.toUpperCase()) : k;
}

/** A key on the phone-style tap keyboard; w is its width in letter-key units (a row is 10 units). */
export interface TouchKey {
  k: string;
  w: number;
}

/**
 * The tap keyboard follows a standard phone layout (Gboard, Samsung Keyboard): the middle row
 * is inset by half a key, shift and z..m sit where a phone puts them, and the symbols live
 * around the space bar. 'shift' is the shift key.
 */
export const TOUCH_ROWS: TouchKey[][] = [
  ROWS[0].map((k) => ({ k, w: 1 })),
  ROWS[1].filter((k) => k !== ';').map((k) => ({ k, w: 1 })),
  [{ k: 'shift', w: 1.5 }, ...'zxcvbnm'.split('').map((k) => ({ k, w: 1 })), { k: '/', w: 1.5 }],
  [{ k: ';', w: 1.5 }, { k: ',', w: 1 }, { k: ' ', w: 6 }, { k: '.', w: 1.5 }],
];

/** Indent of each touch row, in key units, so the middle row sits half a key in. */
export const TOUCH_ROW_INSET = [0, 0.5, 0, 0];

/** Where a key's centre sits across the tap keyboard, from 0 (left edge) to 10 (right edge). */
export function touchKeyCenter(ch: string): number | null {
  const base = baseKey(ch);
  for (const [r, row] of TOUCH_ROWS.entries()) {
    let x = TOUCH_ROW_INSET[r];
    for (const key of row) {
      if (key.k === base) return x + key.w / 2;
      x += key.w;
    }
  }
  return null;
}

/** Which thumb reaches a key on the tap keyboard. */
export function touchThumb(ch: string): 'left' | 'right' | 'either' {
  if (ch === ' ') return 'either';
  const x = touchKeyCenter(ch);
  if (x === null) return fingerFor(ch).startsWith('left') ? 'left' : 'right';
  return x < 5 ? 'left' : 'right';
}

/**
 * Phone and tablet keyboards swap in curly quotes and long dashes ("smart punctuation"),
 * and no web page setting turns that off on an iPad. Typing stops on a wrong key, so
 * read them as the plain characters the lesson text uses.
 */
const PLAIN: Record<string, string> = {
  '\u2018': "'", '\u2019': "'", '\u201A': "'", '\u2032': "'",
  '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u2033': '"',
  '\u2013': '-', '\u2014': '-', '\u2212': '-',
  '\u00A0': ' ',
};

export function plainText(typed: string): string {
  return [...typed].map((c) => (c === '\u2026' ? '...' : (PLAIN[c] ?? c))).join('');
}
