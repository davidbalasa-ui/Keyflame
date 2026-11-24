import { describe, expect, it } from 'vitest';
import { TRIBES, eggCracksSvg, HATCH_TAPS } from '../src/game/dragons';
import { basketGroups, eggProgress, giveEgg, hatchNest, swapNestEgg } from '../src/game/progress';
import { EGG_PRICE, buyEgg, canBuyEgg } from '../src/game/collection';
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
    p.dragons.push({ id: 'd1', tribe: 'emberback', palette: 0, name: 'Ash', xp: 0, hatchedAt: 0 });
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

describe('more than three eggs', () => {
  it('earned eggs keep piling up past three, and none are lost', () => {
    const p = createProfile('Brave Comet');
    p.nest = { tribe: 'emberback', warmth: 0, seed: 1 };
    for (let i = 0; i < 12; i++) giveEgg(p, i % 2 ? 'tidefin' : 'mossclaw');
    expect(p.basket).toHaveLength(12);
  });

  it('a rider with 3 eggs waiting can still buy more', () => {
    const p = createProfile('Brave Comet');
    p.dragons = [{ id: 'a', tribe: 'emberback', palette: 0, marking: 0, name: 'Ash', xp: 0, hatchedAt: 0 }];
    p.nest = { tribe: 'emberback', warmth: 0, seed: 1 };
    p.basket = ['emberback', 'emberback', 'emberback'];
    p.embers = EGG_PRICE * 2;
    expect(canBuyEgg(p, 'emberback')).toBe('ok');
    expect(buyEgg(p, 'emberback')).toBe(true);
    expect(buyEgg(p, 'emberback')).toBe(true);
    expect(p.basket).toHaveLength(5);
    expect(canBuyEgg(p, 'emberback')).toBe('embers');
  });

  it('waiting eggs move into the nest one by one as each egg hatches', () => {
    const p = createProfile('Brave Comet');
    p.nest = { tribe: 'emberback', warmth: TRIBES.emberback.hatchKeys, seed: 1 };
    p.basket = ['tidefin', 'mossclaw', 'tidefin', 'stormcrest', 'emberback'];
    const order: string[] = [];
    let n = 0;
    while (p.nest && n++ < 20) {
      order.push(p.nest.tribe);
      p.nest.warmth = TRIBES[p.nest.tribe].hatchKeys;
      expect(hatchNest(p, 'Ember', () => 0.42)).not.toBeNull();
    }
    expect(order).toEqual(['emberback', 'tidefin', 'mossclaw', 'tidefin', 'stormcrest', 'emberback']);
    expect(p.basket).toEqual([]);
    expect(p.nest).toBeNull();
  });

  it('groups a big basket by tribe so the row stays short', () => {
    const p = createProfile('Brave Comet');
    p.basket = ['tidefin', 'mossclaw', 'tidefin', 'tidefin', 'stormcrest', 'mossclaw'];
    expect(basketGroups(p)).toEqual([
      { tribe: 'tidefin', index: 0, count: 3 },
      { tribe: 'mossclaw', index: 1, count: 2 },
      { tribe: 'stormcrest', index: 4, count: 1 },
    ]);
  });

  it('putting one egg of a group in the nest leaves the rest waiting', () => {
    const p = createProfile('Brave Comet');
    p.nest = { tribe: 'emberback', warmth: 0, seed: 1 };
    p.basket = ['tidefin', 'tidefin', 'tidefin', 'mossclaw'];
    const g = basketGroups(p).find((x) => x.tribe === 'mossclaw')!;
    expect(swapNestEgg(p, g.index)).toBe(true);
    expect(p.nest!.tribe).toBe('mossclaw');
    expect([...p.basket].sort()).toEqual(['emberback', 'tidefin', 'tidefin', 'tidefin']);
  });
});

describe('tap to open', () => {
  it('each tap adds a crack', () => {
    const count = (n: number) => (eggCracksSvg('emberback', n).match(/<path/g) ?? []).length;
    for (let n = 1; n <= HATCH_TAPS; n++) expect(count(n)).toBeGreaterThan(count(n - 1));
  });
});
