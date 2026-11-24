import { describe, expect, it } from 'vitest';
import { lessonsInUnit } from '../src/content/lessons';
import { nearestFreeEgg } from '../src/game/progress';
import { createProfile, emptySave, writeSave, loadSave } from '../src/save/store';

// Fixes from the bridge playtest (issue #81).

describe('saving right away (playtest #1)', () => {
  it('writes localStorage before writeSave resolves, so a reload right after finds it', async () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const save = emptySave();
    const p = createProfile('Brave Rider');
    p.embers = 20;
    save.profiles.push(p);
    save.activeId = p.id;
    const done = writeSave(save);
    // Not awaited yet: the copy is already there.
    expect([...store.values()].some((v) => v.includes('Brave Rider'))).toBe(true);
    await done;
    const back = await loadSave();
    expect(back.activeId).toBe(p.id);
    expect(back.profiles[0].embers).toBe(20);
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });
});

describe('nearest free egg (playtest #4)', () => {
  it('points at the next lesson unit with how many lessons are passed', () => {
    const p = createProfile('A');
    const home = lessonsInUnit('home');
    p.lessons[home[0].id] = { stars: 1 } as never;
    p.lessons[home[1].id] = { stars: 2 } as never;
    const next = nearestFreeEgg(p)!;
    expect(next.tribe).toBe('tidefin');
    expect(next.text).toBe(`2 of ${home.length} Home Row lessons passed`);
  });
  it('switches to accurate races when those are closer', () => {
    const p = createProfile('B');
    p.races = [{ accuracy: 0.97 }, { accuracy: 0.96 }] as never;
    const next = nearestFreeEgg(p)!;
    expect(next.tribe).toBe('frostspine');
    expect(next.text).toBe('2 of 3 races with 95% correct');
  });
  it('is empty once every free egg is earned', () => {
    const p = createProfile('C');
    p.unitsRewarded = ['home', 'top', 'bottom', 'sentences'];
    p.milestones = ['accuracy'];
    expect(nearestFreeEgg(p)).toBeNull();
  });
});
