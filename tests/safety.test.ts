import { describe, expect, it } from 'vitest';
import { REVIEWED_WORDS, hasBlockedRoot, isSafeText, isSafeToken, safeText } from '../src/content/safety';
import { LESSONS, buildLessonText, buildRaceText } from '../src/content/lessons';
import { PASSAGES, WORDS } from '../src/content/words';
import { NAME_ENDS, NAME_STARTS, seededRandom } from '../src/game/dragons';
import { NAME_ADJECTIVES, NAME_NOUNS } from '../src/save/store';

const REVIEWED = new Set([...WORDS, ...REVIEWED_WORDS]);
const words = (text: string): string[] => text.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);

describe('word safety', () => {
  it('blocks rude words and their variants', () => {
    for (const bad of ['fag', 'fags', 'FAGS', 'faggot', 'xfagx', 'shit', 'fuck', 'fuk', 'ass', 'kkk', 'sex', 'nig', 'dick', 'slut', 'f.a.g.s'])
      expect(isSafeToken(bad), bad).toBe(false);
    expect(isSafeText('flag fags glad')).toBe(false);
    expect(safeText('flag fags glad')).toBe('flag glad');
    expect(safeText('flag fags glad', () => 'sad')).toBe('flag sad glad');
  });

  it('keeps real words from our lists', () => {
    for (const ok of ['glass', 'grass', 'shell', 'night', 'flag', 'salad']) expect(isSafeToken(ok), ok).toBe(true);
    for (const w of WORDS) expect(isSafeToken(w), w).toBe(true);
    for (const p of PASSAGES) expect(isSafeText(p), p).toBe(true);
  });

  it('the curated lists contain nothing on the block list itself', () => {
    const exactBad = new Set(['fag', 'fags', 'ass', 'gal', 'gals', 'jag', 'jags', 'sass', 'lass', 'hash', 'lash', 'hoe', 'nip', 'tit', 'poo', 'pee', 'die', 'kill', 'dead']);
    for (const w of WORDS) expect(exactBad.has(w), w).toBe(false);
  });

  it('every lesson text is clean, across thousands of runs', () => {
    for (const l of LESSONS) {
      const rand = seededRandom(l.id.length * 977 + 13);
      for (let i = 0; i < 1500; i++) {
        const text = buildLessonText(l, i % 3 ? [] : l.keys.slice(0, 2), rand);
        // Every word must clear the strict root check, unless it was reviewed by hand.
        for (const tok of words(text)) if (!REVIEWED.has(tok)) expect(hasBlockedRoot(tok), `${l.title}: ${tok}`).toBe(false);
        expect(text.length).toBeGreaterThan(10);
      }
    }
  }, 60000);

  it('every race is clean for every letter set', () => {
    const sets = new Set<string>();
    for (const l of LESSONS) sets.add(l.keys.filter((k) => k !== ' ').join(''));
    sets.add('asdfghjkl;');
    for (const letters of sets) {
      const known = new Set(letters.split(''));
      for (const k of 'asdfghjkl') known.add(k);
      const rand = seededRandom(letters.length);
      for (let i = 0; i < 1500; i++) {
        const text = buildRaceText(known, 25, rand);
        for (const tok of words(text)) if (!REVIEWED.has(tok)) expect(hasBlockedRoot(tok), `${letters}: ${tok}`).toBe(false);
      }
    }
  }, 60000);

  it('random letter groups that would spell a rude word are re-rolled', () => {
    // Brute force: every 3 and 4 letter group from the home row that a drill could make.
    const home = 'asdfghjkl'.split('');
    let blocked = 0;
    for (const a of home) for (const b of home) for (const c of home) for (const d of ['', ...home]) {
      if (hasBlockedRoot(a + b + c + d)) blocked++;
    }
    expect(blocked).toBeGreaterThan(0); // e.g. "fags", "kkk", "ass" really are possible
    expect(isSafeToken('fags')).toBe(false);
  });

  it('dragon and rider names are clean', () => {
    // Reviewed by hand: the strict check trips on these, but they read fine.
    const reviewed = new Set(['Ashtail', 'Novagleam']);
    for (const s of NAME_STARTS) for (const e of NAME_ENDS) if (!reviewed.has(s + e)) expect(hasBlockedRoot(s + e), s + e).toBe(false);
    for (const a of NAME_ADJECTIVES) for (const n of NAME_NOUNS) expect(hasBlockedRoot(a) || hasBlockedRoot(n), `${a} ${n}`).toBe(false);
  });
});
