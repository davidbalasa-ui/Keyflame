import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProfile, normalizeProfile, OUTBOX_MAX, type Profile } from '../src/save/store';
import { newActivityId, retryDelay } from '../src/game/classroom';
import { placedThrough, recordLesson } from '../src/game/progress';
import { LESSONS } from '../src/content/lessons';

const riders: Profile[] = [];
vi.mock('../src/ui/app', () => ({ allRiders: () => riders, persist: () => undefined }));
const posted: Array<{ id: string; kind: string }> = [];
let answer: () => Promise<string> = () => Promise.resolve('ok');
vi.mock('../src/net/classApi', () => ({
  postClassActivity: (_seat: unknown, a: { kind: string }, id: string) => {
    posted.push({ id, kind: a.kind });
    return answer();
  },
}));

const { flushClassOutbox, reportToClass } = await import('../src/ui/classTrack');

const classRider = (): Profile => {
  const p = createProfile('Brave Comet');
  p.classCode = 'BXTKRP';
  p.classBadge = 3;
  p.classKey = 'a'.repeat(32);
  return p;
};
const lesson = { kind: 'lesson' as const, lesson: 'L1', stars: 1, wpm: 10, accuracy: 0.92, touch: false };

describe('class outbox', () => {
  beforeEach(() => {
    riders.length = 0;
    posted.length = 0;
    answer = () => Promise.resolve('ok');
  });

  it('makes random version-4 ids', () => {
    const id = newActivityId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newActivityId()).not.toBe(id);
  });

  it('waits longer after each failure, up to five minutes', () => {
    expect([1, 2, 3, 10].map(retryDelay)).toEqual([5000, 10000, 20000, 300000]);
  });

  it('keeps results while offline and sends each one once the class is back', async () => {
    const p = classRider();
    riders.push(p);
    answer = () => Promise.reject(new Error('offline'));
    reportToClass(p, lesson);
    await vi.waitFor(() => expect(posted.length).toBe(1));
    await flushClassOutbox();
    expect(p.classOutbox?.length).toBe(1);
    // Closing and reopening the app keeps what's waiting.
    const back = normalizeProfile(JSON.parse(JSON.stringify(p)))!;
    expect(back.classOutbox).toEqual(p.classOutbox);
    const id = p.classOutbox![0].id;
    answer = () => Promise.resolve('ok');
    await flushClassOutbox();
    expect(p.classOutbox).toBeUndefined();
    // The retry used the same id, so the class stores it once.
    expect(posted.length).toBeGreaterThanOrEqual(2);
    expect(posted.every((x) => x.id === id)).toBe(true);
  });

  it('drops waiting results when the teacher took the badge out', async () => {
    const p = classRider();
    riders.push(p);
    answer = () => Promise.resolve('removed');
    reportToClass(p, lesson);
    await flushClassOutbox();
    expect(p.classOutbox).toBeUndefined();
    expect(p.classCode).toBeUndefined();
  });

  it('sends nothing for a rider who is not in a class, and caps the outbox', () => {
    const p = createProfile('Swift Ember');
    reportToClass(p, lesson);
    expect(p.classOutbox).toBeUndefined();
    const raw = { ...classRider(), classOutbox: Array.from({ length: OUTBOX_MAX + 5 }, (_, i) => ({ id: newActivityId(), at: i + 1, code: 'BXTKRP', badge: 3, a: lesson })) };
    raw.classOutbox.push({ id: 'nope', at: 1, code: 'BXTKRP', badge: 3, a: lesson });
    expect(normalizeProfile(raw)!.classOutbox!.length).toBe(OUTBOX_MAX);
  });
});

describe('lesson records', () => {
  it('names the last lesson a placement check skipped to', () => {
    expect(placedThrough(0)).toBeNull();
    expect(placedThrough(1)).toMatch(/^L\d+$/);
    expect(LESSONS.findIndex((l) => l.id === placedThrough(3))).toBeGreaterThan(LESSONS.findIndex((l) => l.id === placedThrough(1)));
  });

  it('never sets a best lesson speed from a relaxed lesson', () => {
    const p = createProfile('Brave Comet');
    const sum = { wpm: 40, accuracy: 0.95, correct: 50, errors: 2, durationMs: 15000, keyStats: {} } as unknown as Parameters<typeof recordLesson>[2];
    recordLesson(p, LESSONS[0], sum, 2, true);
    expect(p.lessons[LESSONS[0].id].bestWpm).toBe(0);
    recordLesson(p, LESSONS[0], { ...sum, wpm: 12 }, 2, false);
    expect(p.lessons[LESSONS[0].id].bestWpm).toBe(12);
  });
});
