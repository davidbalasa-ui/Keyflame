import { PASSAGES, wordsFrom } from './words';
import type { TribeId } from '../game/dragons';

export interface Lesson {
  id: string;
  unit: UnitId;
  title: string;
  /** Keys introduced by this lesson. */
  newKeys: string[];
  /** Every key the lesson may use. */
  keys: string[];
  kind: 'drill' | 'words' | 'passage';
  /** WPM needed for the third star. */
  starWpm: number;
}

export type UnitId = 'home' | 'top' | 'bottom' | 'sentences';

export interface Unit {
  id: UnitId;
  title: string;
  blurb: string;
  /** Egg awarded when every lesson in the unit is passed. */
  reward: TribeId;
}

export const UNITS: Unit[] = [
  { id: 'home', title: 'Home Row', blurb: 'Where your fingers rest. Every dragon starts here.', reward: 'tidefin' },
  { id: 'top', title: 'Top Row', blurb: 'Reach up into the clouds.', reward: 'stormcrest' },
  { id: 'bottom', title: 'Bottom Row', blurb: 'Dig down into the forest floor.', reward: 'mossclaw' },
  { id: 'sentences', title: 'Sky Stories', blurb: 'Capitals, commas, and real stories.', reward: 'emberback' },
];

const steps: Array<[UnitId, string, string[], Lesson['kind'], number]> = [
  ['home', 'F and J', ['f', 'j', ' '], 'drill', 10],
  ['home', 'D and K', ['d', 'k'], 'drill', 10],
  ['home', 'S and L', ['s', 'l'], 'drill', 12],
  ['home', 'A and ;', ['a', ';'], 'drill', 12],
  ['home', 'G and H', ['g', 'h'], 'drill', 12],
  ['home', 'Home Row Words', [], 'words', 14],
  ['top', 'E and I', ['e', 'i'], 'drill', 12],
  ['top', 'R and U', ['r', 'u'], 'drill', 12],
  ['top', 'T and Y', ['t', 'y'], 'drill', 13],
  ['top', 'W and O', ['w', 'o'], 'drill', 13],
  ['top', 'Q and P', ['q', 'p'], 'drill', 13],
  ['top', 'Top Row Words', [], 'words', 15],
  ['bottom', 'V and M', ['v', 'm'], 'drill', 13],
  ['bottom', 'C and Comma', ['c', ','], 'drill', 13],
  ['bottom', 'X and Period', ['x', '.'], 'drill', 13],
  ['bottom', 'B and N', ['b', 'n'], 'drill', 14],
  ['bottom', 'Z and /', ['z', '/'], 'drill', 14],
  ['bottom', 'All Letters', [], 'words', 16],
  ['sentences', 'Capital Letters', [], 'passage', 15],
  ['sentences', 'Dragon Tales', [], 'passage', 16],
];

export const LESSONS: Lesson[] = (() => {
  const known: string[] = [];
  return steps.map(([unit, title, newKeys, kind, starWpm], i) => {
    known.push(...newKeys);
    return { id: `L${i + 1}`, unit, title, newKeys, keys: [...known], kind, starWpm };
  });
})();

export function lessonsInUnit(unit: UnitId): Lesson[] {
  return LESSONS.filter((l) => l.unit === unit);
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function chunk(keys: string[], len: number, rand: () => number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += pick(keys, rand);
  return s;
}

/**
 * Builds the practice text for a lesson. New keys and the player's weak keys
 * show up more often, and real words are mixed in once enough letters are known.
 */
export function buildLessonText(lesson: Lesson, weak: string[] = [], rand: () => number = Math.random): string {
  const letters = lesson.keys.filter((k) => k !== ' ');
  if (lesson.kind === 'passage') {
    const pool = lesson.title === 'Capital Letters' ? PASSAGES.slice(0, 4) : PASSAGES.slice(4);
    return pick(pool, rand);
  }
  const words = wordsFrom(new Set(letters));
  const focus = [...lesson.newKeys.filter((k) => k !== ' '), ...weak.filter((k) => letters.includes(k))];
  const parts: string[] = [];
  const target = lesson.kind === 'words' ? 18 : 14;
  while (parts.length < target) {
    const r = rand();
    if (lesson.kind === 'words' && words.length >= 8) {
      parts.push(pick(words, rand));
    } else if (focus.length && r < 0.45) {
      const a = pick(focus, rand);
      const b = pick(focus, rand);
      parts.push(r < 0.2 ? a.repeat(3) : `${a}${b}${a}`);
    } else if (words.length >= 4 && r < 0.75) {
      parts.push(pick(words, rand));
    } else {
      parts.push(chunk(letters, 3 + Math.floor(rand() * 2), rand));
    }
  }
  return parts.join(' ');
}

/** Race text using only letters the player has learned, so beginners can race too. */
export function buildRaceText(knownLetters: Set<string>, wordCount: number, rand: () => number = Math.random): string {
  const words = wordsFrom(knownLetters);
  if (words.length >= 12) {
    return Array.from({ length: wordCount }, () => pick(words, rand)).join(' ');
  }
  const letters = [...knownLetters].filter((k) => /[a-z;]/.test(k));
  return Array.from({ length: wordCount }, () => (words.length && rand() < 0.5 ? pick(words, rand) : chunk(letters, 3, rand))).join(' ');
}

/** Stars earned: 1 for passing, 2 for 95% accuracy, 3 for 95% accuracy and the WPM goal. */
export function starsFor(lesson: Lesson, wpm: number, accuracy: number): number {
  if (accuracy < 0.9) return 0;
  if (accuracy >= 0.95 && wpm >= lesson.starWpm) return 3;
  if (accuracy >= 0.95) return 2;
  return 1;
}
