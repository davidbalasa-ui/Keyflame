import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/content/lessons';
import { recordLesson, recordRace } from '../src/game/progress';
import { lastPlayedText, lessonsPassed, personalBests, recentAccuracy, recentSessions, unitProgress } from '../src/game/riderStats';
import { bumpStreak, currentStreak, dayBefore, playedToday } from '../src/game/streak';
import { cleanWord, ringStops } from '../src/ui/lessonFlight';
import { createProfile, normalizeProfile, today } from '../src/save/store';
import type { SessionSummary } from '../src/engine/typing';

const summary = (wpm: number, accuracy = 0.96): SessionSummary => ({ wpm, accuracy, correct: 50, errors: 2, durationMs: 30000, keyStats: {} });

describe('day streaks', () => {
  it('knows the day before, across months and years', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
    expect(dayBefore('2027-01-01')).toBe('2026-12-31');
    expect(dayBefore('2028-03-01')).toBe('2028-02-29');
  });

  it('grows on days in a row, starts over after a gap, and keeps the best', () => {
    const p = createProfile('Brave Comet');
    bumpStreak(p, '2026-10-01');
    bumpStreak(p, '2026-10-01');
    bumpStreak(p, '2026-10-02');
    bumpStreak(p, '2026-10-03');
    expect(p.streak).toEqual({ last: '2026-10-03', days: 3, best: 3 });
    bumpStreak(p, '2026-10-06');
    expect(p.streak).toEqual({ last: '2026-10-06', days: 1, best: 3 });
  });

  it('still shows the streak the next day, and 0 once a day is missed', () => {
    const p = createProfile('Brave Comet');
    bumpStreak(p, '2026-10-01');
    bumpStreak(p, '2026-10-02');
    expect(currentStreak(p, '2026-10-02')).toBe(2);
    expect(currentStreak(p, '2026-10-03')).toBe(2);
    expect(playedToday(p, '2026-10-03')).toBe(false);
    expect(currentStreak(p, '2026-10-04')).toBe(0);
  });

  it('counts the first race or lesson of the day', () => {
    const p = createProfile('Brave Comet');
    recordRace(p, summary(20), 2);
    recordLesson(p, LESSONS[0], summary(15), 2);
    expect(p.streak).toEqual({ last: today(), days: 1, best: 1 });
    expect(currentStreak(p)).toBe(1);
  });

  it('survives a save round trip, and old saves have none', () => {
    const p = createProfile('Brave Comet');
    expect(currentStreak(normalizeProfile(JSON.parse(JSON.stringify(p)))!)).toBe(0);
    bumpStreak(p);
    const back = normalizeProfile(JSON.parse(JSON.stringify(p)))!;
    expect(back.streak?.days).toBe(1);
  });
});

describe('progress numbers', () => {
  it('logs lessons, with no speed for relaxed ones', () => {
    const p = createProfile('Brave Comet');
    recordLesson(p, LESSONS[0], summary(15, 0.9), 1);
    recordLesson(p, LESSONS[1], summary(18, 1), 3, true);
    expect(p.lessonLog).toHaveLength(2);
    expect(p.lessonLog![0]).toMatchObject({ lesson: LESSONS[1].id, wpm: null, accuracy: 1 });
    expect(p.lessonLog![1]).toMatchObject({ lesson: LESSONS[0].id, wpm: 15 });
  });

  it('keeps the lesson log short', () => {
    const p = createProfile('Brave Comet');
    for (let i = 0; i < 70; i++) recordLesson(p, LESSONS[0], summary(10), 1);
    expect(p.lessonLog).toHaveLength(50);
  });

  it('mixes races and timed lessons, oldest first', () => {
    const p = createProfile('Brave Comet');
    p.races = [{ at: 300, wpm: 30, accuracy: 0.9, place: 1 }, { at: 100, wpm: 10, accuracy: 0.8, place: 3 }];
    p.lessonLog = [{ at: 400, lesson: 'L1', stars: 1, wpm: null, accuracy: 1 }, { at: 200, lesson: 'L1', stars: 2, wpm: 20, accuracy: 0.95 }];
    expect(recentSessions(p).map((s) => s.wpm)).toEqual([10, 20, 30]);
    expect(recentSessions(p).map((s) => s.kind)).toEqual(['race', 'lesson', 'race']);
    // Relaxed lessons have no speed but their accuracy still counts.
    expect(recentAccuracy(p, 2)).toBeCloseTo(0.95);
  });

  it('counts lessons passed and stars per unit', () => {
    const p = createProfile('Brave Comet');
    p.lessons[LESSONS[0].id] = { stars: 3, bestWpm: 20, bestAccuracy: 1 };
    p.lessons[LESSONS[1].id] = { stars: 0, bestWpm: 5, bestAccuracy: 0.7 };
    expect(lessonsPassed(p)).toEqual({ passed: 1, total: LESSONS.length });
    const home = unitProgress(p).find((u) => u.id === LESSONS[0].unit)!;
    expect(home.passed).toBe(1);
    expect(home.stars).toBe(3);
  });

  it('reports personal bests', () => {
    const p = createProfile('Brave Comet');
    expect(personalBests(p).bestAccuracy).toBeNull();
    recordRace(p, summary(24, 0.99), 1, { input: 'touch', courseId: 'volcano', beatRival: false });
    const b = personalBests(p);
    expect(b.touchWpm).toBe(24);
    expect(b.keyboardWpm).toBe(0);
    expect(b.bestAccuracy).toBe(0.99);
    expect(b.wins).toBe(1);
  });

  it('says when a rider last played in plain words', () => {
    const now = new Date(2026, 9, 29, 9).getTime();
    expect(lastPlayedText(null, now)).toBe('Not yet');
    expect(lastPlayedText(new Date(2026, 9, 29, 7).getTime(), now)).toBe('Today');
    expect(lastPlayedText(new Date(2026, 9, 28, 23).getTime(), now)).toBe('Yesterday');
    expect(lastPlayedText(new Date(2026, 9, 25, 12).getTime(), now)).toBe('4 days ago');
  });
});

describe('lesson flight rings', () => {
  it('hangs a ring at every word end and a gate at the end', () => {
    expect(ringStops('ff jj fj')).toEqual([2, 5, 8]);
    expect(ringStops('fj')).toEqual([2]);
  });

  it('dims a ring when its word had a mistake', () => {
    const text = 'ff jj fj';
    const stops = ringStops(text);
    const missed = new Set([3]);
    expect(cleanWord(text, missed, stops, 0)).toBe(true);
    expect(cleanWord(text, missed, stops, 1)).toBe(false);
    expect(cleanWord(text, missed, stops, 2)).toBe(true);
    // A mistake on the space after a word counts for that word.
    expect(cleanWord(text, new Set([2]), stops, 0)).toBe(false);
  });
});
