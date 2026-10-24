// True fun facts that kids type once they know every letter, so each race teaches
// something. Every fact is written in our own words, checked against a source, and
// reviewed for kids before it ships; tests check characters, length and safety.
import RAW from './facts/facts.json';

export type ReadingLevel = 'younger' | 'older';
export type FactTopic = 'dragons' | 'animals' | 'space' | 'earth' | 'weather' | 'oceans';

export interface Fact {
  id: string;
  topic: FactTopic;
  level: ReadingLevel;
  text: string;
  source: { name: string; url: string };
  /** Review note: 'ok', 'weak source' (a better page would help) or 'recheck'. */
  check?: string;
}

export const FACTS: Fact[] = RAW as Fact[];

export const TOPIC_LABEL: Record<FactTopic, string> = {
  dragons: 'Real dragons and lizards',
  animals: 'Amazing animals',
  space: 'Space',
  earth: 'Volcanoes, rocks and Earth',
  weather: 'Weather',
  oceans: 'Oceans',
};

export const READING_LEVEL_LABEL: Record<ReadingLevel, string> = {
  younger: 'Younger reader (about 7 to 9)',
  older: 'Older reader (about 10 to 13)',
};

/** Characters the tap keyboard can type (shift gives : and ?). Content must stay inside this set. */
export const TYPEABLE = /^[A-Za-z ,.;:/?]+$/;

/** Facts are also typed in lowercase before Shift is taught, so they avoid : and ? too. */
export const FACT_CHARS = /^[A-Za-z ,.;]+$/;

export function factById(id: string): Fact | undefined {
  return FACTS.find((f) => f.id === id);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Picks the next fact for a reader: one they have not seen yet if possible,
 * otherwise the one they saw longest ago. Among equals, facts that use the
 * player's weak keys more often win, so racing still practises what they miss.
 */
export function pickFact(level: ReadingLevel, seen: string[], weak: string[] = [], rand: () => number = Math.random): Fact {
  const pool = FACTS.filter((f) => f.level === level);
  const order = new Map(seen.map((id, i) => [id, i]));
  const unseen = pool.filter((f) => !order.has(f.id));
  let choices: Fact[];
  if (unseen.length) choices = unseen;
  else {
    // Oldest third of what they have seen.
    const sorted = [...pool].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    choices = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3)));
  }
  if (weak.length) {
    const score = (f: Fact): number => [...f.text.toLowerCase()].filter((c) => weak.includes(c)).length / f.text.length;
    const ranked = [...choices].sort((a, b) => score(b) - score(a));
    choices = ranked.slice(0, Math.max(3, Math.ceil(ranked.length / 2)));
  }
  return choices[Math.floor(rand() * choices.length)];
}
