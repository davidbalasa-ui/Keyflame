// Dev tool: draws dragons into a contact sheet, prints shape counts, and can
// measure frame rate at iPad size with a 4x CPU slowdown.
// Run: npx vite-node scripts/art-preview.ts -- [tribe,...] [--out dir] [--fps]
// Writes <out>/sheet.html and sheet.png (default out: art-preview/).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { dragonSvg, eggSvg, TRIBES, MARKINGS, type TribeId, type Stage } from '../src/game/dragons';

const args = process.argv.slice(2).filter((a) => a !== '--');
const outIdx = args.indexOf('--out');
const out = resolve(outIdx >= 0 ? args[outIdx + 1] : 'art-preview');
const fps = args.includes('--fps');
const pick = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
const tribes = (pick ? pick.split(',') : Object.keys(TRIBES)) as TribeId[];
const shapes = (s: string): number => (s.match(/<(path|ellipse|circle|rect|polygon|polyline|line)\b/g) ?? []).length;
const STAGES: Stage[] = ['hatchling', 'young', 'adult'];

let cells = '';
for (const t of tribes) {
  const counts = STAGES.map((st) => (['race', 'full', 'portrait'] as const).map((d) => shapes(dragonSvg(t, 0, st, '', undefined, 0, 0, d))).join('/')).join(' · ');
  console.log(`${t.padEnd(12)} race/full/portrait by age: ${counts}`);
  cells += `<h2>${TRIBES[t].name} <small>${counts}</small></h2><div class="row">`;
  for (const st of STAGES) cells += `<div class="cell">${dragonSvg(t, 0, st, 'flap')}<span>${st}</span></div>`;
  cells += `<div class="cell big">${dragonSvg(t, 0, 'adult', '', undefined, 0, 0, 'portrait')}<span>portrait</span></div></div><div class="row">`;
  TRIBES[t].palettes.forEach((p, i) => {
    cells += `<div class="cell sm">${dragonSvg(t, i, 'adult', '', undefined, i % 3, i === 3 ? 4 : 0)}<span>${MARKINGS[i % 3]} ${p.name}${i === 3 ? ' ★4' : ''}</span></div>`;
  });
  cells += `<div class="cell sm">${dragonSvg(t, 0, 'adult', '', undefined, 0, 0, 'race')}<span>race</span></div>`;
  cells += [0, 0.5, 1].map((w) => `<div class="cell egg">${eggSvg(t, w, 3)}<span>egg ${w * 100}%</span></div>`).join('');
  cells += '</div>';
}
const css = readFileSync('src/styles.css', 'utf8');
const html = `<!doctype html><meta charset="utf-8"><style>${css}
body{background:#2a2150;color:#fff;font:14px sans-serif;padding:12px;overflow:visible;height:auto}
h2{margin:14px 0 4px;font-size:18px} h2 small{font-size:11px;opacity:.7}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
.cell{background:#3b2f73;border-radius:10px;padding:6px;text-align:center;width:260px}.cell svg{width:100%;height:auto}
.cell.big{width:420px}.cell.sm{width:190px}.cell.egg{width:90px}.cell span{display:block;font-size:11px;opacity:.8}</style><body>${cells}</body>`;
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/sheet.html`, html);

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(`file://${out}/sheet.html`);
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/sheet.png`, fullPage: true });
console.log(`wrote ${out}/sheet.png`);

if (fps) {
  // Six flapping adults on an iPad-size screen, like a race, at 4x CPU slowdown.
  for (const [label, detail, n] of [['6 race-size', 'race', 6], ['6 full', 'full', 6], ['1 portrait', 'portrait', 1]] as const) {
    const p2 = await browser.newPage({ viewport: { width: 1180, height: 820 } });
    const cdp = await p2.context().newCDPSession(p2);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const w = n === 1 ? 1000 : 360;
    const items = Array.from({ length: n }, (_, i) => `<div style="width:${w}px;display:inline-block">${dragonSvg(tribes[i % tribes.length], i % 4, 'adult', 'flap bob', undefined, i % 3, i % 5, detail)}</div>`).join('');
    await p2.setContent(`<!doctype html><style>${css} body{overflow:visible;height:auto}</style><body>${items}</body>`);
    const res = await p2.evaluate(() => new Promise<number>((done) => {
      let frames = 0;
      const t0 = performance.now();
      const tick = (): void => {
        frames++;
        if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
        else done((frames * 1000) / (performance.now() - t0));
      };
      requestAnimationFrame(tick);
    }));
    console.log(`fps (iPad size, 4x CPU slowdown) ${label}: ${res.toFixed(0)}`);
    await p2.close();
  }
}
await browser.close();
