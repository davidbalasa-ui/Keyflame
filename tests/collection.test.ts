import { describe, expect, it } from 'vitest';
import { EGG_PRICE, MAX_BASKET, TOTAL_LOOKS, buyEgg, canBuyEgg, claimSets, codexSets, foundLooks } from '../src/game/collection';
import { MARKINGS, dragonSvg, lookName, rollMarking } from '../src/game/dragons';
import { hatchEgg } from '../src/game/progress';
import { createProfile, type OwnedDragon } from '../src/save/store';

const dragon = (palette: number, marking: number): OwnedDragon => ({ id: `${palette}${marking}`, tribe: 'emberback', palette, marking, name: 'Ashclaw', xp: 0, hatchedAt: 0 });

describe('codex collection', () => {
  it('has 12 looks per tribe', () => {
    expect(TOTAL_LOOKS).toBe(7 * 12);
    expect(lookName('emberback', 0, 1)).toBe('Spotted Cinder');
    expect(lookName('emberback', 0)).toBe('Cinder');
    for (let m = 0; m < MARKINGS.length; m++) expect(dragonSvg('tidefin', 1, 'adult', '', undefined, m)).toContain('<svg');
  });

  it('markings roll plain about half the time', () => {
    const counts = [0, 0, 0];
    let x = 0;
    for (let i = 0; i < 1000; i++) counts[rollMarking(() => ((x = (x + 0.6180339) % 1), x))]++;
    expect(counts[0]).toBeGreaterThan(400);
    expect(counts[1]).toBeGreaterThan(150);
    expect(counts[2]).toBeGreaterThan(150);
  });

  it('hatching gives a marking and sets pay once', () => {
    const p = createProfile('Bright Comet');
    p.nest!.warmth = 9999;
    const d = hatchEgg(p, 'Ashclaw')!;
    expect(d.marking).toBeGreaterThanOrEqual(0);
    p.dragons = [0, 1, 2, 3].map((i) => dragon(i, 0));
    const embers = p.embers;
    const sets = claimSets(p);
    expect(sets.map((s) => s.id)).toEqual(['emberback-colors']);
    expect(p.embers).toBe(embers + sets[0].embers);
    expect(claimSets(p)).toEqual([]);
    expect(foundLooks(p).size).toBe(4);
    expect(codexSets(p).find((s) => s.id === 'emberback-looks')!.have).toBe(4);
  });

  it('eggs can be bought with embers only for tribes you have met', () => {
    const p = createProfile('Quiet Seeker');
    p.embers = EGG_PRICE * 10;
    expect(canBuyEgg(p, 'emberback')).toBe('unknown');
    p.dragons = [dragon(0, 0)];
    p.nest = null;
    expect(buyEgg(p, 'emberback')).toBe(true);
    expect(p.nest!.tribe as string).toBe('emberback');
    for (let i = 0; i < MAX_BASKET; i++) expect(buyEgg(p, 'emberback')).toBe(true);
    expect(canBuyEgg(p, 'emberback')).toBe('full');
    p.basket = [];
    p.embers = EGG_PRICE - 1;
    expect(canBuyEgg(p, 'emberback')).toBe('embers');
    expect(buyEgg(p, 'emberback')).toBe(false);
  });
});
