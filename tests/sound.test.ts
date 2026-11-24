import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A pretend Web Audio context that records what each sound builds, so we can check the mix
// without a browser. scripts/check-sounds.mjs renders the real thing in Chromium and Safari.
interface Param { value: number; events: Array<[string, number, number]> }
const param = (value = 0): Param & Record<string, unknown> => {
  const p: Param & Record<string, unknown> = { value, events: [] };
  for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime']) p[m] = (v: number, t: number) => (p.events.push([m, v, t]), p);
  return p;
};

class FakeNode {
  out: unknown[] = [];
  connect(n: unknown): unknown {
    this.out.push(n);
    return n;
  }
}
class FakeSource extends FakeNode {
  started: number | null = null;
  stopped: number | null = null;
  frequency = param(440);
  detune = param(0);
  type = 'sine';
  buffer: unknown = null;
  start(t = 0): void {
    this.started = t;
  }
  stop(t = 0): void {
    this.stopped = t;
  }
}

let made: { sources: FakeSource[]; gains: Array<{ gain: Param }>; contexts: FakeCtx[] };

class FakeCtx {
  state: 'suspended' | 'running' = 'suspended';
  currentTime = 1;
  sampleRate = 8000;
  destination = new FakeNode();
  resumes = 0;
  suspends = 0;
  constructor() {
    made.contexts.push(this);
  }
  resume(): Promise<void> {
    this.resumes++;
    this.state = 'running';
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.suspends++;
    this.state = 'suspended';
    return Promise.resolve();
  }
  createOscillator(): FakeSource {
    const s = new FakeSource();
    made.sources.push(s);
    return s;
  }
  createBufferSource(): FakeSource {
    return this.createOscillator();
  }
  createGain(): FakeNode & { gain: Param } {
    const g = Object.assign(new FakeNode(), { gain: param(1) });
    made.gains.push(g);
    return g;
  }
  createBiquadFilter(): FakeNode {
    return Object.assign(new FakeNode(), { type: 'lowpass', frequency: param(), Q: param() });
  }
  createDynamicsCompressor(): FakeNode {
    return Object.assign(new FakeNode(), { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
  }
  createConvolver(): FakeNode {
    return Object.assign(new FakeNode(), { buffer: null });
  }
  createBuffer(ch: number, len: number): { getChannelData: () => Float32Array } {
    const data = Array.from({ length: ch }, () => new Float32Array(len));
    return { getChannelData: (i = 0) => data[i] } as never;
  }
}

async function freshSound() {
  vi.resetModules();
  made = { sources: [], gains: [], contexts: [] };
  vi.stubGlobal('AudioContext', FakeCtx);
  return import('../src/ui/sound');
}

const peakOf = (g: { gain: Param }): number => Math.max(0, ...g.gain.events.map(([, v]) => v));

describe('sound effects', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('has a sound for every moment in the game', async () => {
    const s = await freshSound();
    expect(s.SOUND_NAMES.sort()).toEqual(['cheer', 'click', 'coin', 'count', 'crack', 'dash', 'fanfare', 'finish', 'fly', 'hatch', 'key', 'miss', 'tap', 'win'].sort());
    for (const name of s.SOUND_NAMES) expect(typeof (s.sfx as Record<string, unknown>)[name]).toBe('function');
  });

  it('plays nothing, and builds no audio, when sound is off', async () => {
    const s = await freshSound();
    s.setSoundEnabled(false);
    for (const name of s.SOUND_NAMES) (s.sfx[name] as (n?: number) => void)(3);
    s.unlockAudio();
    expect(made.contexts).toHaveLength(0);
    expect(made.sources).toHaveLength(0);
  });

  it('shares one audio context for the whole game', async () => {
    const s = await freshSound();
    s.sfx.click();
    s.sfx.fanfare();
    s.sfx.key();
    expect(made.contexts).toHaveLength(1);
  });

  it('starts and stops every voice, fading in from silence with no hard edges', async () => {
    const s = await freshSound();
    for (const name of s.SOUND_NAMES) {
      made.sources = [];
      made.gains = [];
      (s.sfx[name] as (n?: number) => void)(4);
      const voices = made.sources;
      expect(voices.length, name).toBeGreaterThan(0);
      for (const v of voices) {
        expect(v.started, name).not.toBeNull();
        expect(v.stopped, name).not.toBeNull();
        expect(v.stopped!, name).toBeGreaterThan(v.started!);
        // Every sound is over within its tail.
        expect(v.stopped! - 1, name).toBeLessThan(s.SOUND_TAIL_S);
      }
      // Envelopes: start at 0, ramp up, end near silence.
      const envs = made.gains.filter((g) => g.gain.events.length >= 3);
      expect(envs.length, name).toBeGreaterThan(0);
      for (const g of envs) {
        expect(g.gain.events[0][1], name).toBe(0);
        expect(g.gain.events.at(-1)![1], name).toBeLessThan(0.001);
        expect(peakOf(g), name).toBeLessThanOrEqual(s.MAX_VOICE_GAIN);
      }
    }
  });

  it('keeps typing quiet: a key tap is much softer than a reward', async () => {
    const s = await freshSound();
    const loudest = (play: () => void): number => {
      made.gains = [];
      play();
      return Math.max(...made.gains.map(peakOf));
    };
    const key = loudest(() => s.sfx.key());
    vi.advanceTimersByTime(100);
    expect(key).toBeLessThan(0.15);
    expect(loudest(() => s.sfx.miss())).toBeLessThan(0.2);
    expect(key).toBeLessThan(loudest(() => s.sfx.fanfare()));
  });

  it('merges key presses that land at the same instant, so mashing cannot pile up sound', async () => {
    const now = { t: 1000 };
    vi.spyOn(performance, 'now').mockImplementation(() => now.t);
    const s = await freshSound();
    s.sfx.key();
    const one = made.sources.length;
    s.sfx.key();
    s.sfx.key();
    expect(made.sources.length).toBe(one);
    now.t += s.KEY_GAP_MS + 1;
    s.sfx.key();
    expect(made.sources.length).toBe(one * 2);
  });

  it('a wrong key never sounds higher than the typing notes (it should read as a soft bonk)', async () => {
    const s = await freshSound();
    s.sfx.miss();
    const pitches = made.sources.filter((v) => v.buffer === null).map((v) => v.frequency.events[0]?.[1] ?? 0);
    expect(Math.max(...pitches)).toBeLessThan(300);
  });

  it('egg taps climb in pitch from the first to the last tap', async () => {
    const s = await freshSound();
    const knock = (n: number): number => {
      made.sources = [];
      s.sfx.tap(n);
      return made.sources.find((v) => v.type === 'triangle')!.frequency.events[0][1];
    };
    const pitches = [1, 2, 3, 4, 5, 6].map(knock);
    for (let i = 1; i < pitches.length; i++) expect(pitches[i]).toBeGreaterThan(pitches[i - 1]);
  });

  it('wakes the audio on a tap (iPad needs this), rests it when hidden or switched off', async () => {
    const s = await freshSound();
    const listeners: Record<string, Array<() => void>> = {};
    const doc = { hidden: false, addEventListener: (ev: string, fn: () => void) => (listeners[ev] ??= []).push(fn) } as unknown as Document;
    s.wireAudioUnlock(doc);
    expect(Object.keys(listeners).sort()).toEqual(['keydown', 'pointerdown', 'touchend', 'visibilitychange']);
    listeners.pointerdown[0]();
    const c = made.contexts[0];
    expect(c.resumes).toBe(1);
    expect(c.state).toBe('running');
    (doc as { hidden: boolean }).hidden = true;
    listeners.visibilitychange[0]();
    expect(c.state).toBe('suspended');
    (doc as { hidden: boolean }).hidden = false;
    listeners.visibilitychange[0]();
    expect(c.state).toBe('running');
    s.setSoundEnabled(false);
    expect(c.state).toBe('suspended');
  });

  it('stays silent, without errors, where the browser has no Web Audio', async () => {
    vi.resetModules();
    made = { sources: [], gains: [], contexts: [] };
    vi.stubGlobal('AudioContext', undefined);
    const s = await import('../src/ui/sound');
    expect(() => {
      for (const name of s.SOUND_NAMES) (s.sfx[name] as (n?: number) => void)(1);
      s.unlockAudio();
    }).not.toThrow();
  });
});
