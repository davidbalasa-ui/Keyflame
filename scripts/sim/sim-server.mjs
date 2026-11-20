// Simulated class: runs the real game build against the fake Supabase (scripts/fake-supabase.mjs),
// so nothing reaches the real database or the usage counts. Each "player" (a kid or the teacher)
// gets its own browser on its own device size. AI testers drive it through scripts/sim/kid.mjs:
// they read a text picture of the screen, tap numbered buttons, and call `type`, which types
// the lesson or race text at that kid's own speed and error rate (scripted, so no AI per keystroke).
// Run: node scripts/sim/sim-server.mjs [roster.json]   (control API on http://localhost:4300)
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { startFakeSupabase } from '../fake-supabase.mjs';

const require = createRequire(import.meta.url);
const playwright = require('playwright');

const API_PORT = Number(process.env.API_PORT ?? 54339);
const GAME_PORT = Number(process.env.GAME_PORT ?? 4190);
const CTRL_PORT = Number(process.env.CTRL_PORT ?? 4300);
const OUT = process.env.OUT ?? 'sim-out';
const ROSTER = JSON.parse(readFileSync(process.argv[2] ?? new URL('./roster.json', import.meta.url), 'utf8'));
mkdirSync(`${OUT}/shots`, { recursive: true });

const api = await startFakeSupabase(API_PORT);
if (!process.env.SKIP_BUILD) {
  execSync('npx vite build --outDir dist-sim --emptyOutDir', {
    stdio: 'ignore',
    env: { ...process.env, VITE_SUPABASE_URL: api.url, VITE_FEEDBACK_URL: `${api.url}/rest/v1/feedback` },
  });
}
const preview = spawn('npx', ['vite', 'preview', '--outDir', 'dist-sim', '--port', String(GAME_PORT), '--strictPort'], { stdio: 'ignore' });
process.on('exit', () => preview.kill());
for (let i = 0; i < 60; i++) {
  try {
    await fetch(`http://localhost:${GAME_PORT}/`);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 250));
  }
}

const DEVICES = {
  ipad: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' },
  phone: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' },
  laptop: { viewport: { width: 1366, height: 768 } },
};

const browser = await playwright.chromium.launch();
const players = new Map();
const log = (who, entry) => appendFileSync(`${OUT}/${who}.jsonl`, JSON.stringify({ t: new Date().toISOString(), ...entry }) + '\n');

async function player(who) {
  if (players.has(who)) return players.get(who);
  const profile = ROSTER.players.find((p) => p.id === who);
  if (!profile) throw new Error(`no player "${who}" in the roster`);
  const ctx = await browser.newContext({ serviceWorkers: 'block', ...DEVICES[profile.device ?? 'laptop'] });
  const page = await ctx.newPage();
  const p = { profile, page, errors: [], stats: { typed: 0, mistakes: 0, typingSeconds: 0, actions: 0 }, notes: 0 };
  page.on('pageerror', (e) => (p.errors.push(e.message), log(who, { pageerror: e.message })));
  page.on('dialog', (d) => (log(who, { dialog: d.message() }), d.accept()));
  await page.goto(`http://localhost:${GAME_PORT}/`);
  await page.waitForTimeout(1200);
  players.set(who, p);
  await look(p);
  return p;
}

/** A plain-text picture of the screen: what it says, and the numbered things that can be tapped. */
async function look(p) {
  const shot = await p.page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05 && !el.closest('[hidden],[aria-hidden="true"]');
    };
    document.querySelectorAll('[data-sim]').forEach((el) => el.removeAttribute('data-sim'));
    const sel = 'button, a[href], input, select, textarea, [role=button], [role=tab], [role=switch], [role=checkbox], summary';
    const items = [];
    let n = 0;
    for (const el of document.querySelectorAll(sel)) {
      if (!vis(el) || el.closest('.keyboard') || el.classList.contains('key') || el.disabled) continue;
      // Skip things hidden behind a full-screen overlay or pop-up: a kid can't see or tap them.
      {
        const r0 = el.getBoundingClientRect();
        const cx = Math.min(Math.max(r0.left + r0.width / 2, 1), innerWidth - 1);
        const cy = r0.top + r0.height / 2;
        if (cy > 0 && cy < innerHeight) {
          const top = document.elementFromPoint(cx, cy);
          if (top && top !== el && !el.contains(top) && !top.contains(el)) continue;
        }
      }
      n++;
      el.setAttribute('data-sim', String(n));
      const r = el.getBoundingClientRect();
      const label = (el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || el.title || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 70);
      const kind = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? `box${el.value ? ` (has "${el.value.slice(0, 20)}")` : ' (empty)'}` : el.getAttribute('role') === 'switch' || el.type === 'checkbox' ? `switch ${el.checked || el.getAttribute('aria-checked') === 'true' ? 'ON' : 'off'}` : '';
      const where = r.bottom < 0 ? ' [above, scroll up]' : r.top > innerHeight ? ' [below, scroll down]' : '';
      items.push(`[${n}] ${label || '(no label)'}${kind ? ` ${kind}` : ''}${where}`);
    }
    const modal = document.querySelector('.modal, [role=dialog]');
    const root = modal && vis(modal) ? modal : document.body;
    const clone = root.cloneNode(true);
    clone.querySelectorAll('.keyboard, script, style, svg, [hidden], [aria-hidden="true"]').forEach((e) => e.remove());
    let text = '';
    try {
      text = (modal && vis(modal) ? modal.innerText : document.body.innerText) || '';
    } catch {}
    // innerText on the live node respects layout; drop keyboard rows (single letters on lines).
    const kb = document.querySelector('.keyboard');
    const kbText = new Set(kb && vis(kb) ? kb.innerText.split('\n').map((l) => l.trim()) : []);
    text = text.split('\n').map((l) => l.trim()).filter((l) => l && !kbText.has(l)).join('\n');
    const typing = document.querySelector('.type-text');
    let typingInfo = null;
    if (typing && vis(typing)) {
      const chars = [...typing.querySelectorAll('.ch')];
      const at = chars.findIndex((c) => c.classList.contains('current'));
      typingInfo = { total: chars.length, at: at < 0 ? chars.length : at, text: typing.textContent };
    }
    return { text: text.slice(0, 1600), items, modal: !!(modal && vis(modal)), typingInfo, scrollY: Math.round(scrollY), height: document.documentElement.scrollHeight, vh: innerHeight };
  });
  let out = '';
  if (shot.modal) out += '(A pop-up box is open.)\n';
  out += `SCREEN TEXT:\n${shot.text}\n\nTAPPABLE:\n${shot.items.join('\n') || '(nothing)'}\n`;
  if (shot.typingInfo && shot.typingInfo.at < shot.typingInfo.total) out += `\nTYPING SCREEN: ${shot.typingInfo.at} of ${shot.typingInfo.total} letters done. Text: "${shot.typingInfo.text.slice(0, 120)}". Use the command: type\n`;
  if (shot.height > shot.vh + 20) out += `(Page is taller than the screen: scrolled ${shot.scrollY} of ${shot.height - shot.vh}px.)\n`;
  if (p.errors.length) out += `(Page errors so far: ${p.errors.length}, last: ${p.errors.at(-1)})\n`;
  return out;
}

const QWERTY = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
function neighbor(ch) {
  const c = ch.toLowerCase();
  for (let r = 0; r < 3; r++) {
    const i = QWERTY[r].indexOf(c);
    if (i >= 0) {
      const opts = [QWERTY[r][i - 1], QWERTY[r][i + 1], QWERTY[r - 1]?.[i], QWERTY[r + 1]?.[i]].filter(Boolean);
      return opts[Math.floor(Math.random() * opts.length)];
    }
  }
  return c === ' ' ? 'n' : 'e';
}

async function pressChar(p, ch) {
  const { page, profile } = p;
  if (profile.device !== 'laptop' && !profile.hardwareKeyboard) {
    // Tap the on-screen key, like a kid on an iPad or phone.
    const needShift = ch !== ch.toLowerCase();
    const base = ch.toLowerCase();
    if (needShift) {
      const s = page.locator('.key-shift').first();
      if (await s.isVisible().catch(() => false)) await s.tap({ timeout: 1500 }).catch(() => {});
    }
    const key = page.locator(`.keyboard .key[aria-label="${base === ' ' ? 'space' : base.replace(/"/g, '\\"')}"]`).first();
    if (await key.isVisible().catch(() => false)) {
      const ok = await key.tap({ timeout: 1500 }).then(() => true).catch(() => false);
      if (ok) return;
    }
  }
  await page.keyboard.type(ch);
}

/** Types the current typing text at the kid's own speed, with their kind of mistakes. */
async function typeRun(p) {
  const { page, profile } = p;
  const wpm = profile.wpm ?? 15;
  const msPerChar = 60000 / (wpm * 5);
  const err = profile.errorRate ?? 0.05;
  const t0 = Date.now();
  let typed = 0;
  let mistakes = 0;
  let stuck = 0;
  const state = () =>
    page.evaluate(() => {
      const t = document.querySelector('.type-text');
      if (!t) return null;
      const chars = [...t.querySelectorAll('.ch')];
      const at = chars.findIndex((c) => c.classList.contains('current'));
      return { at: at < 0 ? chars.length : at, total: chars.length, ch: at < 0 ? null : chars[at].textContent };
    });
  let s = await state();
  if (!s) return 'There is no typing on this screen.';
  const deadline = Date.now() + 8 * 60 * 1000;
  while (s && s.ch !== null && Date.now() < deadline) {
    const want = s.ch === ' ' ? ' ' : s.ch;
    const wrong = Math.random() < err;
    await pressChar(p, wrong ? neighbor(want) : want);
    if (wrong) mistakes++;
    typed++;
    // Kids are uneven: some keys fast, some slow, and a pause now and then.
    const jitter = msPerChar * (0.5 + Math.random()) + (Math.random() < 0.04 ? msPerChar * 3 : 0);
    await page.waitForTimeout(jitter);
    const next = await state();
    if (next && next.at === s.at && !wrong) {
      if (++stuck > 12) {
        // Probably a countdown: wait and try again.
        await page.waitForTimeout(1000);
        if (stuck > 40) break;
      }
    } else stuck = 0;
    s = next;
  }
  await page.waitForTimeout(1500);
  const secs = Math.round((Date.now() - t0) / 1000);
  p.stats.typed += typed;
  p.stats.mistakes += mistakes;
  p.stats.typingSeconds += secs;
  const left = s && s.ch !== null ? ` The run ended with ${s.total - s.at} letters still untyped (the screen stopped taking keys).` : '';
  return `Typed ${typed} keys in ${secs}s with ${mistakes} slips.${left}`;
}

async function run(who, cmd, args) {
  const p = await player(who);
  const { page } = p;
  p.stats.actions++;
  let note = '';
  switch (cmd) {
    case 'look':
      break;
    case 'tap': {
      const el = page.locator(`[data-sim="${Number(args[0])}"]`);
      if (!(await el.count())) {
        note = `No button [${args[0]}]. Look again.`;
        break;
      }
      const label = await el.first().evaluate((e) => (e.getAttribute('aria-label') || e.innerText || '').trim().slice(0, 50));
      if (p.profile.device === 'laptop') await el.first().click({ timeout: 4000 }).catch((e) => (note = `Could not tap it: ${e.message.split('\n')[0]}`));
      else await el.first().tap({ timeout: 4000 }).catch(async () => el.first().click({ timeout: 3000 }).catch((e) => (note = `Could not tap it: ${e.message.split('\n')[0]}`)));
      note ||= `Tapped "${label}".`;
      await page.waitForTimeout(900);
      break;
    }
    case 'fill': {
      const el = page.locator(`[data-sim="${Number(args[0])}"]`);
      if (!(await el.count())) {
        note = `No box [${args[0]}].`;
        break;
      }
      await el.first().fill(args.slice(1).join(' '));
      note = 'Typed into the box.';
      await page.waitForTimeout(400);
      break;
    }
    case 'key':
      await page.keyboard.press(args[0] ?? 'Enter');
      note = `Pressed ${args[0] ?? 'Enter'}.`;
      await page.waitForTimeout(700);
      break;
    case 'scroll':
      await page.mouse.wheel(0, args[0] === 'up' ? -500 : 500);
      await page.waitForTimeout(400);
      note = `Scrolled ${args[0] === 'up' ? 'up' : 'down'}.`;
      break;
    case 'wait':
      await page.waitForTimeout(Math.min(30, Number(args[0] ?? 3)) * 1000);
      note = 'Waited.';
      break;
    case 'type':
      note = await typeRun(p);
      break;
    case 'shot': {
      const path = `${OUT}/shots/${who}-${Date.now()}.png`;
      await page.screenshot({ path });
      note = `Screenshot saved: ${process.cwd()}/${path}`;
      break;
    }
    case 'goto':
      await page.goto(`http://localhost:${GAME_PORT}/${args[0] ?? ''}`);
      await page.waitForTimeout(1200);
      note = 'Opened the link.';
      break;
    case 'note': {
      // Every note also keeps a picture of the screen, so reviewers can see what the kid saw.
      const path = `${OUT}/shots/${who}-note-${String(++p.notes).padStart(2, '0')}.png`;
      await page.screenshot({ path }).catch(() => {});
      log(who, { note: args.join(' '), shot: path });
      return 'Noted.';
    }
    case 'stats':
      return JSON.stringify({ ...p.stats, pageErrors: p.errors.length, profile: p.profile });
    default:
      return `Unknown command "${cmd}". Commands: look, tap N, fill N text, type, key Enter, scroll down|up, wait S, shot, note text`;
  }
  const screen = await look(p);
  log(who, { cmd, args, note, screen: screen.slice(0, 600) });
  return `${note ? note + '\n\n' : ''}${screen}`;
}

const ctrl = createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  try {
    const { who, cmd, args = [] } = JSON.parse(body || '{}');
    if (cmd === '__dump') {
      const all = {};
      for (const [k, p] of players) all[k] = { ...p.stats, pageErrors: p.errors };
      return res.end(JSON.stringify(all, null, 2));
    }
    const out = await run(who, cmd, args);
    res.end(out);
  } catch (e) {
    res.end(`ERROR: ${e.message}`);
  }
});
ctrl.listen(CTRL_PORT, () => {
  writeFileSync(`${OUT}/READY`, 'ok');
  console.log(`sim ready: game http://localhost:${GAME_PORT}  control http://localhost:${CTRL_PORT}`);
});
