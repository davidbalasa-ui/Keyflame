// Typing checks in a real browser (Chromium):
//   1. The one-minute typing check stops taking keys when the minute is up: the letters
//      stop moving and the results show, even if the player keeps typing.
//   2. Typing in a race and a lesson doesn't make the browser restyle the whole page.
//      A :has() rule on #app once made every key and every race frame restyle all of it,
//      which froze typing on slower computers. This counts big style passes while typing.
// Run: npm run build && npm run check:typing
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  console.error('Playwright is not installed. Install it with: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const PORT = 4191;
const URL = `http://localhost:${PORT}/`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 50; i++) {
  try {
    await fetch(URL);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

const browser = await playwright.chromium.launch();
const failures = [];
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`FAIL ${name}: ${String(e.message).split('\n')[0]}`);
  }
};
// A laptop screen, the kind the freezes were seen on.
const open = async (clock = false) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 625 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (clock) await page.clock.install();
  await page.goto(URL);
  await page.waitForSelector('.play-cards');
  return { ctx, page, errors };
};
const cursor = (page) => page.evaluate(() => [...document.querySelectorAll('.type-text .ch')].findIndex((c) => c.classList.contains('current')));
const typeNext = async (page, n) => {
  for (let i = 0; i < n; i++) {
    const ch = await page.evaluate(() => document.querySelector('.type-text .ch.current')?.textContent ?? null);
    if (ch === null) return;
    await page.keyboard.type(ch);
    await page.waitForTimeout(60);
  }
};

await check('typing check stops when the minute is up', async () => {
  const { ctx, page, errors } = await open(true);
  await page.click('.tile-lessons');
  await page.click('.placement-cta button');
  await page.waitForSelector('.type-text');
  await typeNext(page, 10);
  const before = await cursor(page);
  if (before < 10) throw new Error(`typing did not start (cursor at ${before})`);
  // Jump to one second before the end: still typing.
  await page.clock.runFor(59000);
  await typeNext(page, 3);
  if ((await cursor(page)) !== before + 3) throw new Error('keys stopped counting before the minute was up');
  // Past the end of the minute, without waiting for the screen's own clock to notice.
  await page.clock.fastForward(1500);
  const atEnd = await cursor(page);
  await typeNext(page, 8);
  await page.waitForSelector('.modal h2:has-text("Check complete")', { timeout: 3000 });
  const after = await cursor(page);
  if (after !== atEnd) throw new Error(`typing kept going after time was up (cursor ${atEnd} -> ${after})`);
  const live = await page.textContent('.live-stats');
  if (!/time/i.test(live ?? '')) throw new Error(`the clock line does not say time is up: "${live}"`);
  if (errors.length) throw new Error(errors[0]);
  await ctx.close();
});

/** Big style passes (over 300 elements) while typing `keys` keys on the open screen. */
async function bigRestyles(page, keys) {
  const dir = mkdtempSync(join(tmpdir(), 'kf-trace-'));
  const path = join(dir, 'trace.json');
  await browser.startTracing(page, { path, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
  await typeNext(page, keys);
  await browser.stopTracing();
  const events = JSON.parse(readFileSync(path, 'utf8')).traceEvents;
  rmSync(dir, { recursive: true, force: true });
  return events.filter((e) => e.name === 'UpdateLayoutTree' && e.ph === 'X' && (e.args?.elementCount ?? 0) > 300).length;
}

// Before the fix: about one big pass per frame in a race (80+ in this many keys) and one per
// key in a lesson. After it: a few at most (a line of text scrolling, the stats line).
await check('race typing does not restyle the whole page', async () => {
  const { ctx, page, errors } = await open();
  await page.click('.tile-race');
  await page.click('.course-card >> nth=0');
  await page.waitForTimeout(3800);
  const big = await bigRestyles(page, 40);
  if (big > 8) throw new Error(`${big} big style passes while typing 40 keys (want 8 or fewer)`);
  if (errors.length) throw new Error(errors[0]);
  await ctx.close();
});

await check('lesson typing does not restyle the whole page', async () => {
  const { ctx, page, errors } = await open();
  await page.click('.tile-lessons');
  await page.click('.lesson-tile >> nth=0');
  await page.waitForSelector('.type-text');
  await page.waitForTimeout(500);
  const big = await bigRestyles(page, 40);
  if (big > 8) throw new Error(`${big} big style passes while typing 40 keys (want 8 or fewer)`);
  if (errors.length) throw new Error(errors[0]);
  await ctx.close();
});

await check('computer layout turns on in a race and off after it', async () => {
  const { ctx, page } = await open();
  await page.click('.tile-race');
  await page.click('.course-card >> nth=0');
  await page.waitForSelector('.type-text');
  if (!(await page.evaluate(() => document.getElementById('app').classList.contains('kb-typing')))) throw new Error('#app is not marked during a keyboard race');
  await page.click('.top-back');
  await page.waitForSelector('.course-card, .play-cards');
  if (await page.evaluate(() => document.getElementById('app').classList.contains('kb-typing'))) throw new Error('#app stayed marked after leaving the race');
  await ctx.close();
});

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} typing check(s) failed.`);
  process.exit(1);
}
console.log('\nAll typing checks passed.');
process.exit(0);
