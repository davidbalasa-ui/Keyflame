import { afterEach, describe, expect, it } from 'vitest';
import { TRIBES, dragonSvg, eggSvg, setSimpleArt, type TribeId } from '../src/game/dragons';
import { EGG_PATH, celEggSvg, celEvolvedArt } from '../src/game/art/eggs';

const shapes = (svg: string): number => (svg.match(/<(path|ellipse|circle|rect|polygon|polyline|line)\b/g) ?? []).length;
const ids = (svg: string): string[] => [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
/** The markup without its ids, so two drawings can be compared by look. */
const look = (svg: string): string => svg.replace(/\bke\d+/g, 'ID');
const TRIBE_IDS = Object.keys(TRIBES) as TribeId[];
const OUTLINE = 'M50 6 C78 6 90 52 90 74 C90 98 72 112 50 112 C28 112 10 98 10 74 C10 52 22 6 50 6z';

describe('cel-shaded eggs', () => {
  afterEach(() => setSimpleArt(false));

  it('keeps the classic outline, so cracks and the hatch split line up', () => {
    expect(EGG_PATH).toBe(OUTLINE);
    for (const t of TRIBE_IDS) {
      const svg = celEggSvg(t, 0, 1);
      expect(svg).toContain('<svg class="egg');
      expect(svg).toContain('viewBox="0 0 100 120"');
      expect(svg).toContain(`d="${OUTLINE}"`);
    }
  });

  it('is what eggSvg draws, unless simple art is on', () => {
    expect(eggSvg('tidefin', 0, 4)).toContain('cel-egg');
    setSimpleArt(true);
    expect(eggSvg('tidefin', 0, 4)).not.toContain('cel-egg');
    expect(eggSvg('tidefin', 0, 4)).toContain(`d="${OUTLINE}"`);
  });

  it('gives every egg its own ids', () => {
    for (const t of TRIBE_IDS) {
      const one = ids(celEggSvg(t, 0.8, 2));
      const two = ids(celEggSvg(t, 0.8, 2));
      expect(new Set(one).size).toBe(one.length);
      expect(one.some((id) => two.includes(id))).toBe(false);
    }
  });

  it('uses no filters and no per-shape animation, with 30 to 100 shapes', () => {
    for (const t of TRIBE_IDS) {
      for (const w of [0, 0.5, 1]) {
        const svg = celEggSvg(t, w, 5);
        expect(svg).not.toMatch(/<filter|filter=/);
        expect(svg).not.toMatch(/class="[^"]*(twinkle|glow|pulse|flick)/);
        expect(shapes(svg)).toBeGreaterThanOrEqual(30);
        expect(shapes(svg)).toBeLessThanOrEqual(100);
        expect((svg.match(/<g\b/g) ?? []).length).toBe((svg.match(/<\/g>/g) ?? []).length);
      }
    }
  });

  it('looks different for every tribe and for every seed', () => {
    const tribes = new Set(TRIBE_IDS.map((t) => look(celEggSvg(t, 0, 1))));
    expect(tribes.size).toBe(TRIBE_IDS.length);
    for (const t of TRIBE_IDS) {
      const seeds = new Set([1, 2, 3, 4].map((s) => look(celEggSvg(t, 0, s))));
      expect(seeds.size).toBe(4);
      // The same seed always draws the same egg.
      expect(look(celEggSvg(t, 0, 3))).toBe(look(celEggSvg(t, 0, 3)));
    }
  });

  it('cracks as warmth fills, and not when warm cracks are off', () => {
    const cracks = (svg: string): number => ['M50 22 l-4 10', 'M30 60 l8 2', 'M62 74 l6 -6'].filter((d) => svg.includes(d)).length;
    for (const t of TRIBE_IDS) {
      expect(cracks(celEggSvg(t, 0, 1))).toBe(0);
      expect(cracks(celEggSvg(t, 0.3, 1))).toBe(1);
      expect(cracks(celEggSvg(t, 0.6, 1))).toBe(2);
      expect(cracks(celEggSvg(t, 0.9, 1))).toBe(3);
      expect(cracks(celEggSvg(t, 1, 1, false))).toBe(0);
    }
  });
});

describe('cel evolution stars', () => {
  const p = TRIBES.tidefin.palettes[0];

  it('keeps every sparkle in one evo-sparkles group with nothing animating inside', () => {
    for (let s = 1; s <= 4; s++) {
      const { sparkles, aura } = celEvolvedArt('t', p, s);
      expect(aura).toContain('evo-aura');
      expect(sparkles.startsWith('<g class="evo-sparkles cel-twinkle">')).toBe(true);
      expect(sparkles.endsWith('</g>')).toBe(true);
      const inner = sparkles.slice(sparkles.indexOf('>') + 1, -4);
      expect(inner).not.toMatch(/class=/);
      expect(inner).not.toMatch(/<g\b/);
    }
  });

  it('grows with each star, with the circlet only at four', () => {
    const tiers = [1, 2, 3, 4].map((s) => celEvolvedArt('t', p, s));
    for (let i = 1; i < 4; i++) expect(shapes(tiers[i].sparkles)).toBeGreaterThan(shapes(tiers[i - 1].sparkles));
    const rx = tiers.map((t) => Number(t.aura.match(/rx="([\d.]+)"/)![1]));
    expect(rx).toEqual([...rx].sort((a, b) => a - b));
    expect(new Set(rx).size).toBe(4);
    expect(tiers.slice(0, 3).every((t) => t.head === '')).toBe(true);
    expect(tiers[3].head).toContain('evo-circlet');
    expect(tiers[2].sparkles).toContain('#ffd43b');
    expect(tiers[1].sparkles).not.toContain('#ffd43b"');
  });

  it('is drawn on evolved dragons, and the classic stars come back with simple art', () => {
    const svg = dragonSvg('emberback', 0, 'adult', '', undefined, 0, 4);
    expect(svg).toContain('evo-sparkles cel-twinkle');
    expect(svg).toContain('evo-circlet');
    expect(svg).not.toContain('sf-twinkle');
    setSimpleArt(true);
    expect(dragonSvg('emberback', 0, 'adult', '', undefined, 0, 4)).toContain('sf-twinkle');
    setSimpleArt(false);
  });
});
