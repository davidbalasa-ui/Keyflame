// Tiny synthesized sound effects, so the game needs no audio files yet.

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function tone(freq: number, ms: number, type: OscillatorType = 'sine', gain = 0.06, slideTo?: number): void {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + ms / 1000);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
  } catch {
    // Audio blocked or unsupported; stay silent.
  }
}

export const sfx = {
  key: () => tone(660, 40, 'triangle', 0.025),
  miss: () => tone(140, 120, 'square', 0.03),
  dash: () => tone(300, 350, 'sawtooth', 0.04, 900),
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 180, 'triangle', 0.05), i * 110)),
  crack: () => tone(900, 60, 'square', 0.03, 400),
  /** One knock on a ready egg; each tap sounds a little higher than the last. */
  tap: (n: number) => {
    tone(700 + n * 110, 70, 'square', 0.03, 380 + n * 60);
    tone(180 + n * 30, 90, 'triangle', 0.05);
  },
  hatch: () => [392, 523, 659, 784, 988].forEach((f, i) => setTimeout(() => tone(f, 220, 'sine', 0.06), i * 120)),
  click: () => tone(520, 50, 'sine', 0.03),
  /** A short victory fanfare for first place. */
  fanfare: () => {
    const notes: Array<[number, number, number]> = [[523, 0, 140], [523, 150, 140], [523, 300, 140], [659, 450, 420], [587, 900, 160], [659, 1060, 160], [784, 1220, 520]];
    for (const [f, at, ms] of notes) {
      setTimeout(() => {
        tone(f, ms, 'triangle', 0.06);
        tone(f / 2, ms, 'sine', 0.035);
      }, at);
    }
  },
  /** A friendly two-note cheer for finishing outside the top three. */
  cheer: () => [440, 660].forEach((f, i) => setTimeout(() => tone(f, 200, 'triangle', 0.045), i * 140)),
  /** A bright blip as a reward card lands. */
  coin: () => {
    tone(988, 70, 'square', 0.025);
    setTimeout(() => tone(1319, 140, 'square', 0.025), 70);
  },
};
