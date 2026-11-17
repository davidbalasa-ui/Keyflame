// Accessibility check (KF-19): runs axe-core (WCAG 2 A and AA rules) on the main kid and
// grown-up screens at phone and iPad sizes, and checks tap targets are at least 44 px.
// Run: npm run build && npm run check:a11y   (needs Playwright with Chromium and axe-core:
// npm i --no-save axe-core)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
let axeSource;
try {
  playwright = require('playwright');
  axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
} catch {
  console.error('Needs Playwright and axe-core: npm i --no-save playwright axe-core && npx playwright install chromium');
  process.exit(2);
}

const PORT = 4185;
const URL = `http://localhost:${PORT}/`;
const SIZES = [
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'iPad', width: 820, height: 1180, touch: true },
];
const GATE = 'GATE';
const SCREENS = [
  ['home', []],
  ['settings', ['.tab-settings']],
  ['progress', ['.tab-progress']],
  ['achievements', ['.tab-progress', '.ach-link']],
  ['grown-ups', ['.tab-grownups', GATE]],
  ['season', ['.season-btn']],
  ['lessons', ['.tile-lessons']],
  ['lesson', ['.tile-lessons', '.lesson-tile >> nth=0']],
  ['course map', ['.tile-race']],
  ['race', ['.tile-race', '.course-card >> nth=0']],
  ['wing', ['.class-chip']],
  ['nest', ['.tab-dragon']],
  ['codex', ['.tab-dragon', '.seg >> nth=1']],
];
// Rules about things a kids' game decides on purpose: the decorative race scene and
// art inside buttons are hidden from screen readers already.
const SKIP_RULES = new Set(['region']);

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);
for (let i = 0; i < 50; i++) {
  try {
    await fetch(URL);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

async function answerGate(page) {
  await page.fill('.gate-input', '1985');
  await page.locator('.modal').getByRole('button', { name: 'Continue' }).click();
}

const ENGINE = process.env.BROWSER === 'webkit' ? 'webkit' : 'chromium';
const browser = await playwright[ENGINE].launch();
const failures = [];
for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.touch, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  for (const [name, clicks] of SCREENS) {
    await page.goto(URL);
    await page.waitForSelector('.play-cards');
    try {
      for (const sel of clicks) await (sel === GATE ? answerGate(page) : page.click(sel, { timeout: 3000 }));
    } catch {
      failures.push(`${size.name} ${name}: could not open the screen`);
      continue;
    }
    await page.waitForTimeout(300);
    await page.addScriptTag({ content: axeSource });
    const res = await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      return r.violations.map((v) => ({ id: v.id, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')), count: v.nodes.length }));
    });
    for (const v of res) if (!SKIP_RULES.has(v.id)) failures.push(`${size.name} ${name}: ${v.id} (${v.count}) ${v.help} -> ${v.nodes.join(' | ')}`);
    // Tap targets: every visible button and link at least 44 x 44, unless it's inline text.
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, a[href], [role=button]')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return false;
          if (el.closest('.keyboard, .type-text, .tab-mid')) return false; // keys follow the real keyboard layout
          if (el.classList.contains('link')) return false; // inline text links
          return r.width < 43.5 || r.height < 43.5;
        })
        .slice(0, 4)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`),
    );
    if (small.length) failures.push(`${size.name} ${name}: tap targets under 44px: ${small.join(', ')}`);
  }
  await ctx.close();
}
await browser.close();
stop();

if (failures.length) {
  console.error('Accessibility problems:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log(`Accessible: no WCAG 2.1 A/AA problems found by axe and every tap target is at least 44px, on ${SCREENS.length} screens at ${SIZES.length} sizes.`);
