// End-to-end check of classroom mode with no internet: a teacher makes a class, an
// iPad-sized and a phone-sized player join with the code and race each other live, then
// the teacher starts a race for everyone. It runs the real game build against
// scripts/fake-supabase.mjs (the real migration in PGlite plus a small Realtime stand-in).
// Run: npm run check:classroom   (needs Playwright with Chromium)
// SHOTS=some/folder saves screenshots along the way.
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { startFakeSupabase } from './fake-supabase.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const API_PORT = 54329;
const PORT = 4181;
const OUT = 'dist-classroom';
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const api = await startFakeSupabase(API_PORT);
execSync(`npx vite build --outDir ${OUT} --emptyOutDir`, { stdio: 'ignore', env: { ...process.env, VITE_SUPABASE_URL: api.url } });
const server = spawn('npx', ['vite', 'preview', '--outDir', OUT, '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 50; i++) {
  try {
    await fetch(`http://localhost:${PORT}/`);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures++;
};
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });

const browser = await chromium.launch();
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const open = async (opts) => {
  const ctx = await browser.newContext({ serviceWorkers: 'block', ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => check(false, `page error: ${e.message}`));
  await page.goto(`http://localhost:${PORT}/`);
  return page;
};

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
async function passGate(page) {
  const q = await page.locator('.modal p', { hasText: 'times' }).textContent();
  const [, a, b] = /What is (\w+) times (\w+)/.exec(q);
  await page.fill('.gate-input', String(WORDS.indexOf(a) * WORDS.indexOf(b)));
  await page.locator('.modal').getByRole('button', { name: 'Continue' }).click();
}

async function newRider(page) {
  await page.click('.profile-card.new');
  await page.click('text=Let’s fly');
  await page.waitForSelector('.tiles');
}

async function joinClass(page, code, badge) {
  await page.click('.tile-race');
  await page.click('.class-card');
  await page.fill('.class-code-input', code.toLowerCase());
  await page.fill('.badge-input', String(badge));
  await page.click('text=🏁 Join');
  await page.waitForSelector('.race-classmates');
}
const PASSWORD = 'dragons1';
// Rows on the teacher's Progress list, and those with a joined rider.
const rowCount = (page, n, joined = null) =>
  page.waitForFunction(([n, joined]) => document.querySelectorAll('.rt-row').length === n && (joined === null || document.querySelectorAll('.rider-table li:not(.rt-waiting):not(.rt-head)').length === joined), [n, joined], { timeout: 6000 });

// Phones type on the game's tap keyboard; Shift then the key for capitals and symbols.
const SHIFTED = { ':': ';', '?': '/', '<': ',', '>': '.' };
async function tapType(page, text, delay) {
  for (const ch of text) {
    // Flame dashes can carry a dragon over the line before the last few letters.
    if (await page.locator('.cel-banner').count()) return;
    const base = SHIFTED[ch] ?? ch.toLowerCase();
    if (ch !== base) await page.tap('.keyboard [aria-label="Shift"]');
    await page.tap(`.keyboard [aria-label="${base === ' ' ? 'space' : base}"]`, { timeout: 3000 }).catch(async () => {
      if (await page.waitForSelector('.cel-banner', { timeout: 3000 }).catch(() => null)) return;
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/fail-tap.png` });
      throw new Error(`no tap key for ${JSON.stringify(ch)}`);
    });
    await page.waitForTimeout(delay);
  }
}
async function keyType(page, text, delay) {
  await page.keyboard.type(text, { delay });
}
const raceText = (page) => page.locator('.type-text').textContent();

try {
  // Teacher on a laptop.
  const teacher = await open({ viewport: { width: 1280, height: 800 } });
  await page0(teacher);
  async function page0(p) {
    await p.click('text=Teachers: make a class');
    await passGate(p);
    await p.fill('.student-list', 'Ava\nBen\nCara');
    await p.getByRole('button', { name: 'Make the class', exact: true }).click();
    await p.waitForSelector('text=Pick a teacher password');
    await p.fill('input[type=password][autocomplete=new-password]', PASSWORD);
    await shot(p, '0-teacher-start');
    await p.getByRole('button', { name: 'Make the class', exact: true }).click();
    await p.waitForSelector('text=Your class is ready');
  }
  const code = (await teacher.locator('.teacher-code strong').textContent()).replace(/\s/g, '');
  check(/^[BCDFGHJKLMNPQRSTVWXZ]{6}$/.test(code), `teacher got a class code (${code})`);
  await teacher.waitForTimeout(600);
  await shot(teacher, '1-teacher-ready');
  await teacher.click('text=Print class sheet');
  const sheet = await teacher.locator('.class-sheet').textContent();
  check(/Ava/.test(sheet) && /Cara/.test(sheet) && sheet.includes(code.slice(0, 3)), 'the class sheet lists the code and every student');
  await shot(teacher, '1b-class-sheet');
  await teacher.click('.print-bar >> text=Close');
  await teacher.click('.modal >> text=Done');
  await teacher.waitForSelector('text=✓ Student list backed up');
  check(true, 'the student list is backed up, locked');
  await rowCount(teacher, 3, 0);
  check(true, 'Progress lists the three students as not joined yet');
  await teacher.getByRole('tab', { name: 'Live' }).click();

  const ipad = await open({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, userAgent: IPAD_UA });
  const phone = await open({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true, userAgent: PHONE_UA, deviceScaleFactor: 2 });
  await newRider(ipad);
  await newRider(phone);
  await shot(phone, '2-phone-race-map');

  // A wrong code is turned away.
  await phone.click('.tile-race');
  await phone.click('.class-card');
  await phone.fill('.class-code-input', 'BBBBBB');
  await phone.fill('.badge-input', '2');
  await phone.waitForTimeout(600);
  await shot(phone, '2b-phone-join');
  await phone.click('text=🏁 Join');
  await phone.waitForSelector('text=No class has that code');
  check(true, 'a wrong code is turned away');
  await phone.click('text=← Back');
  await phone.click('text=← Back');

  await joinClass(ipad, code, 1);
  // The phone joins from the home screen's Join class button.
  await phone.click('.class-pill');
  await phone.fill('.class-code-input', code);
  await phone.fill('.badge-input', '2');
  await phone.click('text=🏁 Join');
  await phone.waitForSelector('.race-classmates');
  check(true, 'a kid can join from the home screen’s Join class button');
  await teacher.waitForFunction(() => document.querySelectorAll('.teacher .roster-chip').length === 2, null, { timeout: 5000 });
  check(true, 'teacher sees both riders');
  await ipad.waitForFunction(() => document.querySelectorAll('.class-lobby .roster-chip').length === 2, null, { timeout: 5000 });
  check(true, 'the iPad sees the phone rider in the lobby');
  await shot(phone, '3-phone-lobby');

  // Riders start a race themselves.
  await ipad.click('.race-classmates');
  await phone.click('.race-classmates');
  await phone.waitForSelector('text=Starting soon');
  await shot(phone, '4-phone-starting-soon');
  await Promise.all([ipad.waitForSelector('.type-text', { timeout: 10000 }), phone.waitForSelector('.type-text', { timeout: 10000 })]);
  const [t1, t2] = [await raceText(ipad), await raceText(phone)];
  check(t1 === t2 && t1.length > 10, 'both devices race the same text');
  check((await ipad.locator('.racer.classmate').count()) === 1 && (await phone.locator('.racer.classmate').count()) === 1, 'each device shows the other as a classmate lane');
  await teacher.waitForSelector('.watch');
  check(true, 'teacher sees the live race');
  await ipad.waitForTimeout(3000);

  // The iPad types faster on a real keyboard; the phone taps its keys.
  const typing = Promise.all([keyType(ipad, t1, 45), tapType(phone, t2, 70)]);
  await phone.waitForTimeout(4000);
  const moved = await phone.evaluate(() => {
    const el = document.querySelector('.racer.classmate');
    const m = /translate3d\(([\d.]+)px/.exec(el?.style.transform ?? '');
    return m ? Number(m[1]) : 0;
  });
  check(moved > 5, `the iPad's dragon flies across the phone screen (${moved.toFixed(0)}px)`);
  await shot(phone, '5-phone-racing');
  await shot(teacher, '6-teacher-watching');
  await typing;

  await ipad.waitForSelector('.cel-banner', { timeout: 10000 });
  await phone.waitForSelector('.cel-banner', { timeout: 10000 });
  const p1 = await ipad.locator('.cel-banner').textContent();
  const p2 = await phone.locator('.cel-banner').textContent();
  check(/1st/.test(p1) && /2nd/.test(p2), `places: iPad "${p1.trim()}", phone "${p2.trim()}"`);
  await phone.waitForFunction(() => document.querySelectorAll('.live-results li:not(.flying)').length === 2);
  check(true, 'the phone lists both finishers');
  await shot(phone, '7-phone-results');
  await teacher.waitForSelector('.watch h2:has-text("Race finished")');
  check(true, 'teacher sees the race finish');
  await teacher.waitForFunction(() => document.querySelectorAll('.class-board li').length === 2, null, { timeout: 5000 });
  check(true, 'class board has both riders');
  await shot(teacher, '8-teacher-board');

  // The teacher's Progress tab follows each student over time.
  await teacher.getByRole('tab', { name: 'Progress' }).click();
  await rowCount(teacher, 3, 2);
  check(true, 'Progress shows Ava and Ben joined, Cara not yet');
  const speeds = await teacher.locator('.rider-table li:not(.rt-waiting):not(.rt-head) .rt-speed strong').allTextContents();
  check(speeds.length === 2 && speeds.every((t) => /^\d+$/.test(t)), `Progress shows each rider's speed (${speeds.join(', ')})`);
  check((await teacher.locator('.week-chart li').count()) === 1, 'the weekly chart has this week');
  await teacher.locator('.rt-row', { hasText: 'Ava' }).click();
  await teacher.waitForSelector('.rider-sheet .activity-list li');
  check(/Class race/.test(await teacher.locator('.rider-sheet .activity-list').textContent()), 'Ava’s history shows the class race');
  await teacher.fill('.rider-sheet .label-input', 'Ava R');
  await teacher.waitForTimeout(600);
  await shot(teacher, '8b-teacher-rider-sheet');
  await teacher.click('.rider-sheet >> text=Done');
  await teacher.waitForSelector('.rt-name strong:has-text("Ava R")');
  check(true, 'renaming a student shows in the list');
  for (const [w, hgt, name] of [[820, 1180, '8c-teacher-progress-ipad'], [412, 860, '8d-teacher-progress-phone']]) {
    await teacher.setViewportSize({ width: w, height: hgt });
    await teacher.waitForTimeout(200);
    const wide = await teacher.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check(!wide, `Progress fits a ${w}px screen without sideways scrolling`);
    await shot(teacher, name);
  }
  await teacher.setViewportSize({ width: 1280, height: 800 });
  await teacher.getByRole('tab', { name: 'Live' }).click();

  // Back to the lobby, then the teacher starts a race for everyone.
  await ipad.click('text=Back to class');
  await phone.click('text=Back to class');
  await ipad.waitForSelector('.race-classmates');
  await phone.waitForSelector('.race-classmates');
  await teacher.waitForFunction(() => [...document.querySelectorAll('.teacher .roster-status')].every((e) => e.textContent === 'Here'), null, { timeout: 5000 });
  await teacher.click('text=Start a race for everyone');
  await Promise.all([ipad.waitForSelector('.type-text', { timeout: 5000 }), phone.waitForSelector('.type-text', { timeout: 5000 })]);
  check(true, 'teacher’s Race everyone starts a race on both devices');
  await ipad.waitForTimeout(3000);
  await keyType(ipad, await raceText(ipad), 20);
  await ipad.waitForSelector('.cel-banner', { timeout: 10000 });
  check(true, 'second race finishes');

  // Leaving the race mid-way puts the phone back in the lobby, still in the class.
  await phone.click('text=← Back');
  await phone.waitForSelector('.race-classmates');
  check(true, 'leaving a race goes back to the class lobby');

  // A shared iPad remembers the class for the next rider.
  await ipad.click('text=Back to class');
  await ipad.click('text=← Back');
  await ipad.click('text=← Back');
  await ipad.click('text=Switch rider');
  await newRider(ipad);
  await ipad.click('.tile-race');
  await ipad.click('.class-card');
  // The code is remembered on the shared iPad; the next kid types their own badge.
  check((await ipad.inputValue('.class-code-input')) === code, 'the shared iPad remembers the class code');
  await ipad.fill('.badge-input', '1');
  await ipad.click('text=🏁 Join');
  await ipad.waitForSelector('.badge-confirm:not([hidden])');
  check(/Is that you/.test(await ipad.locator('.badge-confirm').textContent()), 'a badge in use on another rider asks “Is that you?”');
  await ipad.waitForTimeout(600);
  await shot(ipad, '9-ipad-badge-taken');
  await ipad.click('.badge-confirm >> text=No');
  await ipad.fill('.badge-input', '3');
  await ipad.click('text=🏁 Join');
  await ipad.waitForSelector('.race-classmates', { timeout: 5000 });
  check(true, 'the next kid on the shared iPad joins with their own badge');
  await shot(ipad, '9b-ipad-lobby');
  await teacher.waitForFunction(() => document.querySelectorAll('.teacher .roster-chip').length === 2, null, { timeout: 5000 });
  check(true, 'the old rider left the class when they left the screens');

  // The teacher removes Cara (badge 3): her device leaves the class next time it checks in.
  await teacher.setViewportSize({ width: 1280, height: 800 });
  await teacher.getByRole('tab', { name: 'Progress' }).click();
  await rowCount(teacher, 3, 3);
  check(true, 'Cara joined the Progress list');
  await teacher.locator('.rt-row', { hasText: 'Cara' }).click();
  teacher.once('dialog', (d) => d.accept());
  await teacher.click('text=Delete student');
  await rowCount(teacher, 2, 2);
  check(true, 'teacher deleted Cara and her badge');
  await ipad.click('text=← Back');
  await ipad.click('.class-card');
  await ipad.waitForSelector('text=Type your class code and badge number', { timeout: 5000 });
  check(true, 'the removed badge’s device is asked to join again');

  // Adding a student gives the next badge number.
  await teacher.fill('.add-student .label-input', 'Dev');
  await teacher.click('text=Add student');
  await teacher.waitForSelector('text=Dev is badge 4.');
  await rowCount(teacher, 3, 2);
  check(true, 'Add student gives Dev badge 4: the deleted badge 3 is never reused');

  // Fixing a mix-up: Ben's name goes on badge 4 and Dev's on badge 2 (swap).
  await teacher.locator('.rt-row', { hasText: 'Dev' }).click();
  await teacher.fill('.rider-sheet .badge-edit', '3');
  await teacher.click('.rider-sheet >> text=Done');
  await teacher.waitForSelector('text=belonged to a deleted student');
  check(true, 'a deleted badge number can’t be given to someone else');
  await teacher.fill('.rider-sheet .badge-edit', '2');
  teacher.once('dialog', (d) => d.accept());
  await teacher.click('.rider-sheet >> text=Done');
  await teacher.waitForFunction(() => [...document.querySelectorAll('.rt-name .rt-who')].map((e) => e.textContent).join(',') === '1Ava R,2Dev,4Ben', null, { timeout: 5000 });
  check(true, 'editing a badge number swaps two students’ names');

  // A new code keeps everyone; riders on the old code are asked for the new one.
  teacher.once('dialog', (d) => d.accept());
  await teacher.click('text=New class code');
  await teacher.waitForSelector('text=Print a new class sheet');
  const newCode = (await teacher.locator('.teacher-code strong').textContent()).replace(/\s/g, '');
  check(newCode !== code, `the class got a new code (${newCode})`);
  await teacher.click('.modal >> text=Done');
  await rowCount(teacher, 3, 2);
  check(true, 'a new class code keeps every student');
  await phone.click('text=← Back');
  await phone.click('.class-card');
  await phone.waitForSelector('text=That class code has changed', { timeout: 5000 });
  check(true, 'a rider on the old code is asked for the new one');
  await teacher.waitForSelector('text=✓ Student list backed up');

  // The teacher's iPad loses its saved data: code + password bring the class back.
  const fresh = await open({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, userAgent: IPAD_UA });
  await fresh.click('text=Teachers: make a class');
  await passGate(fresh);
  await fresh.fill('input[aria-label="Class code"]', newCode);
  await fresh.fill('input[type=password][autocomplete=current-password]', 'wrong-pass');
  await fresh.click('text=Open my class');
  await fresh.waitForSelector('text=That password doesn’t match');
  check(true, 'a wrong teacher password is turned away');
  await fresh.fill('input[type=password][autocomplete=current-password]', PASSWORD);
  await fresh.click('text=Open my class');
  await rowCount(fresh, 3, 2);
  const names = await fresh.locator('.rt-name strong').allTextContents();
  check(names.join(',') === 'Ava R,Dev,Ben', `code + password bring back every name (${names.join(', ')})`);
  await shot(fresh, '10-ipad-restored');
} catch (e) {
  const where = String(e.stack ?? '').split('\n').find((l) => l.includes('check-classroom')) ?? '';
  check(false, `${String(e.message ?? e).split('\n')[0]} ${where.trim()}`);
}

await browser.close();
api.close();
server.kill();
console.log(failures ? `${failures} check(s) failed` : 'All classroom checks passed');
process.exit(failures ? 1 : 0);
