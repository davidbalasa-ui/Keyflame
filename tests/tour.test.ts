import { describe, expect, it } from 'vitest';
import html from '../tour/index.html?raw';
import viteConfig from '../vite.config.ts?raw';

// The swipe-through tour at /tour/ is a page for grown-ups deciding whether to try Keyflame.
const published = new Set(Object.keys(import.meta.glob('../public/tour/*')).map((f) => f.replace('../public/tour/', '')));
const existsSync = (f: string): boolean => published.has(f);
const text = html.replace(/<[^>]+>/g, ' ').toLowerCase();

describe('tour page', () => {
  it('has three panels', () => {
    expect(html.match(/class="panel[ "]/g)).toHaveLength(3);
  });

  it('only points at pictures that exist', () => {
    const local = [...html.matchAll(/(?:src|srcset)="\.\/([^"]+)"/g)].map((m) => m[1]);
    expect(local.length).toBeGreaterThanOrEqual(5);
    for (const f of local) expect(existsSync(f), f).toBe(true);
    const share = html.match(/og:image" content="https:\/\/keyflame\.org\/tour\/([^"]+)"/)?.[1];
    expect(share && existsSync(share)).toBe(true);
  });

  it('gives every picture a description', () => {
    for (const img of html.match(/<img [^>]+>/g) ?? []) expect(img).toMatch(/alt="[^"]{20,}"/);
  });

  it('stays clear of borrowed names and touchy words', () => {
    const banned = ['wings of fire', 'skywing', 'mudwing', 'seawing', 'rainwing', 'icewing', 'sandwing', 'nightwing', 'silkwing', 'hivewing', 'leafwing', 'battle', 'war ', 'kill'];
    for (const w of banned) expect(text, w).not.toContain(w);
  });

  it('is left out of the offline game cache', () => {
    expect(viteConfig).toContain("!f.startsWith('tour/')");
  });
});
