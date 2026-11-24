import { describe, expect, it } from 'vitest';
import { flapFor } from '../src/game/raceRules';

describe('typing stays smooth', () => {
  it('no :has() rule watches the whole app', async () => {
    // A :has() on #app made every key and every race frame restyle the whole page.
    // The computer layout uses the kb-typing class that typingView sets instead.
    // Read as plain text: Vitest empties CSS imports.
    const mod = 'node:fs';
    const fs = (await import(/* @vite-ignore */ mod)) as { readFileSync: (path: string, enc: 'utf8') => string; readdirSync: (path: string) => string[] };
    // styles.css only @imports the parts in src/styles/, so read every part.
    const css = fs.readdirSync('src/styles').sort().map((f) => fs.readFileSync(`src/styles/${f}`, 'utf8')).join('\n');
    expect(css.length).toBeGreaterThan(1000);
    expect(css).not.toMatch(/#app:has\(/);
    expect(css).toMatch(/#app\.kb-typing/);
  });

  it('wing speed changes in a few steps, not on every frame', () => {
    const seen = new Set<string>();
    for (let wpm = 0; wpm <= 120; wpm += 0.1) seen.add(flapFor(wpm));
    expect(seen.size).toBeLessThanOrEqual(5);
    // Faster typing never makes the wings slower.
    let last = Infinity;
    for (let wpm = 0; wpm <= 120; wpm += 1) {
      const s = parseFloat(flapFor(wpm));
      expect(s).toBeLessThanOrEqual(last);
      last = s;
    }
    expect(flapFor(0)).toBe('0.75s');
    expect(flapFor(60)).toBe('0.36s');
    expect(flapFor(-5)).toBe('0.75s');
  });
});
