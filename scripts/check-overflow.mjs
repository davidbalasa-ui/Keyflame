// Fails if any screen scrolls sideways on a phone or tablet. Every screen should fit the
// width; only vertical scrolling is allowed. On tablets it also checks that pressing a real
// key (an iPad in a keyboard case) puts the tap keyboard away.
// Run: npm run build && npm run check:overflow   (needs Playwright with Chromium installed)
// BROWSER=webkit uses Safari's engine instead (npx playwright install webkit).
// SHOTS=some/folder saves a screenshot of every screen at every size.
// No emulator shows the iPad's own on-screen keyboard; that still needs a real iPad.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  console.error('Playwright is not installed. Install it with: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
// Phones, then iPads (mini, 10.2", Air 11", Pro 12.9") held upright and sideways.
const SIZES = [
  { name: 'phone 320', width: 320, height: 740 },
  { name: 'phone 360', width: 360, height: 740 },
  { name: 'phone 412', width: 412, height: 740 },
  ...[
    ['iPad mini', 744, 1133],
    ['iPad 10.2', 810, 1080],
    ['iPad Air', 820, 1180],
    ['iPad Pro 12.9', 1024, 1366],
  ].flatMap(([name, w, h]) => [
    { name: `${name} upright`, width: w, height: h, tablet: true },
    { name: `${name} sideways`, width: h, height: w, tablet: true },
  ]),
];
const ENGINE = process.env.BROWSER === 'webkit' ? 'webkit' : 'chromium';
const SHOTS = process.env.SHOTS;
if (SHOTS) (await import('node:fs')).mkdirSync(SHOTS, { recursive: true });

// Each step opens one screen from the hub by clicking what a player would click.
// GATE answers the grown-up question.
const GATE = 'GATE';
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
async function answerGate(page) {
  const q = await page.textContent('.modal', { timeout: 3000 });
  const m = q.match(/What is (\w+) times (\w+)/);
  await page.fill('.gate-input', String(NUMBER_WORDS.indexOf(m[1]) * NUMBER_WORDS.indexOf(m[2])));
  await page.click('.modal .btn:not(.ghost)');
}
const SCREENS = [
  ['hub', []],
  ['settings', ['.tab-settings']],
  ['progress', ['.tab-progress']],
  ['achievements', ['.tab-progress', '.ach-card']],
  ['ideas', ['.tab-settings', 'text=Send an idea or bug']],
  ['grown-ups', ['.tab-grownups', GATE]],
  ['family', ['.tab-grownups', GATE, '.gu-family']],
  ['supporter', ['.tab-grownups', GATE, '.gu-support']],
  ['season', ['.season-btn']],
  ['lessons', ['.tile-lessons']],
  ['lesson', ['.tile-lessons', '.lesson-tile >> nth=0']],
  ['race map', ['.tile-race']],
  ['race', ['.tile-race', '.course-card >> nth=0']],
  ['class join', ['.class-chip']],
  ['nest', ['.tab-dragon']],
  ['codex', ['.tab-dragon', '.seg >> nth=1']],
];

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

const overflow = (page) =>
  page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > vw + 1 && getComputedStyle(el).position !== 'fixed')
      .filter((el) => !el.closest('.track, .tbl'))
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
    return { scrollW: document.documentElement.scrollWidth, vw, wide };
  });

const browser = await playwright[ENGINE].launch();
const failures = [];
for (const size of SIZES) {
  const { width, height } = size;
  const label = `${size.name} (${width}x${height})`;
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: ENGINE !== 'firefox', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL);
  const check = async (name) => {
    const o = await overflow(page);
    if (o.scrollW > o.vw) failures.push(`${label} ${name}: page is ${o.scrollW}px wide (${o.wide.join(', ') || 'unknown element'})`);
    if (name === 'hub') {
      // The home screen fits one screen: nothing may be cut off below the tab bar.
      const cut = await page.evaluate(() => {
        const bottom = document.querySelector('.tab-bar')?.getBoundingClientRect().bottom ?? 0;
        const tooTall = [...document.querySelectorAll('.home-top, .hub.home > *, .tab-bar')].some((el) => el.getBoundingClientRect().bottom > innerHeight + 1);
        return tooTall || bottom > innerHeight + 1;
      });
      if (cut) failures.push(`${label} hub: the home screen does not fit without scrolling`);
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${size.name.replace(/\W+/g, '-')}-${name.replace(/\W+/g, '-')}.png` });
  };
  await check('title');
  await page.click('.profile-card.new');
  await check('new rider');
  await page.click('.modal .wp-face >> nth=0');
  await page.waitForSelector('.picker-sheet');
  await check('name sheet');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.picker-backdrop', { state: 'detached' });
  await page.click('.modal .btn:not(.ghost)');
  await page.waitForTimeout(600); // let the save land before reloading
  for (const [name, clicks] of SCREENS) {
    await page.goto(URL);
    await page.click('.profile-card:not(.new)');
    try {
      for (const sel of clicks) await (sel === GATE ? answerGate(page) : page.click(sel, { timeout: 3000 }));
    } catch {
      failures.push(`${label} ${name}: could not open the screen`);
      continue;
    }
    await page.waitForTimeout(150);
    await check(name);
  }
  if (size.tablet) {
    // A touch screen starts with the tap keyboard; one real key press should put it away.
    await page.goto(URL);
    await page.click('.profile-card:not(.new)');
    await page.click('.tile-lessons');
    await page.click('.lesson-tile >> nth=0');
    const tap = await page.waitForSelector('.keyboard.pinned', { timeout: 3000 }).catch(() => null);
    if (!tap) failures.push(`${label}: the tap keyboard did not show on a touch screen`);
    await page.keyboard.press('j');
    await page.waitForTimeout(100);
    if (await page.locator('.keyboard.pinned').count()) failures.push(`${label}: the tap keyboard stayed after a real key press`);
  }
  await ctx.close();
}
await browser.close();
stop();

if (failures.length) {
  console.error('Sideways scrolling found:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log(`${ENGINE}: no sideways scrolling on ${SCREENS.length + 2} screens at ${SIZES.length} sizes, the home screen fits without scrolling, and a real key press puts the tap keyboard away on tablets.`);
