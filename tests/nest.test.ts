import { describe, expect, it } from 'vitest';
import { TRIBES, eggCracksSvg, HATCH_TAPS } from '../src/game/dragons';
import { eggProgress, giveEgg, swapNestEgg } from '../src/game/progress';
import { createProfile } from '../src/save/store';

describe('choosing the next egg', () => {
  it('moves a waiting egg into the nest and the nest egg into its basket spot', () => {
    const p = createProfile('Brave Comet');
    p.nest = { tribe: 'emberback', warmth: 0, seed: 1 };
    giveEgg(p, 'tidefin');
    giveEgg(p, 'stormcrest');
    giveEgg(p, 'mossclaw');
    expect(swapNestEgg(p, 1)).toBe(true);
    expect(p.nest!.tribe).toBe('stormcrest');
    expect(p.basket).toEqual(['tidefin', 'emberback', 'mossclaw']);
  });

  it('keeps the warmth, so switching never loses typing', () => {
    const p = createProfile('Brave Comet');
    p.nest = { tribe: 'duneskimmer', warmth: TRIBES.duneskimmer.hatchKeys / 2, seed: 1 };
    p.basket = ['tidefin'];
    swapNestEgg(p, 0);
    expect(eggProgress(p)).toBeGreaterThanOrEqual(0.5);
    swapNestEgg(p, 0);
    expect(p.nest!.tribe).toBe('duneskimmer');
    expect(p.nest!.warmth).toBeGreaterThanOrEqual(TRIBES.duneskimmer.hatchKeys / 2);
  });

  it('a ready egg stays ready after a switch', () => {
    const p = createProfile('Brave Comet');
    p.nest = { tribe: 'emberback', warmth: TRIBES.emberback.hatchKeys, seed: 1 };
    p.basket = ['shadeglide'];
    swapNestEgg(p, 0);
    expect(eggProgress(p)).toBe(1);
  });

  it('does nothing without a nest egg or a waiting egg there', () => {
    const p = createProfile('Brave Comet');
    p.basket = [];
    expect(swapNestEgg(p, 0)).toBe(false);
    p.nest = null;
    p.basket = ['tidefin'];
    expect(swapNestEgg(p, 0)).toBe(false);
    expect(p.basket).toEqual(['tidefin']);
  });
});

describe('tap to open', () => {
  it('each tap adds a crack', () => {
    const count = (n: number) => (eggCracksSvg('emberback', n).match(/<path/g) ?? []).length;
    for (let n = 1; n <= HATCH_TAPS; n++) expect(count(n)).toBeGreaterThan(count(n - 1));
  });
});
