import { describe, expect, it } from 'vitest';
import { FACTS, FACT_CHARS, TOUCH_MAX_WORDS, pickFact, wordCount } from '../src/content/facts';
import { DRILLS, SENTENCES } from '../src/content/sentences';
import { LESSONS, buildLessonText, buildRaceText, sentencesFor } from '../src/content/lessons';
import { REVIEWED_WORDS, hasBlockedRoot, isSafeText } from '../src/content/safety';
import { WORDS } from '../src/content/words';
import { seededRandom } from '../src/game/dragons';

const KNOWN_OK = new Set([...WORDS, ...REVIEWED_WORDS]);
const tokens = (text: string): string[] => text.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);

/** Words that trip the strict root check and were not reviewed by hand. */
function flagged(text: string): string[] {
  return tokens(text).filter((t) => hasBlockedRoot(t) && !KNOWN_OK.has(t));
}

/** A rough reading grade (Flesch-Kincaid) using a simple syllable count. */
function grade(text: string): number {
  const words = tokens(text);
  const sentences = Math.max(1, text.split(/[.;?]+/).filter((s) => s.trim()).length);
  const syllables = words.reduce((n, w) => n + Math.max(1, (w.replace(/e$/, '').match(/[aeiouy]+/g) ?? []).length), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}

describe('fun facts', () => {
  it('has ids that are unique and well formed', () => {
    const ids = FACTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(FACTS.length).toBeGreaterThanOrEqual(150);
  });

  it('only uses characters the tap keyboard can type', () => {
    for (const f of FACTS) expect(FACT_CHARS.test(f.text), `${f.id}: ${f.text}`).toBe(true);
  });

  it('has no unreviewed word that trips the safety check', () => {
    for (const f of FACTS) expect(flagged(f.text), f.id).toEqual([]);
    for (const f of FACTS) expect(isSafeText(f.text), f.id).toBe(true);
  });

  it('fits each reading level', () => {
    for (const f of FACTS) {
      const n = wordCount(f.text);
      const longest = Math.max(...tokens(f.text).map((t) => t.length));
      const perSentence = Math.max(...f.text.split(/[.;?]/).map(wordCount));
      if (f.level === 'younger') {
        expect(n, f.id).toBeGreaterThanOrEqual(8);
        expect(n, f.id).toBeLessThanOrEqual(26);
        expect(perSentence, f.id).toBeLessThanOrEqual(20);
        expect(longest, f.id).toBeLessThanOrEqual(11);
        expect(grade(f.text), f.id).toBeLessThanOrEqual(8);
      } else {
        expect(n, f.id).toBeGreaterThanOrEqual(14);
        expect(n, f.id).toBeLessThanOrEqual(40);
        expect(perSentence, f.id).toBeLessThanOrEqual(26);
        expect(longest, f.id).toBeLessThanOrEqual(13);
        expect(grade(f.text), f.id).toBeLessThanOrEqual(12);
      }
    }
  });

  it('has a source for every fact', () => {
    for (const f of FACTS) {
      expect(f.source.name, f.id).not.toBe('');
      expect(f.source.url, f.id).toMatch(/^https:\/\//);
    }
  });

  it('never repeats a fact text', () => {
    const texts = FACTS.map((f) => f.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('picks unseen facts first, at the right level', () => {
    const rand = seededRandom(5);
    const seen: string[] = [];
    const younger = FACTS.filter((f) => f.level === 'younger').length;
    for (let i = 0; i < younger; i++) {
      const f = pickFact('younger', seen, ['q', 'z'], rand);
      expect(f.level).toBe('younger');
      expect(seen).not.toContain(f.id);
      seen.push(f.id);
    }
    expect(seen.includes(pickFact('younger', seen, [], rand).id)).toBe(true);
  });

  it('gives touch typists the shorter facts', () => {
    const rand = seededRandom(9);
    for (const level of ['younger', 'older'] as const) {
      for (let i = 0; i < 300; i++) expect(wordCount(pickFact(level, [], [], rand, true).text)).toBeLessThanOrEqual(TOUCH_MAX_WORDS[level]);
      expect(FACTS.filter((f) => f.level === level && wordCount(f.text) <= TOUCH_MAX_WORDS[level]).length).toBeGreaterThanOrEqual(100);
    }
  });
});

describe('lesson sentences', () => {
  it('are lowercase, typeable and pass the safety check', () => {
    for (const s of SENTENCES) {
      expect(/^[a-z ,;/]+$/.test(s), s).toBe(true);
      expect(flagged(s), s).toEqual([]);
    }
    for (const lines of Object.values(DRILLS)) for (const l of lines) for (const t of l.split(' ')) expect(hasBlockedRoot(t), t).toBe(false);
  });

  it('give every lesson after the drills enough real sentences', () => {
    for (const l of LESSONS) {
      if (DRILLS[l.id] || l.kind === 'passage' || l.title === 'All Letters') continue;
      const pool = sentencesFor(new Set(l.keys));
      expect(pool.length, l.title).toBeGreaterThanOrEqual(8);
      const fresh = l.newKeys.filter((k) => k !== ' ');
      if (fresh.length) expect(pool.some((s) => fresh.some((k) => s.includes(k))), l.title).toBe(true);
    }
  });

  it('only drills use bare letter patterns, and only in the first three lessons', () => {
    expect(Object.keys(DRILLS)).toEqual(['L1', 'L2', 'L3']);
    for (const id of Object.keys(DRILLS)) {
      const keys = new Set(LESSONS.find((l) => l.id === id)!.keys);
      for (const line of DRILLS[id]) for (const c of line) expect(keys.has(c), `${id}: ${c}`).toBe(true);
    }
  });

  it('builds lesson and race text only from learned keys', () => {
    for (const l of LESSONS) {
      const rand = seededRandom(l.id.length * 31 + 7);
      for (let i = 0; i < 200; i++) {
        const text = buildLessonText(l, i % 2 ? [] : l.keys.slice(0, 2), rand);
        expect(text.length, l.title).toBeGreaterThan(10);
        expect(isSafeText(text), text).toBe(true);
        if (l.kind !== 'passage') for (const c of text) expect(l.keys.includes(c), `${l.title}: "${c}" in ${text}`).toBe(true);
      }
    }
    const home = new Set('asdfghjkl'.split(''));
    const rand = seededRandom(3);
    for (let i = 0; i < 200; i++) {
      const text = buildRaceText(home, 14, rand);
      for (const c of text) expect(c === ' ' || home.has(c), text).toBe(true);
      expect(text.split(' ').length).toBeGreaterThanOrEqual(14);
    }
  }, 60000);
});

describe('one-typo safety', () => {
  // A dropped letter can turn a clean word into a rude one ("flag" once could have).
  const BAD = new Set(['fag', 'fags', 'shit', 'fuck', 'cock', 'cunt', 'dick', 'sex', 'slut', 'twat', 'piss', 'tits', 'cum', 'damn', 'crap', 'dyke', 'homo', 'rape', 'whore', 'bitch', 'nazi', 'porn', 'boob', 'butt', 'poop', 'penis', 'kkk', 'fart']);
  it('no word in facts or sentences becomes a rude word by dropping one letter', () => {
    for (const text of [...FACTS.map((f) => f.text), ...SENTENCES])
      for (const w of tokens(text))
        for (let i = 0; i < w.length; i++) expect(BAD.has(w.slice(0, i) + w.slice(i + 1)), `${w} in "${text}"`).toBe(false);
  });
});
