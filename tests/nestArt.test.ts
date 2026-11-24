import { describe, expect, it } from 'vitest';
import { nestBackSvg, nestFrontSvg } from '../src/game/art/nest';

const shapes = (svg: string): number => (svg.match(/<(path|ellipse|circle|rect|polygon|polyline|line)\b/g) ?? []).length;

describe('cel twig nest', () => {
  for (const [name, draw] of [['back', nestBackSvg], ['front', nestFrontSvg]] as const) {
    it(`${name} layer follows the iPad art rules`, () => {
      for (const seed of [1, 5, 12345]) {
        const svg = draw(seed);
        expect(svg).toContain('viewBox="0 0 200 90"');
        expect(svg).toContain('aria-hidden="true"');
        // No live filters, gradients or ids: cheap to draw and safe to repeat on one screen.
        expect(svg).not.toMatch(/filter|Gradient|\bid="/);
        expect((svg.match(/<g\b/g) ?? []).length).toBe((svg.match(/<\/g>/g) ?? []).length);
        expect(svg).not.toMatch(/NaN|undefined/);
        expect(shapes(svg)).toBeGreaterThan(10);
        expect(shapes(svg)).toBeLessThan(90);
      }
    });
  }

  it('looks the same for the same egg and a little different for another', () => {
    expect(nestFrontSvg(7)).toBe(nestFrontSvg(7));
    expect(nestFrontSvg(7)).not.toBe(nestFrontSvg(8));
  });
});
