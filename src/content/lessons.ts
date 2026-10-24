import { PASSAGES } from './words';
import { DRILLS, SENTENCES } from './sentences';
import { pickFact } from './facts';
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
  { id: 'sentences', title: 'Sky Stories', blurb: 'Capitals, commas, and real stories.', reward: 'shadeglide' },
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

/** Hand-written sentences that only use these keys. */
export function sentencesFor(keys: Set<string>): string[] {
  return SENTENCES.filter((s) => [...s].every((c) => c === ' ' || keys.has(c)));
}

/** Joins lines with the best mark the player knows: a period, else a semicolon, else a space. */
function joinLines(lines: string[], keys: Set<string>): string {
  if (keys.has('.')) return lines.join('. ') + '.';
  return lines.join(keys.has(';') ? '; ' : ' ');
}

/**
 * Picks lines until there are at least `words` words, without repeating a line
 * until the pool runs out. Lines with focus keys (new or weak keys) come up more.
 */
function chooseLines(pool: string[], focus: string[], words: number, rand: () => number): string[] {
  const out: string[] = [];
  let left = [...pool];
  let count = 0;
  while (count < words && pool.length) {
    if (!left.length) left = [...pool];
    const hot = focus.length ? left.filter((l) => focus.some((k) => l.includes(k))) : [];
    const from = hot.length && rand() < 0.7 ? hot : left;
    const line = pick(from, rand);
    left = left.filter((l) => l !== line);
    out.push(line);
    count += line.split(' ').length;
  }
  return out;
}

/**
 * Builds the practice text for a lesson. The first lessons use fixed key patterns,
 * later ones use hand-written sentences from the keys learned so far, and the last
 * lessons use real facts and stories. Nothing mixes random letters.
 */
export function buildLessonText(lesson: Lesson, weak: string[] = [], rand: () => number = Math.random): string {
  if (lesson.kind === 'passage') {
    if (lesson.title === 'Capital Letters') return pickFact('younger', [], weak, rand).text;
    return pick(PASSAGES.slice(4), rand);
  }
  const drill = DRILLS[lesson.id];
  if (drill) {
    const lines = [...drill].sort(() => rand() - 0.5).slice(0, 3);
    return lines.join(' ');
  }
  if (lesson.title === 'All Letters') {
    const a = pickFact('younger', [], weak, rand);
    const b = pickFact('younger', [a.id], weak, rand);
    return `${a.text} ${b.text}`.toLowerCase();
  }
  const keys = new Set(lesson.keys);
  const focus = [...lesson.newKeys.filter((k) => k !== ' '), ...weak.filter((k) => keys.has(k))];
  return joinLines(chooseLines(sentencesFor(keys), focus, lesson.kind === 'words' ? 18 : 14, rand), keys);
}

/** Race text from hand-written sentences that only use letters the player has learned. */
export function buildRaceText(knownLetters: Set<string>, wordCount: number, rand: () => number = Math.random): string {
  return joinLines(chooseLines(sentencesFor(knownLetters), [], wordCount, rand), knownLetters);
}

/** Stars earned: 1 for passing, 2 for 95% accuracy, 3 for 95% accuracy and the WPM goal. */
export function starsFor(lesson: Lesson, wpm: number, accuracy: number): number {
  if (accuracy < 0.9) return 0;
  if (accuracy >= 0.95 && wpm >= lesson.starWpm) return 3;
  if (accuracy >= 0.95) return 2;
  return 1;
}
