// Kid-safety filter for every piece of practice text the game shows.
// Drills mix random letters, so they can spell rude words by accident
// (a home-row drill once produced "fags"). Every generator re-rolls anything
// this filter rejects, and the typing panel checks again before showing text.
import { PASSAGES, WORDS } from './words';
import { SENTENCES } from './sentences';
import { FACTS } from './facts';

// Roots that must never appear inside generated text, matched anywhere in a token.
// Deliberately broad: a false alarm only means a drill re-rolls a letter group.
const BLOCKED_ROOTS: string[] = [
  'anal', 'anus', 'arse', 'ass', 'azz', 'bich', 'bitch', 'boob', 'butt', 'chink', 'clit', 'cock', 'cok', 'coon',
  'crap', 'cum', 'cunt', 'damn', 'dick', 'dik', 'dildo', 'dyke', 'fag', 'fap', 'fart', 'fck', 'fgt', 'fuc', 'fuk',
  'fuq', 'gay', 'gook', 'hell', 'hoe', 'homo', 'hore', 'jap', 'jew', 'jizz', 'kike', 'kkk', 'kys', 'nazi', 'nig',
  'nip', 'nud', 'pedo', 'pee', 'penis', 'phuk', 'piss', 'poo', 'porn', 'puss', 'queer', 'rape', 'retard', 'sex',
  'shat', 'sht', 'shit', 'slag', 'slut', 'spic', 'suck', 'tit', 'twat', 'vag', 'wank', 'whor', 'wtf', 'kill', 'die',
  'dead', 'stfu', 'kok', 'dck', 'cnt', 'fk', 'jiz',
];

// Real words in facts and sentences that trip a root above but were read and
// cleared by hand. Tests fail on any other flagged word in written content.
export const REVIEWED_WORDS = new Set<string>([
  // ass
  'compass', 'passes', 'passages', 'pass', 'class', 'mass', 'grass', 'glass',
  // butt, die, fart, nig, pee, poo
  'butterflies', 'butterfly', 'bodies', 'farther', 'farthest', 'nights', 'night', 'midnight', 'japan', 'speed', 'spoonful',
  // hoe, die
  'echoes', 'indies', 'horseshoe', 'horseshoes',
  // butt
  'butter', 'buttercup', 'buttons', 'button',
]);

// Hand-reviewed words from our own lists. These are allowed even when a root
// above happens to sit inside them (e.g. "glass", "shell").
const CURATED = new Set<string>([
  ...WORDS,
  ...REVIEWED_WORDS,
  ...[...PASSAGES, ...SENTENCES, ...FACTS.map((f) => f.text)].flatMap((p) => p.split(/\s+/)).map(normalize),
]);

function normalize(token: string): string {
  return token.toLowerCase().replace(/[^a-z]/g, '');
}

/** True if a token contains any blocked root. Ignores the curated list. */
export function hasBlockedRoot(token: string): boolean {
  const t = normalize(token);
  return BLOCKED_ROOTS.some((root) => t.includes(root));
}

/** True if a single word or letter group is safe to show a child. */
export function isSafeToken(token: string): boolean {
  const t = normalize(token);
  if (t.length < 2) return true;
  if (CURATED.has(t)) return true;
  return !hasBlockedRoot(t);
}

/** True if every word in the text is safe. */
export function isSafeText(text: string): boolean {
  const tokens = text.split(/\s+/).filter(Boolean);
  return tokens.every(isSafeToken);
}

/**
 * Replaces any unsafe word with a safe one from `fallback`.
 * If no safe replacement turns up, the word is dropped.
 */
export function safeText(text: string, fallback: () => string = () => ''): string {
  return text
    .split(' ')
    .map((tok) => {
      if (isSafeToken(tok)) return tok;
      for (let i = 0; i < 30; i++) {
        const alt = fallback();
        if (alt && isSafeToken(alt)) return alt;
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

/** Calls `make` until it returns a safe token (or gives up and returns `fallback`). */
export function safeRoll(make: () => string, fallback: string): string {
  for (let i = 0; i < 50; i++) {
    const t = make();
    if (isSafeToken(t)) return t;
  }
  return fallback;
}
