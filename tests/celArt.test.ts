import { describe, expect, it } from 'vitest';
import { dragonSvg, setSimpleArt, TRIBES, MARKINGS, type Stage, type TribeId } from '../src/game/dragons';
import { CEL_ART } from '../src/game/art';

const shapes = (svg: string): number => (svg.match(/<(path|ellipse|circle|rect|polygon|polyline|line)\b/g) ?? []).length;
const ids = (svg: string): string[] => [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const paths = (svg: string): Set<string> => new Set([...svg.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1]));
const STAGES: Stage[] = ['hatchling', 'young', 'adult'];
const CEL = Object.keys(CEL_ART) as TribeId[];

describe('cel-shaded tribe art', () => {
  it('is ready for at least the Emberback', () => {
    expect(CEL).toContain('emberback');
  });

  for (const tribe of CEL) {
    describe(TRIBES[tribe].name, () => {
      it('keeps the rig the animations need, at every age', () => {
        for (const st of STAGES) {
          const svg = dragonSvg(tribe, 0, st, 'flap');
          expect(svg).toContain(`class="dragon cel cel-${tribe} flap"`);
          for (const cls of ['rig', 'wing wing-back', 'wing wing-front', 'tail', 'head', 'lid']) expect(svg).toContain(`class="${cls}"`);
          expect((svg.match(/<g\b/g) ?? []).length).toBe((svg.match(/<\/g>/g) ?? []).length);
        }
      });

      it('has about 300 shapes, fewer in races and more in portraits', () => {
        for (const st of STAGES) {
          const full = shapes(dragonSvg(tribe, 0, st));
          const race = shapes(dragonSvg(tribe, 0, st, '', undefined, 0, 0, true));
          const portrait = shapes(dragonSvg(tribe, 0, st, '', undefined, 0, 0, 'portrait'));
          expect(full).toBeGreaterThan(st === 'adult' ? 240 : 200);
          expect(full).toBeLessThan(380);
          expect(race).toBeLessThan(full * 0.6);
          expect(portrait).toBeGreaterThan(full * 1.3);
          expect(portrait).toBeLessThan(650);
        }
      });

      it('gives every drawing its own ids, so two on one screen never clash', () => {
        const one = ids(dragonSvg(tribe, 1, 'adult', '', undefined, 2, 3, 'portrait'));
        const two = ids(dragonSvg(tribe, 1, 'adult', '', undefined, 2, 3, 'portrait'));
        expect(new Set(one).size).toBe(one.length);
        expect(one.some((id) => two.includes(id))).toBe(false);
      });

      it('stays fast on iPads: no filters, and only a few whole groups move', () => {
        for (const detail of ['full', 'portrait'] as const) {
          const svg = dragonSvg(tribe, 0, 'adult', '', undefined, 1, 4, detail);
          expect(svg).not.toMatch(/<filter|feTurbulence|feDisplacement|filter=/);
          expect((svg.match(/class="cel-glow/g) ?? []).length).toBeLessThanOrEqual(4);
          expect(svg).not.toMatch(/class="(tw|flick|pulse|ember|puff|flicker)\b/);
        }
        expect(dragonSvg(tribe, 0, 'adult', 'flap', undefined, 0, 0, true)).not.toContain('cel-glow');
      });

      it('keeps every color and pattern looking different (the Codex looks)', () => {
        const looks = new Set<string>();
        TRIBES[tribe].palettes.forEach((_, i) => MARKINGS.forEach((_, m) => looks.add(dragonSvg(tribe, i, 'adult', '', undefined, m).replace(/kc\d+/g, ''))));
        expect(looks.size).toBe(TRIBES[tribe].palettes.length * MARKINGS.length);
      });

      it('takes the 4 color slots: body, belly, wing and accent all show up', () => {
        const p = TRIBES[tribe].palettes[1];
        const svg = dragonSvg(tribe, 1, 'adult');
        for (const c of [p.body, p.belly, p.wing, p.accent]) expect(svg).toContain(c);
      });
    });
  }

  it('gives each tribe its own body, not one shared shape with swapped parts', () => {
    for (let i = 0; i < CEL.length; i++) {
      for (let j = i + 1; j < CEL.length; j++) {
        const a = paths(dragonSvg(CEL[i], 0, 'adult'));
        const b = paths(dragonSvg(CEL[j], 0, 'adult'));
        const shared = [...a].filter((d) => b.has(d)).length;
        expect(shared / Math.min(a.size, b.size)).toBeLessThan(0.3);
      }
    }
  });

  it('falls back to the simple art on slow devices', () => {
    setSimpleArt(true);
    try {
      const svg = dragonSvg('emberback', 0, 'adult', 'flap');
      expect(svg).not.toContain('cel-emberback');
      expect(shapes(svg)).toBeLessThan(90);
    } finally {
      setSimpleArt(false);
    }
  });
});
