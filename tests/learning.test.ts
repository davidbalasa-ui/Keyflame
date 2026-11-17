import { describe, expect, it } from 'vitest';
import { LESSONS, buildTrickyText, buildWarmUp, warmUpDue } from '../src/content/lessons';
import { FASTER_PER_DAY, fasterThanUsual, newlyMastered, payImprovements } from '../src/game/improve';
import { createProfile, normalizeProfile } from '../src/save/store';
import type { SessionSummary } from '../src/engine/typing';

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const sum = (wpm: number, accuracy = 0.97): SessionSummary => ({ wpm, accuracy, correct: 100, errors: 3, durationMs: 60000, keyStats: {} }) as unknown as SessionSummary;

describe('tricky keys drill (KF-25)', () => {
  it('only uses letters the rider knows and leans on the tricky ones', () => {
    for (const idx of [2, 6, 12, LESSONS.length - 1]) {
      const known = new Set(LESSONS[idx].keys.filter((k) => k !== ' '));
      const weak = [...known].slice(0, 2);
      for (let s = 1; s < 30; s++) {
        const t = buildTrickyText(known, weak, seeded(s));
        expect([...t].every((c) => c === ' ' || known.has(c))).toBe(true);
        expect(weak.some((k) => t.includes(k))).toBe(true);
      }
    }
  });
  it('falls back to key patterns when few sentences fit', () => {
    const t = buildTrickyText(new Set(['f', 'j']), ['f', 'j'], seeded(3));
    expect(t).toMatch(/^[fj ]+$/);
    expect(t.split(' ').length).toBeGreaterThan(10);
  });
});

describe('warm-up rings (KF-10)', () => {
  it('come every third lesson played, once there are older keys', () => {
    expect(warmUpDue(1, 2, 'drill')).toBe(false);
    expect(warmUpDue(5, 2, 'words')).toBe(true);
    expect(warmUpDue(5, 3, 'words')).toBe(false);
    expect(warmUpDue(5, 5, 'passage')).toBe(false);
  });
  it('are a few words from older keys only', () => {
    const review = new Set(LESSONS[6].keys.filter((k) => k !== ' '));
    for (let s = 1; s < 20; s++) {
      const w = buildWarmUp(review, [], seeded(s));
      if (w === null) continue;
      expect([...w].every((c) => c === ' ' || review.has(c))).toBe(true);
      expect(w.split(' ').length).toBeLessThanOrEqual(12);
    }
  });
});

describe('rewards for improving (KF-11)', () => {
  it('pays "faster than usual" only for a clear jump at good accuracy', () => {
    expect(fasterThanUsual([10, 10], 20, 0.97)).toBe(false); // too few earlier runs
    expect(fasterThanUsual([10, 10, 10], 11.5, 0.97)).toBe(true);
    expect(fasterThanUsual([10, 10, 10], 10.5, 0.97)).toBe(false);
    expect(fasterThanUsual([10, 10, 10], 20, 0.85)).toBe(false);
  });
  it('caps the speed reward per day, so playing more never beats playing better', () => {
    const p = createProfile('Brave Comet');
    let paid = 0;
    for (let i = 0; i < 6; i++) paid += payImprovements(p, sum(30), [10, 10, 10]).filter((x) => x.kind === 'faster').length;
    expect(paid).toBe(FASTER_PER_DAY);
  });
  it('rewards each mastered key once', () => {
    const p = createProfile('Brave Comet');
    p.keyStats.f = { hits: 48, misses: 1, totalMs: 48 * 400 };
    p.keyStats.j = { hits: 20, misses: 0, totalMs: 20 * 400 }; // not enough tries yet
    expect(newlyMastered(p)).toEqual(['f']);
    const before = p.embers;
    const first = payImprovements(p, sum(5), null);
    expect(first.map((x) => x.key)).toEqual(['f']);
    expect(p.embers).toBeGreaterThan(before);
    expect(payImprovements(p, sum(5), null)).toEqual([]);
  });
  it('keeps mastered keys and the nest finger across a save', () => {
    const p = createProfile('Brave Comet');
    p.keysMastered = ['f'];
    p.nestSeen = true;
    p.improveDay = { date: '2026-11-17', faster: 1 };
    const back = normalizeProfile(JSON.parse(JSON.stringify(p)))!;
    expect(back.keysMastered).toEqual(['f']);
    expect(back.nestSeen).toBe(true);
    expect(back.improveDay).toEqual({ date: '2026-11-17', faster: 1 });
  });
});

describe('word challenges (KF-12)', async () => {
  const { PACKS, CHALLENGES, buildChallengeText, challengeOpen } = await import('../src/content/challenges');
  const { isSafeText } = await import('../src/content/safety');
  const { challengesOpen, recordChallenge } = await import('../src/game/progress');
  it('use only lowercase letters, so every word types on the tap keyboard', () => {
    for (const p of PACKS) for (const lvl of p.words) for (const word of lvl) expect(word).toMatch(/^[a-z]+$/);
  });
  it('pass the safety filter and never repeat a word inside a level', () => {
    for (const p of PACKS)
      for (const lvl of p.words) {
        expect(new Set(lvl).size).toBe(lvl.length);
        expect(isSafeText(lvl.join(' '))).toBe(true);
      }
  });
  it('make texts from the level words, never the same word twice in a row', () => {
    for (const c of CHALLENGES) {
      const t = buildChallengeText(c, seeded(7)).split(' ');
      const pool = new Set(PACKS.find((p) => p.id === c.pack)!.words[c.level - 1]);
      expect(t.every((x) => pool.has(x))).toBe(true);
      expect(t.some((x, i) => x === t[i - 1])).toBe(false);
    }
  });
  it('open after every lesson is passed, one level at a time', () => {
    const p = createProfile('Brave Comet');
    expect(challengesOpen(p)).toBe(false);
    for (const l of LESSONS) p.lessons[l.id] = { stars: 1, bestWpm: 10, bestAccuracy: 0.95 };
    expect(challengesOpen(p)).toBe(true);
    const [l1, l2] = CHALLENGES;
    expect(challengeOpen({}, l2)).toBe(false);
    recordChallenge(p, l1, sum(15), 2);
    expect(challengeOpen(p.challenges!, l2)).toBe(true);
    const back = normalizeProfile(JSON.parse(JSON.stringify(p)))!;
    expect(back.challenges![l1.id].stars).toBe(2);
  });
});
