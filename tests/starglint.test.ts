import { describe, expect, it } from 'vitest';
import { dragonSvg } from '../src/game/dragons';
import { STARGLINT_LOOKS, starglintSvg } from '../src/game/starglintArt';

const shapes = (svg: string): number => (svg.match(/<(path|ellipse|circle|rect)\b/g) ?? []).length;
const ids = (svg: string): string[] => [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);

describe('Starglint art', () => {
  it('draws its own body, whatever tribe field it carries', () => {
    const a = dragonSvg('mossclaw', 0, 'adult', 'flap', 'starglint');
    const b = dragonSvg('tidefin', 2, 'adult', 'flap', 'starglint');
    expect(a).toContain('class="dragon starglint flap"');
    expect(shapes(a)).toBe(shapes(b));
  });

  it('keeps the rig the animations need', () => {
    const svg = starglintSvg('young', 'flap');
    for (const cls of ['rig', 'wing wing-back', 'wing wing-front', 'tail', 'head', 'lid']) expect(svg).toContain(`class="${cls}"`);
  });

  it('is the extra-detailed one: about 600 shapes for an adult', () => {
    const n = shapes(starglintSvg('adult'));
    expect(n).toBeGreaterThan(520);
    expect(n).toBeLessThan(700);
    expect(shapes(dragonSvg('emberback', 0, 'adult'))).toBeLessThan(n / 5);
  });

  it('gives every drawing its own ids, so two on one screen never clash', () => {
    const one = ids(starglintSvg('adult'));
    const two = ids(starglintSvg('adult'));
    expect(new Set(one).size).toBe(one.length);
    expect(one.some((id) => two.includes(id))).toBe(false);
  });

  it('never animates sparkles one by one (iPad speed)', () => {
    for (const look of Object.keys(STARGLINT_LOOKS) as Array<keyof typeof STARGLINT_LOOKS>) {
      const svg = starglintSvg('adult', '', look);
      const moving = svg.match(/class="sf-(crackle|glow|shimmer|spin|orbit)[^"]*"/g) ?? [];
      expect(moving.length).toBeLessThanOrEqual(5);
      expect(svg).not.toMatch(/class="(tw|flick|pulse)\b/);
    }
  });

  it('still shows evolution stars', () => {
    expect(dragonSvg('emberback', 0, 'adult', '', 'starglint', 0, 4)).toContain('evo-sparkles');
  });
});

describe('Starglint in races', () => {
  it('draws a lighter version at race size', () => {
    const full = shapes(dragonSvg('emberback', 0, 'adult', 'flap', 'starglint'));
    const race = shapes(dragonSvg('emberback', 0, 'adult', 'flap', 'starglint', 0, 0, true));
    expect(race).toBeLessThan(full * 0.65);
  });
});
