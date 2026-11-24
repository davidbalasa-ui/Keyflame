// Renders every game sound in a real browser engine (offline, no speakers needed) and fails if
// one clips, pops at the start, rings past its tail, comes out silent, or if typing sounds are
// not clearly quieter than rewards.
// BROWSER=webkit runs it in Safari's engine (what iPads use); the default is Chromium.
// WAVS=folder also saves each sound as a .wav to listen to.
// Run: npm run check:sounds
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  console.error('Playwright is not installed. Install it with: npm i -D playwright && npx playwright install chromium webkit');
  process.exit(2);
}

const ENGINE = process.env.BROWSER === 'webkit' ? 'webkit' : 'chromium';
const WAVS = process.env.WAVS;
const RATE = 44100;

const bundle = await build({
  entryPoints: ['src/ui/sound.ts'],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'KF',
  target: 'es2019',
});
const code = bundle.outputFiles[0].text;

const browser = await playwright[ENGINE].launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setContent('<!doctype html><title>sounds</title>');
await page.addScriptTag({ content: code });

const results = await page.evaluate(async ({ rate }) => {
  const KF = window.KF;
  const out = [];
  const jobs = KF.SOUND_NAMES.flatMap((name) => (name === 'tap' ? [1, 6].map((n) => ({ name, n, label: `tap${n}` })) : [{ name, label: name }]));
  for (const job of jobs) {
    const len = Math.ceil(rate * KF.SOUND_TAIL_S);
    const Ctor = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new Ctor(2, len, rate);
    KF.renderSound(ctx, job.name, job.n, 0.01);
    const buf = await ctx.startRendering();
    const l = buf.getChannelData(0);
    const r = buf.getChannelData(1);
    let peak = 0;
    let sum = 0;
    let bad = false;
    let lastLoud = 0;
    for (let i = 0; i < len; i++) {
      const v = Math.max(Math.abs(l[i]), Math.abs(r[i]));
      if (!Number.isFinite(l[i]) || !Number.isFinite(r[i])) bad = true;
      if (v > peak) peak = v;
      if (v > 0.001) lastLoud = i;
      sum += l[i] * l[i];
    }
    // Loudness over the busy part of the sound, so short and long sounds compare fairly.
    const busy = Math.max(1, lastLoud);
    const rms = Math.sqrt(sum / busy);
    // The first 2 ms after the sound starts must rise gently (no click).
    const start = Math.floor(0.01 * rate);
    let firstMs = 0;
    for (let i = start; i < start + Math.floor(0.0015 * rate); i++) firstMs = Math.max(firstMs, Math.abs(l[i]));
    // Send the samples back as 16-bit, for the optional .wav files.
    const pcm = [];
    for (let i = 0; i < busy + Math.floor(0.05 * rate) && i < len; i++) pcm.push(Math.round(Math.max(-1, Math.min(1, l[i])) * 32767), Math.round(Math.max(-1, Math.min(1, r[i])) * 32767));
    out.push({ label: job.label, peak, rms, bad, firstMs, endsAt: lastLoud / rate, pcm });
  }
  return out;
}, { rate: RATE });
await browser.close();

function wav(pcm) {
  const data = Buffer.alloc(pcm.length * 2);
  pcm.forEach((v, i) => data.writeInt16LE(v, i * 2));
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

const fails = [];
const by = Object.fromEntries(results.map((r) => [r.label, r]));
console.log(`${ENGINE}: sound      peak   loudness  ends(s)`);
for (const r of results) {
  console.log(`  ${r.label.padEnd(9)} ${r.peak.toFixed(3)}  ${r.rms.toFixed(4)}    ${r.endsAt.toFixed(2)}`);
  if (r.bad) fails.push(`${r.label}: has broken samples`);
  if (r.peak > 0.95) fails.push(`${r.label}: clips (peak ${r.peak.toFixed(3)})`);
  if (r.peak < 0.01) fails.push(`${r.label}: is silent`);
  if (r.firstMs > 0.05) fails.push(`${r.label}: starts with a click`);
  if (r.endsAt > 2.95) fails.push(`${r.label}: still ringing at the end of its tail`);
  if (WAVS) {
    mkdirSync(WAVS, { recursive: true });
    writeFileSync(join(WAVS, `${r.label}.wav`), wav(r.pcm));
  }
}
// Typing happens hundreds of times a race: it must sit well under the reward sounds.
if (!(by.key.peak < by.fanfare.peak * 0.6)) fails.push('key is not clearly quieter than the fanfare');
if (!(by.key.peak < by.coin.peak)) fails.push('key is louder than a reward ting');
if (!(by.miss.peak < by.win.peak)) fails.push('a wrong key is louder than a win');
if (!(by.key.endsAt < 0.4)) fails.push('key sound rings too long for fast typing');
if (errors.length) fails.push(...errors.map((e) => `page error: ${e}`));

if (fails.length) {
  console.error(`\n${fails.length} problem(s):\n  ` + fails.join('\n  '));
  process.exit(1);
}
console.log(`\nAll ${results.length} sounds render cleanly in ${ENGINE}.`);
