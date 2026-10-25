// Fails if any screen scrolls sideways on a phone. Every screen should fit the width;
// only vertical scrolling is allowed.
// Run: npm run build && npm run check:overflow   (needs Playwright with Chromium installed)
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
const WIDTHS = [320, 360, 412];

// Each step opens one screen from the hub by clicking what a player would click.
const SCREENS = [
  ['hub', []],
  ['settings', ['text=Settings and backup']],
  ['progress', ['text=My progress']],
  ['supporter', ['text=Support Keyflame']],
  ['lessons', ['.tile-lessons']],
  ['lesson', ['.tile-lessons', '.lesson-tile >> nth=0']],
  ['race map', ['.tile-race']],
  ['race', ['.tile-race', '.course-card >> nth=0']],
  ['nest', ['.tile-nest']],
  ['codex', ['.tile-codex']],
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

const browser = await playwright.chromium.launch();
const failures = [];
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL);
  const check = async (name) => {
    const o = await overflow(page);
    if (o.scrollW > o.vw) failures.push(`${width}px ${name}: page is ${o.scrollW}px wide (${o.wide.join(', ') || 'unknown element'})`);
  };
  await check('title');
  await page.click('.profile-card.new');
  await check('new rider');
  await page.click('.modal .btn:not(.ghost)');
  await page.waitForTimeout(600); // let the save land before reloading
  for (const [name, clicks] of SCREENS) {
    await page.goto(URL);
    await page.click('.profile-card:not(.new)');
    try {
      for (const sel of clicks) await page.click(sel, { timeout: 3000 });
    } catch {
      failures.push(`${width}px ${name}: could not open the screen`);
      continue;
    }
    await page.waitForTimeout(150);
    await check(name);
  }
  await ctx.close();
}
await browser.close();
stop();

if (failures.length) {
  console.error('Sideways scrolling found:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log(`No sideways scrolling on ${SCREENS.length + 2} screens at ${WIDTHS.join(', ')}px.`);
