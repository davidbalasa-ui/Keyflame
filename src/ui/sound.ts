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
  hatch: () => [392, 523, 659, 784, 988].forEach((f, i) => setTimeout(() => tone(f, 220, 'sine', 0.06), i * 120)),
  click: () => tone(520, 50, 'sine', 0.03),
};
