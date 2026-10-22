// A small canvas particle system for flame trails, sparkles, dash bursts and confetti.
// One field per scene; it sizes itself to its parent and stops drawing when empty.

export type ParticleKind = 'ember' | 'spark' | 'puff' | 'confetti' | 'streak';

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  spin: number;
  angle: number;
}

export interface EmitOptions {
  count?: number;
  colors: string[];
  kind?: ParticleKind;
  /** Base velocity in px per second. */
  vx?: number;
  vy?: number;
  /** Random spread added to velocity, px per second. */
  spread?: number;
  size?: number;
  /** Seconds. */
  life?: number;
}

const GRAVITY: Record<ParticleKind, number> = { ember: -40, spark: 30, puff: -10, confetti: 260, streak: 0 };
const MAX_PARTICLES = 700;

export class ParticleField {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private list: Particle[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
  /** Turned off for players who asked for less motion. */
  enabled = true;

  constructor(className = 'fx-layer') {
    this.canvas = document.createElement('canvas');
    this.canvas.className = className;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d');
  }

  /** Matches the canvas to its on-screen size. Cheap to call every frame. */
  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (Math.round(r.width) === this.w && Math.round(r.height) === this.h && dpr === this.dpr) return;
    this.w = Math.round(r.width);
    this.h = Math.round(r.height);
    this.dpr = dpr;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
  }

  get size(): { w: number; h: number } {
    return { w: this.w, h: this.h };
  }

  emit(x: number, y: number, o: EmitOptions): void {
    if (!this.enabled) return;
    const n = o.count ?? 1;
    const spread = o.spread ?? 40;
    for (let i = 0; i < n && this.list.length < MAX_PARTICLES; i++) {
      const life = (o.life ?? 0.7) * (0.6 + Math.random() * 0.8);
      this.list.push({
        kind: o.kind ?? 'ember',
        x,
        y,
        vx: (o.vx ?? 0) + (Math.random() - 0.5) * spread,
        vy: (o.vy ?? 0) + (Math.random() - 0.5) * spread,
        life,
        max: life,
        size: (o.size ?? 4) * (0.6 + Math.random() * 0.8),
        color: o.colors[Math.floor(Math.random() * o.colors.length)],
        spin: (Math.random() - 0.5) * 12,
        angle: Math.random() * Math.PI * 2,
      });
    }
  }

  /** Advances and draws every particle. `dt` is in milliseconds. */
  step(dt: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const s = Math.min(dt, 50) / 1000;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (!this.list.length) return;
    const next: Particle[] = [];
    for (const p of this.list) {
      p.life -= s;
      if (p.life <= 0) continue;
      p.vy += GRAVITY[p.kind] * s;
      if (p.kind === 'confetti') p.vx *= 0.985;
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.angle += p.spin * s;
      next.push(p);
      const t = p.life / p.max;
      if (p.kind === 'confetti') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, t * 2);
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8 * Math.abs(Math.cos(p.angle * 2)) + 1);
        ctx.restore();
      } else if (p.kind === 'puff') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = t * 0.45;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.8 - t), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'streak') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = t * 0.7;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * t;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.12, p.y - p.vy * 0.12);
        ctx.stroke();
      } else {
        // Embers and sparks: a soft glowing dot that shrinks as it fades.
        ctx.globalCompositeOperation = 'lighter';
        const r = p.size * (p.kind === 'ember' ? 0.4 + t * 0.6 : t);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.2);
        g.addColorStop(0, p.color);
        g.addColorStop(0.35, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = Math.min(0.75, t * 1.2);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.list = next;
  }

  get count(): number {
    return this.list.length;
  }
}

/** Trail colors that suit each tribe's element. */
export const TRAIL_COLORS: Record<string, string[]> = {
  emberback: ['#ffd43b', '#ff922b', '#ff6b1a', '#fff3bf'],
  tidefin: ['#99e9f2', '#3bc9db', '#e3fafc', '#74c0fc'],
  stormcrest: ['#fff3bf', '#ffe066', '#d0bfff', '#ffffff'],
  mossclaw: ['#c0eb75', '#8ce99a', '#fff9db', '#69db7c'],
  frostspine: ['#e7f5ff', '#a5d8ff', '#ffffff', '#d0ebff'],
  duneskimmer: ['#ffe8a3', '#ffc078', '#fff4e6', '#ffd43b'],
  shadeglide: ['#d0bfff', '#b197fc', '#ffffff', '#91a7ff'],
};

export const CONFETTI = ['#ffd43b', '#ff6b6b', '#4dabf7', '#69db7c', '#b197fc', '#ff922b', '#ffffff'];

/**
 * Puts a particle field over `host` and runs it while `host` is on the page.
 * `tick` runs every frame, for steady effects like rising sparkles.
 */
export function attachField(host: HTMLElement, tick?: (field: ParticleField, dt: number) => void): ParticleField {
  const field = new ParticleField();
  field.enabled = !document.body.classList.contains('reduced-motion');
  host.append(field.canvas);
  let last = performance.now();
  let seen = false;
  const loop = (now: number): void => {
    if (!host.isConnected) {
      if (seen) return;
    } else {
      seen = true;
      const dt = now - last;
      field.resize();
      tick?.(field, dt);
      field.step(dt);
    }
    last = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return field;
}
