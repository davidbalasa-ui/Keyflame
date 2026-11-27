// Keyflame's sound effects, all made live with Web Audio, so the game ships no audio files
// and every sound is our own. Each sound is scheduled on the audio clock (not timers), so
// notes land exactly in time even on a busy iPad, and the same recipes render offline for
// tests (see renderSound).
//
// The mix: every voice -> master gain -> soft limiter -> speakers, plus an optional send to a
// small made-up reverb for the bigger moments. Voices fade in over a few milliseconds and
// fade out smoothly, so nothing clicks or pops. Typing sounds stay quiet and dry; rewards
// are brighter and roomier.

type Ctx = BaseAudioContext;

/** Loudest a single voice may ever be scheduled. Tests check every sound stays under it. */
export const MAX_VOICE_GAIN = 0.3;

// C major pentatonic, two octaves up from C5: the key taps wander over these, so a run of
// keys sounds like a soft tune instead of one beep over and over.
const KEY_NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
/** Keys closer together than this (ms) share one sound, so key-mashing can't pile up voices. */
export const KEY_GAP_MS = 22;

interface Mix {
  ctx: Ctx;
  dry: AudioNode;
  wet: AudioNode | null;
}

const mixes = new WeakMap<Ctx, Mix>();
let noiseCache: { ctx: Ctx; buf: AudioBuffer } | null = null;

function mixFor(ctx: Ctx, out: AudioNode = ctx.destination): Mix {
  const have = mixes.get(ctx);
  if (have) return have;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  // A gentle limiter: loud moments (fanfare + coins together) never distort on small speakers.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 8;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.18;
  master.connect(limiter).connect(out);
  let wet: AudioNode | null = null;
  try {
    const verb = ctx.createConvolver();
    verb.buffer = roomImpulse(ctx);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.28;
    verb.connect(verbGain).connect(master);
    wet = verb;
  } catch {
    // No reverb on very old browsers; everything still plays dry.
  }
  const mix = { ctx, dry: master, wet };
  mixes.set(ctx, mix);
  return mix;
}

/** A short, soft "room" made from fading noise: about 1.1 s, darker as it fades. */
function roomImpulse(ctx: Ctx): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 1.1);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += (Math.random() * 2 - 1 - lp) * (0.5 - t * 0.4);
      d[i] = lp * Math.pow(1 - t, 3);
    }
  }
  return buf;
}

function noiseBuffer(ctx: Ctx): AudioBuffer {
  if (noiseCache?.ctx === ctx) return noiseCache.buf;
  const len = Math.floor(ctx.sampleRate * 1.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseCache = { ctx, buf };
  return buf;
}

interface VoiceOpts {
  /** Start, in seconds after "now". */
  at?: number;
  /** Seconds until the voice has faded out. */
  dur: number;
  gain: number;
  type?: OscillatorType;
  attack?: number;
  /** Glide to this pitch over the voice (or over glide seconds). */
  slideTo?: number;
  glide?: number;
  detune?: number;
  /** Low-pass the voice, optionally sweeping the cutoff. */
  lp?: number;
  lpTo?: number;
  /** How much goes to the reverb, 0-1. */
  rev?: number;
}

/** One shaped tone. Fades in over `attack` and out exponentially, never a hard edge. */
function voice(m: Mix, t0: number, f: number, o: VoiceOpts): void {
  const { ctx } = m;
  const t = t0 + (o.at ?? 0);
  const end = t + o.dur;
  const g = Math.min(o.gain, MAX_VOICE_GAIN);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(f, t);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + (o.glide ?? o.dur));
  if (o.detune) osc.detune.setValueAtTime(o.detune, t);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(g, t + (o.attack ?? 0.004));
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  let tail: AudioNode = amp;
  osc.connect(amp);
  if (o.lp) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(o.lp, t);
    if (o.lpTo) lp.frequency.exponentialRampToValueAtTime(o.lpTo, end);
    amp.connect(lp);
    tail = lp;
  }
  tail.connect(m.dry);
  if (o.rev && m.wet) {
    const send = ctx.createGain();
    send.gain.value = o.rev;
    tail.connect(send).connect(m.wet);
  }
  osc.start(t);
  osc.stop(end + 0.03);
}

interface NoiseOpts {
  at?: number;
  dur: number;
  gain: number;
  filter: BiquadFilterType;
  f: number;
  fTo?: number;
  q?: number;
  attack?: number;
  rev?: number;
}

/** Filtered noise: whooshes, knocks, shell cracks. */
function noise(m: Mix, t0: number, o: NoiseOpts): void {
  const { ctx } = m;
  const t = t0 + (o.at ?? 0);
  const end = t + o.dur;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const bq = ctx.createBiquadFilter();
  bq.type = o.filter;
  bq.Q.value = o.q ?? 1;
  bq.frequency.setValueAtTime(o.f, t);
  if (o.fTo) bq.frequency.exponentialRampToValueAtTime(o.fTo, end);
  const amp = ctx.createGain();
  const peak = Math.min(o.gain, MAX_VOICE_GAIN);
  const attack = o.attack ?? 0.003;
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(bq).connect(amp).connect(m.dry);
  if (o.rev && m.wet) {
    const send = ctx.createGain();
    send.gain.value = o.rev;
    amp.connect(send).connect(m.wet);
  }
  // Start at a random spot in the noise, so repeats never sound copy-pasted.
  src.start(t, Math.random() * 0.8);
  src.stop(end + 0.03);
}

/** A bell / glockenspiel note: a pure tone plus two quicker, quieter overtones. */
function bell(m: Mix, t0: number, f: number, at: number, dur: number, gain: number, rev = 0.5): void {
  voice(m, t0, f, { at, dur, gain, attack: 0.003, rev });
  voice(m, t0, f * 2.76, { at, dur: dur * 0.45, gain: gain * 0.28, attack: 0.002, rev });
  voice(m, t0, f * 5.4, { at, dur: dur * 0.2, gain: gain * 0.1, attack: 0.001, rev });
}

/** A soft wooden marimba note: round tone plus a short knock on top. */
function marimba(m: Mix, t0: number, f: number, at: number, gain: number, rev = 0): void {
  voice(m, t0, f, { at, dur: 0.16, gain, attack: 0.002, rev });
  voice(m, t0, f * 4, { at, dur: 0.035, gain: gain * 0.22, attack: 0.001, rev });
}

/** A warm horn note for fanfares: two slightly detuned saws through a filter that opens up. */
function horn(m: Mix, t0: number, f: number, at: number, dur: number, gain: number): void {
  for (const d of [-6, 6]) voice(m, t0, f, { at, dur, gain: gain / 2, type: 'sawtooth', attack: 0.025, detune: d, lp: 900, lpTo: 2600, rev: 0.35 });
  voice(m, t0, f / 2, { at, dur, gain: gain * 0.35, type: 'triangle', attack: 0.03, rev: 0.2 });
}

/** A big soft drum hit under the big moments. */
function boom(m: Mix, t0: number, at: number, gain: number): void {
  voice(m, t0, 110, { at, dur: 0.5, gain, slideTo: 48, glide: 0.4, attack: 0.004, rev: 0.3 });
  noise(m, t0, { at, dur: 0.18, gain: gain * 0.5, filter: 'lowpass', f: 600, fTo: 120 });
}

/** Wind rushing past: a band of noise sweeping up (or down). */
function whoosh(m: Mix, t0: number, at: number, dur: number, gain: number, from = 300, to = 2400): void {
  noise(m, t0, { at, dur, gain, filter: 'bandpass', f: from, fTo: to, q: 1.4, attack: dur * 0.45, rev: 0.25 });
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, A5 = 880, B5 = 987.77;
const C4 = 261.63, E4 = 329.63, G4 = 392, C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98, C7 = 2093;

let keyStep = 2;

/** Every sound recipe: (mix, start time) -> schedules its voices. */
const RECIPES = {
  /** A correct key: a quiet marimba note, wandering a gentle tune. */
  key: (m: Mix, t: number) => {
    keyStep = Math.max(0, Math.min(KEY_NOTES.length - 1, keyStep + [-1, 0, 1, 1][Math.floor(Math.random() * 4)]));
    if (keyStep === KEY_NOTES.length - 1 && Math.random() < 0.5) keyStep = 2;
    marimba(m, t, KEY_NOTES[keyStep], 0, 0.11);
  },
  /** A wrong key: a soft, low "bonk", never a buzzer. */
  miss: (m: Mix, t: number) => {
    keyStep = 2;
    voice(m, t, 196, { dur: 0.17, gain: 0.16, type: 'triangle', slideTo: 140, attack: 0.004, lp: 700 });
    noise(m, t, { dur: 0.07, gain: 0.08, filter: 'lowpass', f: 420 });
  },
  /** Any button: a little bubble pop. */
  click: (m: Mix, t: number) => {
    voice(m, t, 480, { dur: 0.07, gain: 0.12, slideTo: 920, glide: 0.04, attack: 0.002 });
    voice(m, t, 1840, { dur: 0.025, gain: 0.025, attack: 0.001 });
  },
  /** Race countdown "3", "2", "1": a wood block with a little room. */
  count: (m: Mix, t: number) => {
    marimba(m, t, G5, 0, 0.17, 0.25);
    marimba(m, t, G4, 0, 0.08, 0.2);
  },
  /** "Fly!": wings open and the dragon takes off. */
  fly: (m: Mix, t: number) => {
    whoosh(m, t, 0, 0.55, 0.22, 250, 2600);
    voice(m, t, G4, { dur: 0.35, gain: 0.08, type: 'triangle', slideTo: G5, glide: 0.18, attack: 0.01, rev: 0.3 });
    bell(m, t, C6, 0.06, 0.9, 0.13);
    bell(m, t, G6, 0.12, 0.7, 0.05);
  },
  /** A dash streak: a quick rush of wind and two sparkles. */
  dash: (m: Mix, t: number) => {
    whoosh(m, t, 0, 0.4, 0.2, 500, 3200);
    bell(m, t, E6, 0.05, 0.35, 0.06, 0.4);
    bell(m, t, G6, 0.11, 0.4, 0.05, 0.4);
  },
  /** Crossing the finish line (any place): wind and a bright two-note chime. */
  finish: (m: Mix, t: number) => {
    whoosh(m, t, 0, 0.45, 0.16, 400, 2000);
    bell(m, t, G5, 0.05, 0.8, 0.12);
    bell(m, t, C6, 0.17, 1.1, 0.13);
  },
  /** A lesson passed, a top-three place, an evolution star: a rising chime run. */
  win: (m: Mix, t: number) => {
    [C5, E5, G5, C6].forEach((f, i) => bell(m, t, f, i * 0.085, 0.9, 0.12));
    [E5, G5, C6].forEach((f) => voice(m, t, f, { at: 0.34, dur: 1.1, gain: 0.05, type: 'triangle', attack: 0.05, rev: 0.6 }));
    bell(m, t, E6, 0.42, 0.9, 0.05);
  },
  /** First place: a short original horn call, a drum, and a sparkle on top. */
  fanfare: (m: Mix, t: number) => {
    horn(m, t, G4, 0, 0.16, 0.13);
    horn(m, t, C5, 0.15, 0.16, 0.13);
    horn(m, t, E5, 0.3, 0.16, 0.13);
    boom(m, t, 0.45, 0.22);
    horn(m, t, G5, 0.45, 0.95, 0.16);
    [C4, E4, G4].forEach((f) => horn(m, t, f, 0.45, 1.1, 0.07));
    [C6, E6, G6, C7].forEach((f, i) => bell(m, t, f, 0.7 + i * 0.07, 0.8, 0.045));
  },
  /** Finishing outside the top three: a warm, friendly "nice try" chime. */
  cheer: (m: Mix, t: number) => {
    bell(m, t, G5, 0, 0.8, 0.11);
    bell(m, t, C6, 0.14, 1, 0.11);
    voice(m, t, C5, { at: 0.14, dur: 0.9, gain: 0.05, type: 'triangle', attack: 0.04, rev: 0.5 });
  },
  /** A reward card landing: a quick "ting-ting". */
  coin: (m: Mix, t: number) => {
    bell(m, t, A5, 0, 0.3, 0.1, 0.3);
    bell(m, t, D6, 0.065, 0.5, 0.11, 0.3);
  },
  /** An egg shell cracking: a few dry snaps. */
  crack: (m: Mix, t: number) => {
    for (let i = 0; i < 4; i++) noise(m, t, { at: i * 0.018 + Math.random() * 0.01, dur: 0.03, gain: 0.16 - i * 0.025, filter: 'highpass', f: 2200 + Math.random() * 1500, q: 0.7, attack: 0.001 });
    voice(m, t, 1400, { dur: 0.05, gain: 0.04, attack: 0.001, slideTo: 900 });
  },
  /** An egg being opened, tap n of 6: a hollow knock that climbs, with more crackle each time. */
  tap: (m: Mix, t: number, n = 1) => {
    const k = Math.max(1, Math.min(6, n));
    noise(m, t, { dur: 0.09, gain: 0.2, filter: 'bandpass', f: 700 + k * 90, q: 2.2, attack: 0.002 });
    voice(m, t, 190 + k * 28, { dur: 0.14, gain: 0.16, type: 'triangle', slideTo: 150 + k * 22, attack: 0.002, lp: 1400 });
    if (k >= 3) for (let i = 0; i < k - 2; i++) noise(m, t, { at: 0.03 + i * 0.02, dur: 0.025, gain: 0.07 + k * 0.01, filter: 'highpass', f: 2600 + i * 400, attack: 0.001 });
    bell(m, t, KEY_NOTES[k + 1] * 2, 0.02, 0.25, 0.02 + k * 0.006, 0.3);
  },
  /** The egg bursts open: a drum, a whoosh, and a shimmering magic chord. */
  hatch: (m: Mix, t: number) => {
    boom(m, t, 0, 0.24);
    whoosh(m, t, 0, 0.8, 0.16, 200, 3000);
    [C5, E5, G5, B5, D6, G6].forEach((f, i) => bell(m, t, f, 0.08 + i * 0.07, 1.4, 0.085, 0.7));
    [C4, G4, E5].forEach((f) => voice(m, t, f, { at: 0.1, dur: 1.8, gain: 0.055, type: 'triangle', attack: 0.15, rev: 0.7 }));
    for (let i = 0; i < 6; i++) bell(m, t, [C7, G6, E6, D6, C7, G6][i] * (1 + (Math.random() - 0.5) * 0.004), 0.6 + i * 0.09 + Math.random() * 0.03, 0.5, 0.03, 0.8);
  },
} satisfies Record<string, (m: Mix, t: number, n?: number) => void>;

export type SoundName = keyof typeof RECIPES;
export const SOUND_NAMES = Object.keys(RECIPES) as SoundName[];

/** Longest any sound rings, in seconds (with its reverb tail); tests render this much. */
export const SOUND_TAIL_S = 3;

// ---- Live playback ----

let ctx: AudioContext | null = null;
let enabled = true;
let lastKey = -Infinity;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (!on && ctx?.state === 'running') void ctx.suspend().catch(() => {});
}

type AudioCtor = typeof AudioContext;

function liveCtx(): AudioContext | null {
  if (ctx) return ctx;
  const w = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor({ latencyHint: 'interactive' });
  } catch {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

/**
 * iPads (and most browsers) keep audio locked until a tap or key press. Call this from any
 * tap or key handler: it wakes the audio so timed sounds, like the race countdown, can play.
 * It also plays one silent sample, which older iPads need before they make any sound.
 */
export function unlockAudio(): void {
  if (!enabled) return;
  const c = liveCtx();
  if (!c) return;
  if (c.state !== 'running') {
    void c.resume().catch(() => {});
    try {
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
    } catch {
      // Nothing to do; the next tap tries again.
    }
  }
}

function play(name: SoundName, n?: number): void {
  if (!enabled) return;
  try {
    const c = liveCtx();
    if (!c) return;
    if (c.state !== 'running') void c.resume().catch(() => {});
    if (name === 'key') {
      const now = performance.now();
      if (now - lastKey < KEY_GAP_MS) return;
      lastKey = now;
    }
    // A hair of lead time so the first note never gets clipped by the scheduler.
    RECIPES[name](mixFor(c), c.currentTime + 0.005, n);
  } catch {
    // Audio blocked or unsupported; stay silent.
  }
}

let wired = false;
/** Wake audio on the first taps and keys, and rest it while the game is hidden. */
export function wireAudioUnlock(doc: Document = document): void {
  if (wired) return;
  wired = true;
  const wake = (): void => unlockAudio();
  for (const ev of ['pointerdown', 'touchend', 'keydown']) doc.addEventListener(ev, wake, { capture: true, passive: true });
  doc.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (doc.hidden) void ctx.suspend().catch(() => {});
    else if (enabled) void ctx.resume().catch(() => {});
  });
}

export const sfx = {
  key: () => play('key'),
  miss: () => play('miss'),
  click: () => play('click'),
  count: () => play('count'),
  fly: () => play('fly'),
  dash: () => play('dash'),
  finish: () => play('finish'),
  win: () => play('win'),
  fanfare: () => play('fanfare'),
  cheer: () => play('cheer'),
  coin: () => play('coin'),
  crack: () => play('crack'),
  /** One knock on a ready egg; each tap sounds a little higher than the last. */
  tap: (n: number) => play('tap', n),
  hatch: () => play('hatch'),
};

/**
 * Schedules one sound into any audio context (an OfflineAudioContext in tests and the sound
 * preview page), through the same mix the game uses.
 */
export function renderSound(c: BaseAudioContext, name: SoundName, n?: number, at = 0.01): void {
  RECIPES[name](mixFor(c), at, n);
}
