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
