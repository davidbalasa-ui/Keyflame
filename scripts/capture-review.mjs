// Screenshots of every kid, grown-up and teacher screen for an outside review, at phone,
// iPad upright, iPad sideways, laptop and desktop sizes. OUT=folder, SIZE=one folder name only.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const playwright = require('playwright');
const PORT = Number(process.env.PORT ?? 4191);
const URL = `http://localhost:${PORT}/`;
const OUT = process.env.OUT ?? 'review-shots';
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SIZES = [
  { dir: 'phone', width: 412, height: 740, scale: 2, ua: PHONE_UA, touch: true },
  { dir: 'ipad-upright', width: 810, height: 1080, scale: 2, ua: IPAD_UA, touch: true },
  { dir: 'ipad-sideways', width: 1080, height: 810, scale: 2, ua: IPAD_UA, touch: true },
  { dir: 'pc-laptop-1366', width: 1366, height: 768, scale: 1, touch: false },
  { dir: 'pc-desktop-1920', width: 1920, height: 1080, scale: 1, touch: false },
].filter((s) => !process.env.SIZE || s.dir === process.env.SIZE);

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 50; i++) {
  try { await fetch(URL); break; } catch { await new Promise((r) => setTimeout(r, 200)); }
}

function rider({ lessonsPassed, grown }) {
  const lessons = {};
  for (let i = 1; i <= lessonsPassed; i++) lessons[`L${i}`] = { stars: 2, bestWpm: 15, bestAccuracy: 0.96 };
  const now = Date.now();
  const slow = (n, input) => Array.from({ length: n }, (_, i) => ({ at: now - 864e5 * (i + 1), wpm: 4, accuracy: 0.95, place: 3, input, course: 'c1' }));
  const p = {
    id: grown ? 'grownrider' : 'midrider',
    name: grown ? 'Brave Flyer' : 'Swift Comet',
    createdAt: now - 864e5 * 30,
    embers: 140,
    starsBackfilled: true,
    lessons,
    keyStats: {
      a: { hits: 60, misses: 2, totalMs: 60 * 450 },
      s: { hits: 60, misses: 3, totalMs: 60 * 500 },
      d: { hits: 30, misses: 14, totalMs: 30 * 1300 },
      k: { hits: 28, misses: 12, totalMs: 28 * 1250 },
      l: { hits: 40, misses: 9, totalMs: 40 * 1100 },
      f: { hits: 39, misses: 0, totalMs: 39 * 300 },
      j: { hits: 39, misses: 0, totalMs: 39 * 300 },
    },
    totals: { correctKeys: grown ? 20000 : 1800, races: grown ? 40 : 6, lessons: grown ? 30 : 5, bestWpm: 12, bestTouchWpm: 0, minutes: 60, wins: 3, cleanRaces: 1, perfectRaces: 0, embersEarned: 600, playDays: 6 },
    nest: { tribe: 'tidefin', warmth: grown ? 999999 : 400, seed: 12345 },
    basket: [],
    dragons: [],
    activeDragonId: null,
    unitsRewarded: grown ? ['home', 'top', 'bottom', 'sentences'] : [],
    races: [...slow(3, 'keyboard'), ...slow(3, 'touch'), ...slow(3, 'device')],
    lessonLog: [4, 5, 6].map((d) => ({ at: now - 864e5 * d, lesson: 'L10', stars: 1, wpm: 3, accuracy: 0.93 })),
    daily: { date: '2000-01-01', races: 0, lessons: 0 },
    lastBackupAt: now,
    settings: { sound: false, reducedMotion: false, dyslexiaFont: false, largeText: false, showKeyboard: true, input: 'auto', relaxed: false, readingLevel: null },
    milestones: [], rivalsBeaten: [], decor: [], supporter: false, factsSeen: [], title: null, setsClaimed: [], achievements: [],
    nestSeen: true,
  };
  return JSON.stringify({ version: 99, activeId: p.id, profiles: [p] });
}

async function typeAll(page, done) {
  for (let i = 0; i < 20; i++) {
    const text = await page.evaluate(() => document.querySelector('.type-text')?.textContent ?? '');
    if (!text) return;
    await page.keyboard.type(text, { delay: 140 });
    await page.waitForTimeout(400);
    if (await page.locator(done).count()) return;
  }
}

const browser = await playwright.chromium.launch();
const problems = [];
for (const size of SIZES) {
  const dir = `${OUT}/${size.dir}`;
  mkdirSync(dir, { recursive: true });
  const fresh = async (seed) => {
    const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.scale, hasTouch: size.touch, isMobile: size.touch, userAgent: size.ua, serviceWorkers: 'block' });
    if (seed) await ctx.addInitScript((s) => localStorage.getItem('keyflame-save') || localStorage.setItem('keyflame-save', s), seed);
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.dismiss());
    await page.goto(URL);
    await page.waitForSelector('.play-cards', { timeout: 10000 });
    await page.waitForTimeout(600);
    return { ctx, page };
  };
  const shot = async (page, name, fn, settle = 700) => {
    try {
      if (fn) await fn();
      await page.waitForTimeout(settle);
      await page.screenshot({ path: `${dir}/${name}.png` });
    } catch (e) {
      problems.push(`${size.dir} ${name}: ${String(e.message).split('\n')[0]}`);
    }
  };
  const home = async (page) => { await page.goto(URL); await page.waitForSelector('.play-cards'); await page.waitForTimeout(500); };
  const gate = async (page) => { await page.fill('.gate-input', '1985'); await page.locator('.modal').getByRole('button', { name: 'Continue' }).click(); };
  const raceResults = async (page) => {
    await page.click('.course-card >> nth=0');
    await page.waitForTimeout(3500);
    await typeAll(page, '.celebrate');
    await page.waitForSelector('.celebrate', { timeout: 10000 });
    await page.mouse.click(5, 5);
    await page.waitForSelector('.celebrate.done', { timeout: 5000 }).catch(() => null);
  };

  if (!process.env.ONLY_MID) {
  // New rider: first look, first lesson with the hands picture, first finish screens.
  {
    const { ctx, page } = await fresh(null);
    await shot(page, '01-home-new-rider-nest-finger');
    await shot(page, '01b-whos-playing-guest', () => page.click('.home-avatar'));
    await home(page);
    await shot(page, '02-lessons-new-rider', () => page.click('.tile-lessons'));
    await shot(page, '03-first-lesson-hands-picture', () => page.click('.lesson-tile >> nth=0'));
    await shot(page, '04-lesson-results-home-nest-next', async () => { await typeAll(page, '.lesson-result'); await page.waitForSelector('.lesson-result'); });
    await shot(page, '05-nest-from-results', () => page.click('.lesson-result .fin-nest'));
    await shot(page, '06-home-after-nest-seen', () => page.click('.tab-home'));
    await shot(page, '07-race-map-with-tab-bar', () => page.click('.tile-race'));
    await shot(page, '08-race-running', async () => { await page.click('.course-card >> nth=0'); await page.waitForTimeout(3600); await page.keyboard.type('a', { delay: 5 }); });
    await shot(page, '09-race-results-home-nest-race-again', async () => {
      await typeAll(page, '.celebrate');
      await page.waitForSelector('.celebrate', { timeout: 10000 });
      await page.mouse.click(5, 5);
      await page.waitForSelector('.celebrate.done', { timeout: 5000 }).catch(() => null);
    });
    await home(page);
    await shot(page, '10-typing-check', async () => { await page.click('.tile-lessons'); await page.click('.placement-cta .btn'); });
    await shot(page, '11-typing-check-results', async () => {
      await typeAll(page, '.modal');
      await page.waitForSelector('.modal', { timeout: 70000 });
    });
    await ctx.close();
  }

  }
  // Mid rider: main navigation tabs, tricky keys, warm-up, improvement rewards.
  {
    const { ctx, page } = await fresh(rider({ lessonsPassed: 9 }));
    await shot(page, '12-home');
    await shot(page, '13-nest-tab', () => page.click('.tab-dragon'));
    await shot(page, '14-codex', () => page.click('.seg >> nth=1'));
    await home(page);
    await shot(page, '15-progress-tricky-keys', () => page.click('.tab-progress'));
    await shot(page, '16-progress-key-map', () => page.evaluate(() => document.querySelector('.heat-keys')?.scrollIntoView({ block: 'center' })));
    await shot(page, '17-achievements', async () => { await page.evaluate(() => scrollTo(0, 0)); await page.click('.ach-link'); });
    await home(page);
    await shot(page, '18-settings', () => page.click('.tab-settings'));
    await home(page);
    await shot(page, '19-grown-ups', async () => { await page.click('.tab-grownups'); await gate(page); });
    await home(page);
    await shot(page, '20-season', () => page.click('.season-btn'));
    await home(page);
    await shot(page, '21-join-a-wing', () => page.click('.class-chip'));
    await home(page);
    await shot(page, '22-warm-up-lesson', async () => {
      await page.click('.tile-lessons');
      await page.click('.lesson-tile >> nth=9');
      await page.waitForSelector('.warm-tag', { timeout: 4000 });
    });
    await shot(page, '23-lesson-results-improvement-rewards', async () => { await typeAll(page, '.lesson-result'); await page.waitForSelector('.lesson-result'); });
    await home(page);
    await shot(page, '24-lessons-tricky-keys-button', () => page.click('.tile-lessons'));
    await shot(page, '25-tricky-keys-drill', () => page.click('.tricky-btn'));
    await shot(page, '26-tricky-keys-results', async () => { await typeAll(page, '.lesson-result'); await page.waitForSelector('.lesson-result'); });
    await home(page);
    await shot(page, '27-race-results-faster-than-usual', async () => { await page.click('.tile-race'); await raceResults(page); });
    await home(page);
    await shot(page, '27b-whos-playing', () => page.click('.home-avatar'));
    await home(page);
    await shot(page, '27c-nest-aerie-shop', async () => { await page.click('.tab-dragon'); await page.evaluate(() => document.querySelector('.shop')?.scrollIntoView({ block: 'center' })); });
    const gu = async (sel) => { await home(page); await page.click('.tab-grownups'); await gate(page); await page.click(sel); };
    await shot(page, '27d-grown-ups-family', () => gu('.gu-family'));
    await shot(page, '27e-grown-ups-ideas', () => gu('.gu-ideas'));
    await shot(page, '27f-grown-ups-support', () => gu('.gu-support'));
    await shot(page, '27g-grown-ups-classroom-start', () => gu('.gu-classroom'));
    await shot(page, '27h-privacy-page', () => page.goto(URL + 'privacy.html'));
    await shot(page, '27i-terms-page', () => page.goto(URL + 'terms.html'));
    await ctx.close();
  }

  if (!process.env.ONLY_MID) {
  // Grown rider: every lesson passed, egg ready, word challenges open.
  {
    const { ctx, page } = await fresh(rider({ lessonsPassed: 20, grown: true }));
    await shot(page, '28-home-egg-ready-daily-go');
    await shot(page, '29-lessons-word-challenges', async () => { await page.click('.tile-lessons'); await page.evaluate(() => document.querySelector('.pack-grid')?.scrollIntoView({ block: 'center' })); });
    await home(page);
    await shot(page, '30-word-challenge-from-daily-go', () => page.click('.daily-card.go'));
    await shot(page, '31-word-challenge-results', async () => { await typeAll(page, '.lesson-result'); await page.waitForSelector('.lesson-result'); });
    await shot(page, '32-nest-egg-ready', () => page.click('.lesson-result .fin-nest'));
    await shot(page, '33-hatch-tapping', async () => {
      await page.getByRole('button', { name: 'Tap to open!' }).click();
      for (let i = 0; i < 3; i++) { await page.click('.hatch-tap'); await page.waitForTimeout(250); }
    });
    await shot(page, '34-hatch-reveal', async () => {
      for (let i = 0; i < 3; i++) await page.click('.hatch-tap').catch(() => null);
      await page.waitForSelector('.hatch-reveal', { timeout: 3000 });
    }, 300);
    await shot(page, '35-hatch-name-card', () => page.waitForTimeout(3500));
    await ctx.close();
  }
  }
}
await browser.close();
server.kill();
console.log(problems.length ? 'Problems:\n  ' + problems.join('\n  ') : 'All shots taken.');
