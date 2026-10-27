import { describe, expect, it } from 'vitest';
import { canBuyEgg } from '../src/game/collection';
import { MARKINGS, TRIBES, dragonSvg } from '../src/game/dragons';
import { EVOLVE_XP, MAXED_EMBERS, MAX_STARS, WARM_PRICE, eggProgress, hatchNest, lookHolder, tribeMaxed, warmWithEmbers } from '../src/game/progress';
import { createProfile, normalizeProfile, type OwnedDragon, type Profile } from '../src/save/store';

// Before seasons start, so no season colors are rolled.
const BEFORE_SEASONS = new Date(2026, 9, 27, 12);
const fixed = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};
const ready = (p: Profile): void => {
  p.nest = { tribe: 'emberback', warmth: 9999, seed: 1 };
};
const owned = (palette: number, marking: number, stars = 0, xp = 0): OwnedDragon => ({ id: `d${palette}${marking}${xp}`, tribe: 'emberback', palette, marking, name: 'Ashclaw', xp, hatchedAt: 0, stars });

describe('evolution', () => {
  it('a repeated look evolves the dragon instead of adding a copy', () => {
    const p = createProfile('Brave Comet');
    // 0.5 picks a common color, the next 0.5 picks it, then 0.1 is a plain marking.
    ready(p);
    const first = hatchNest(p, 'Ashclaw', fixed(0.5), BEFORE_SEASONS)!;
    expect(first.evolved).toBe(false);
    expect(p.dragons).toHaveLength(1);
    for (let n = 1; n <= MAX_STARS; n++) {
      ready(p);
      const r = hatchNest(p, 'Other', fixed(0.5), BEFORE_SEASONS)!;
      expect(r.evolved).toBe(true);
      expect(r.dragon!.id).toBe(first.dragon!.id);
      expect(r.dragon!.stars).toBe(n);
      expect(r.dragon!.name).toBe('Ashclaw');
    }
    expect(p.dragons).toHaveLength(1);
    expect(p.dragons[0].xp).toBe(EVOLVE_XP * MAX_STARS);
  });

  it('never rolls a look at full stars', () => {
    const p = createProfile('Brave Comet');
    p.dragons = [owned(1, 1, MAX_STARS)];
    // Keeps rolling the maxed look at first; the hatch must move on to something else.
    for (let i = 0; i < 30; i++) {
      ready(p);
      const r = hatchNest(p, 'Ashclaw', fixed(0.5), BEFORE_SEASONS)!;
      expect(r.dragon).not.toBeNull();
      expect(`${r.dragon!.palette}:${r.dragon!.marking}`).not.toBe('1:1');
    }
    expect(lookHolder(p, 'emberback', 1, 1)!.stars).toBe(MAX_STARS);
  });

  it('a fully maxed tribe is no longer sold, and a stray egg turns into embers', () => {
    const p = createProfile('Brave Comet');
    p.dragons = TRIBES.emberback.palettes.flatMap((_, pi) => MARKINGS.map((_, m) => owned(pi, m, MAX_STARS)));
    expect(tribeMaxed(p, 'emberback')).toBe(true);
    p.embers = 1000;
    p.nest = null;
    expect(canBuyEgg(p, 'emberback')).toBe('maxed');
    ready(p);
    const r = hatchNest(p, 'Ashclaw', Math.random, BEFORE_SEASONS)!;
    expect(r.dragon).toBeNull();
    expect(p.embers).toBe(1000 + MAXED_EMBERS);
  });

  it('old saves get stars for copies and keep every dragon', () => {
    const raw = { ...createProfile('Brave Comet'), starsBackfilled: undefined, dragons: [owned(0, 0, 0, 10), owned(0, 0, 0, 500), owned(0, 0, 0, 20), owned(2, 1)] };
    const p = normalizeProfile(raw)!;
    expect(p.dragons).toHaveLength(4);
    expect(lookHolder(p, 'emberback', 0, 0)!.xp).toBe(500);
    expect(lookHolder(p, 'emberback', 0, 0)!.stars).toBe(2);
    expect(lookHolder(p, 'emberback', 2, 1)!.stars ?? 0).toBe(0);
    // Running the migration again changes nothing.
    expect(normalizeProfile(p)!.dragons.map((d) => d.stars ?? 0)).toEqual(p.dragons.map((d) => d.stars ?? 0));
  });

  it('draws evolved dragons with more glow per star', () => {
    expect(dragonSvg('tidefin', 0, 'adult', '', undefined, 0, 0)).not.toContain('evo-aura');
    expect(dragonSvg('tidefin', 0, 'adult', '', undefined, 0, 2)).toContain('evo-aura');
  });
});

describe('ember warming', () => {
  it('spends embers to warm the egg a quarter at a time', () => {
    const p = createProfile('Brave Comet');
    p.nest = { tribe: 'tidefin', warmth: 0, seed: 1 };
    p.embers = WARM_PRICE * 5;
    for (let i = 1; i <= 4; i++) {
      expect(warmWithEmbers(p)).toBe(true);
      expect(eggProgress(p)).toBeCloseTo(Math.min(1, i * 0.25));
    }
    expect(warmWithEmbers(p)).toBe(false);
    expect(p.embers).toBe(WARM_PRICE);
    p.nest.warmth = 0;
    p.embers = WARM_PRICE - 1;
    expect(warmWithEmbers(p)).toBe(false);
  });
});
