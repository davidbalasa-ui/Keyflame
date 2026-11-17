// Fails if a kid can get stuck: every screen must reach Home and the Nest in one tap,
// finish screens included, and play screens must have a way out.
// Run: npm run build && npm run check:nav   (needs Playwright with Chromium installed)
// SHOTS=some/folder saves a screenshot of every screen at every size.
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

const PORT = 4183;
const URL = `http://localhost:${PORT}/`;
const SIZES = [
  { name: 'phone', width: 360, height: 740 },
  { name: 'iPad upright', width: 820, height: 1180, tablet: true },
  { name: 'iPad sideways', width: 1180, height: 820, tablet: true },
  { name: 'PC 1366', width: 1366, height: 768, pc: true },
];
const SHOTS = process.env.SHOTS;
if (SHOTS) (await import('node:fs')).mkdirSync(SHOTS, { recursive: true });

const HOME = '.tab-home, .fin-home, .top-back.to-home';
const NEST = '.tab-dragon, .fin-nest, .hero-open';
const GATE = 'GATE';

// [name, clicks from home, what must be one tap away]
const SCREENS = [
  ['home', [], { nest: true }],
  ['settings', ['.tab-settings'], { home: true, nest: true }],
  ['progress', ['.tab-progress'], { home: true, nest: true }],
  ['achievements', ['.tab-progress', '.ach-link'], { home: true, nest: true }],
  ['grown-ups', ['.tab-grownups', GATE], { home: true, nest: true }],
  ['season', ['.season-btn'], { home: true, nest: true }],
  ['lessons', ['.tile-lessons'], { home: true, nest: true }],
  ['course map', ['.tile-race'], { home: true, nest: true }],
  ['wing', ['.class-chip'], { home: true, nest: true }],
  ['nest', ['.tab-dragon'], { home: true }],
  ['codex', ['.tab-dragon', '.seg >> nth=1'], { home: true }],
  ['lesson', ['.tile-lessons', '.lesson-tile >> nth=0'], { exit: true }],
  ['race', ['.tile-race', '.course-card >> nth=0'], { exit: true }],
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

/** True when an element matching sel is on screen and not covered, so one tap reaches it. */
const tappable = (page, sel) =>
  page.evaluate((sel) => {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
      const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
      const y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
      const top = document.elementFromPoint(x, y);
      if (top && (el === top || el.contains(top))) return true;
    }
    return false;
  }, sel);

async function answerGate(page) {
  await page.fill('.gate-input', '1985');
  await page.locator('.modal').getByRole('button', { name: 'Continue' }).click();
}

/** Types whatever the typing view shows until the run ends. */
async function typeAll(page) {
  for (let i = 0; i < 6; i++) {
    const text = await page.evaluate(() => document.querySelector('.type-text')?.textContent ?? '');
    if (!text) return;
    await page.keyboard.type(text, { delay: 5 });
    await page.waitForTimeout(300);
    if (await page.locator('.celebrate, .lesson-result').count()) return;
  }
}

const browser = await playwright.chromium.launch();
const failures = [];
let checks = 0;
for (const size of SIZES) {
  const label = `${size.name} (${size.width}x${size.height})`;
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: !size.pc, isMobile: !size.pc, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const expect = async (name, need) => {
    checks++;
    if (need.home && !(await tappable(page, HOME))) failures.push(`${label} ${name}: no Home button in one tap`);
    if (need.nest && !(await tappable(page, NEST))) failures.push(`${label} ${name}: no Nest button in one tap`);
    if (need.exit && !(await tappable(page, '.top-back'))) failures.push(`${label} ${name}: no way out`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${size.name.replace(/\W+/g, '-')}-${name.replace(/\W+/g, '-')}.png` });
  };
  await page.goto(URL);
  await page.waitForSelector('.play-cards');
  // A new rider is shown where the nest is until they open it once.
  if (!(await page.locator('.hero-hand .tap-hand').count())) failures.push(`${label} home: no tapping finger on the nest for a new rider`);
  if (!(await page.locator('.tab-mid-label', { hasText: 'Nest' }).isVisible())) failures.push(`${label} home: the middle tab does not say Nest`);

  for (const [name, clicks, need] of SCREENS) {
    await page.goto(URL);
    await page.waitForSelector('.play-cards');
    try {
      for (const sel of clicks) await (sel === GATE ? answerGate(page) : page.click(sel, { timeout: 3000 }));
    } catch {
      failures.push(`${label} ${name}: could not open the screen`);
      continue;
    }
    await page.waitForTimeout(200);
    await expect(name, need);
  }

  // Finish a lesson, then check the results, then make sure Home really goes home.
  await page.goto(URL);
  await page.click('.tile-lessons');
  await page.click('.lesson-tile >> nth=0');
  await typeAll(page);
  if (await page.locator('.lesson-result').count()) {
    await expect('lesson results', { home: true, nest: true });
    await page.click('.lesson-result .fin-home');
    if (!(await page.locator('.play-cards').count())) failures.push(`${label} lesson results: Home did not go home`);
  } else failures.push(`${label}: could not finish a lesson`);

  // Finish a race; tapping skips the celebration so its buttons show.
  await page.goto(URL);
  await page.click('.tile-race');
  await page.click('.course-card >> nth=0');
  await page.waitForTimeout(3500); // the countdown
  await typeAll(page);
  const cel = await page.waitForSelector('.celebrate', { timeout: 8000 }).catch(() => null);
  if (cel) {
    await page.mouse.click(5, 5);
    await page.waitForSelector('.celebrate.done', { timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(500);
    // The bar is sticky at the bottom of the results panel, so it is on screen without scrolling.
    await expect('race results', { home: true, nest: true });
    await page.click('.celebrate .fin-nest');
    if (!(await page.locator('.nest-panel, .seg-tabs').count())) failures.push(`${label} race results: Nest did not open the nest`);
  } else failures.push(`${label}: could not finish a race`);

  // The finger goes away once the nest has been opened.
  await page.goto(URL);
  await page.waitForSelector('.play-cards');
  if (await page.locator('.hero-hand').count()) failures.push(`${label} home: the nest finger stays after the nest was opened`);
  await ctx.close();
}
await browser.close();
stop();

if (failures.length) {
  console.error('Kids could get stuck:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log(`No dead ends: ${checks} screen checks at ${SIZES.length} sizes reach Home and the Nest in one tap, and play screens have a way out.`);
