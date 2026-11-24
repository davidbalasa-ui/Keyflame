// Walks the main kid flows end to end, the way a kid would tap through them, and fails on
// any page error or a step that doesn't land where it should:
//   new rider: home -> nest finger -> nest, a lesson to its results -> Nest,
//              a race to its results -> Race again -> back out
//   grown rider (all 20 lessons passed, egg ready): Daily flight Go opens a word challenge,
//              finish it -> next level opens, hatch the egg with taps, pick a name with
//              the dice, Done, then rename it from the nest card, then get a new egg in one tap
//   full basket (egg in the nest, 3 waiting): the Codex still sells eggs, the 4th waits too,
//              and waiting eggs of one tribe show as one egg with a count
// Sizes: iPad upright, iPad sideways and a phone.
// BROWSER=webkit runs it in Safari's engine (what iPads use); the default is Chromium.
// Run: npm run build && npm run check:flows   SHOTS=folder saves screenshots.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  console.error('Playwright is not installed. Install it with: npm i -D playwright && npx playwright install chromium webkit');
  process.exit(2);
}

const ENGINE = process.env.BROWSER === 'webkit' ? 'webkit' : 'chromium';
const PORT = 4187;
const URL = `http://localhost:${PORT}/`;
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SIZES = [
  { name: 'iPad upright', width: 820, height: 1180, ua: IPAD_UA },
  { name: 'iPad sideways', width: 1180, height: 820, ua: IPAD_UA },
  { name: 'phone', width: 390, height: 844, ua: IPHONE_UA },
];
const SHOTS = process.env.SHOTS;
if (SHOTS) (await import('node:fs')).mkdirSync(SHOTS, { recursive: true });

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

/** A rider who has passed all 20 lessons and has an egg ready to hatch. */
function grownSave(extra = {}) {
  const lessons = {};
  for (let i = 1; i <= 20; i++) lessons[`L${i}`] = { stars: 2, bestWpm: 15, bestAccuracy: 0.96 };
  const p = {
    id: 'flowrider1',
    name: 'Brave Flyer',
    createdAt: Date.now() - 864e5 * 30,
    embers: 300,
    starsBackfilled: true,
    lessons,
    keyStats: {},
    totals: { correctKeys: 20000, races: 40, lessons: 30, bestWpm: 15, bestTouchWpm: 0, minutes: 200, wins: 10, cleanRaces: 5, perfectRaces: 1, embersEarned: 2000, playDays: 20 },
    nest: { tribe: 'tidefin', warmth: 999999, seed: 12345 },
    basket: [],
    dragons: [],
    activeDragonId: null,
    unitsRewarded: ['home', 'top', 'bottom', 'sentences'],
    races: [],
    daily: { date: '2000-01-01', races: 0, lessons: 0 },
    lastBackupAt: Date.now(),
    settings: { sound: false, reducedMotion: false, dyslexiaFont: false, largeText: false, showKeyboard: true, input: 'auto', relaxed: false, readingLevel: null },
    milestones: [],
    rivalsBeaten: [],
    decor: [],
    supporter: false,
    factsSeen: [],
    title: null,
    setsClaimed: [],
    achievements: [],
    nestSeen: true,
    ...extra,
  };
  return JSON.stringify({ version: 99, activeId: p.id, profiles: [p] });
}

/** Types whatever the typing view shows until the run ends. */
async function typeAll(page, done) {
  for (let i = 0; i < 8; i++) {
    const text = await page.evaluate(() => document.querySelector('.type-text')?.textContent ?? '');
    if (!text) return;
    await page.keyboard.type(text, { delay: 5 });
    await page.waitForTimeout(400);
    if (await page.locator(done).count()) return;
  }
}

const browser = await playwright[ENGINE].launch();
const failures = [];
let steps = 0;
for (const size of SIZES) {
  const label = `${size.name} (${size.width}x${size.height})`;
  const errors = [];
  const fresh = async (seed) => {
    const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: true, isMobile: ENGINE !== 'firefox', userAgent: size.ua, serviceWorkers: 'block' });
    if (seed) await ctx.addInitScript((s) => localStorage.getItem('keyflame-save') || localStorage.setItem('keyflame-save', s), seed);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => d.dismiss());
    await page.goto(URL);
    await page.waitForSelector('.play-cards', { timeout: 10000 });
    return { ctx, page };
  };
  const step = async (page, name, fn) => {
    steps++;
    try {
      await fn();
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${ENGINE}-${size.name.replace(/\W+/g, '-')}-${name.replace(/\W+/g, '-')}.png` });
    } catch (e) {
      failures.push(`${label} ${name}: ${String(e.message).split('\n')[0]}`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/FAIL-${ENGINE}-${size.name.replace(/\W+/g, '-')}-${name.replace(/\W+/g, '-')}.png` }).catch(() => {});
    }
  };
  const must = async (page, sel, what, timeout = 6000) => {
    if (!(await page.waitForSelector(sel, { timeout, state: 'visible' }).catch(() => null))) throw new Error(what);
  };

  // New rider.
  {
    const { ctx, page } = await fresh(null);
    await step(page, 'nest finger opens the nest', async () => {
      await page.click('.hero-open');
      await must(page, '.nest-panel', 'the nest did not open');
      await page.click('.tab-home');
      await must(page, '.play-cards', 'Home tab did not go home');
    });
    await step(page, 'lesson to results to Nest', async () => {
      await page.click('.tile-lessons');
      await page.click('.lesson-tile >> nth=0');
      await must(page, '.type-text', 'the lesson did not start');
      await typeAll(page, '.lesson-result');
      await must(page, '.lesson-result', 'no lesson results');
      await page.click('.lesson-result .fin-nest');
      await must(page, '.nest-panel', 'Nest on lesson results did not open the nest');
    });
    await step(page, 'race to results to Race again', async () => {
      await page.click('.tab-home');
      await page.click('.tile-race');
      await page.click('.course-card >> nth=0');
      await page.waitForTimeout(3500);
      await typeAll(page, '.celebrate');
      await must(page, '.celebrate', 'no race results', 10000);
      await page.mouse.click(5, 5);
      await must(page, '.celebrate .fin-go', 'no Race again button');
      await page.waitForTimeout(500);
      await page.click('.celebrate .fin-go');
      await must(page, '.type-text', 'Race again did not start a race');
      await page.click('.top-back');
      await must(page, '.course-card, .play-cards', 'back from a race went nowhere');
    });
    await ctx.close();
  }

  // Grown rider: word challenges, hatching and naming.
  {
    const { ctx, page } = await fresh(grownSave());
    await step(page, 'daily flight opens a word challenge', async () => {
      await page.click('.daily-card.go');
      await must(page, '.type-text', 'Daily flight Go did not start anything');
      await typeAll(page, '.lesson-result');
      await must(page, '.lesson-result', 'no challenge results');
      await must(page, '.lesson-result .fin-hatch-main', 'a ready egg did not make Hatch! the main results button');
      await page.click('.lesson-result .fin-home');
      await must(page, '.play-cards', 'Home on challenge results did not go home');
    });
    await step(page, 'next challenge level opens', async () => {
      await page.click('.tile-lessons');
      await must(page, '.pack-grid', 'no word challenges on the lessons screen');
      const open = await page.locator('.pack-level:not(.locked)').count();
      if (open < 7) throw new Error(`expected 7 open challenge levels after passing one, found ${open}`);
    });
    await step(page, 'hatch the egg with taps', async () => {
      // One tap on the ready egg at home goes straight to cracking it.
      await page.click('.tab-home');
      await must(page, '.egg-chip.ready', 'home does not say the egg is ready');
      await page.click('.hero-open');
      await must(page, '.hatch-screen', 'tapping the ready egg at home did not start the hatch');
      for (let i = 0; i < 6 && (await page.locator('.hatch-tap').count()); i++) {
        await page.click('.hatch-screen', { position: { x: Math.round(size.width / 2), y: Math.round(size.height / 2) } });
        await page.waitForTimeout(250);
      }
      await must(page, '.hatch-details', 'the dragon card did not show after hatching', 8000);
    });
    let picked = '';
    await step(page, 'pick a name with the dice', async () => {
      const before = await page.textContent('.hatch-name');
      await page.click('.hatch-details .die');
      await page.waitForTimeout(400);
      picked = ((await page.textContent('.hatch-name')) ?? '').replace(/^Meet |!$/g, '');
      if (!picked || `Meet ${picked}!` === before) throw new Error('the dice did not change the name');
      await page.locator('.hatch-details').getByRole('button', { name: 'Done' }).click();
      await must(page, '.dc-rename', 'no dragon card in the nest after Done');
      const shown = await page.textContent('.dc-rename .dc-name');
      if (!shown?.startsWith(picked)) throw new Error(`nest shows "${shown}", picked "${picked}"`);
    });
    await step(page, 'rename from the nest card', async () => {
      await page.click('.dc-rename');
      await must(page, '.modal.rename', 'the rename sheet did not open');
      await page.click('.modal.rename .die');
      await page.waitForTimeout(300);
      await page.locator('.modal.rename').getByRole('button', { name: 'Done' }).click();
      await page.waitForTimeout(300);
      if (await page.locator('.modal.rename').count()) throw new Error('the rename sheet did not close');
      const after = await page.textContent('.dc-rename .dc-name');
      if (after?.startsWith(picked)) throw new Error('the name did not change');
      await page.reload();
      await page.waitForSelector('.play-cards');
      await page.click('.tab-dragon');
      const kept = await page.textContent('.dc-rename .dc-name');
      if (kept !== after) throw new Error(`the new name was not saved (${kept} vs ${after})`);
    });
    await step(page, 'empty nest: one tap gets a new egg', async () => {
      await must(page, '.shop-egg:not([disabled])', 'the empty nest offers no egg to get');
      await page.click('.shop-egg:not([disabled])');
      await must(page, '.nest-panel .warmth', 'the new egg did not land in the nest');
      await must(page, '.egg-landed', 'the nest did not say the egg landed');
    });
    await ctx.close();
  }
  {
    const tidefin = { id: 'tide1', tribe: 'tidefin', palette: 0, marking: 0, name: 'Wave', xp: 0, hatchedAt: Date.now() - 864e5 };
    const { ctx, page } = await fresh(grownSave({ embers: 1000, nest: { tribe: 'tidefin', warmth: 10, seed: 7 }, basket: ['tidefin', 'tidefin', 'tidefin'], dragons: [tidefin], activeDragonId: 'tide1' }));
    await step(page, 'with 3 eggs waiting the Codex still sells eggs', async () => {
      await page.click('.tab-dragon');
      await must(page, '.basket-egg .egg-count', 'three waiting eggs of one tribe do not show as one egg with a count');
      await page.click('.seg-tabs .seg:not(.on)');
      await must(page, '#tribe-tidefin .codex-buy', 'the Codex shows no egg to buy');
      const buy = page.locator('#tribe-tidefin .codex-buy button');
      if (await buy.isDisabled()) throw new Error('the egg button is disabled with 3 eggs waiting');
      if (/full/i.test((await page.textContent('#tribe-tidefin .codex-buy')) ?? '')) throw new Error('the Codex still says the basket is full');
      await buy.click();
      await must(page, '.modal-backdrop', 'buying a 4th egg showed nothing');
    });
    await step(page, 'the 4th egg waits in the nest too', async () => {
      await page.click('.modal-backdrop .row button:last-child');
      await must(page, '.basket-egg', 'the nest shows no waiting eggs');
      const count = await page.textContent('.basket-egg .egg-count');
      if (count !== '×4') throw new Error(`the waiting eggs say "${count}", expected ×4`);
      await page.click('.basket-egg');
      await page.waitForTimeout(300);
      const left = await page.textContent('.basket-egg .egg-count');
      if (left !== '×4') throw new Error(`after a swap the waiting eggs say "${left}"`);
    });
    await ctx.close();
  }
  for (const e of new Set(errors)) failures.push(`${label} page error: ${e}`);
}
await browser.close();
stop();

if (failures.length) {
  console.error(`${ENGINE}: flows broke:\n  ` + failures.join('\n  '));
  process.exit(1);
}
console.log(`${ENGINE}: ${steps} kid flows work end to end at ${SIZES.length} sizes (lessons, races, word challenges, hatching, naming), with no page errors.`);
