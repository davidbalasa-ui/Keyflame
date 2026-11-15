// The race launch: during the 3-2-1 countdown the player's dragon crouches in its cliff
// nest, springs out, flaps hard up through a taller sky, banks off the right edge, dives
// back in from the left and lands in its lane just before "Fly!".
//
// It poses the real dragon's own parts (wings, tail, head, body), so every tribe, palette,
// star tier, Starglint and the simple-art fallback work with no extra art. Body poses
// change on "twos" (12 poses a second) like hand-drawn cel animation, while the flight
// path stays smooth. Only transforms and opacity move, nothing re-lays out the page, and
// players who chose less motion skip it.

import { h } from './dom';
import type { ParticleField } from './particles';

/** How long the launch takes. The countdown says "Fly!" at 2700 ms. */
export const LAUNCH_MS = 2500;
/** Poses per second for the body parts: 12 is "on twos", the classic cartoon rate. */
const POSE_FPS = 12;

// A cel-shaded rock ledge with a twig nest, in the same flat-shade style as the dragons.
const NEST_SVG = `<svg viewBox="0 0 220 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M0 58 C30 50 70 46 110 50 C150 46 190 52 220 60 L220 120 L0 120Z" fill="#4a3a5c"/>
  <path d="M0 58 C30 50 70 46 110 50 C150 46 190 52 220 60 L220 70 C180 64 140 62 110 64 C70 60 30 64 0 70Z" fill="#6b5a80"/>
  <path d="M20 84 L60 78 L48 96Z M140 88 L190 80 L176 102Z M90 104 L120 98 L112 116Z" fill="#3a2c4a"/>
  <ellipse cx="110" cy="52" rx="74" ry="16" fill="#3d2a1c"/>
  <path d="M38 50 C60 30 160 30 182 50 C170 62 50 62 38 50Z" fill="#8a5a2b"/>
  <path d="M44 48 C70 36 150 36 176 48 C160 44 60 44 44 48Z" fill="#b97a3a"/>
  <g stroke="#5c3a1a" stroke-width="3" stroke-linecap="round" fill="none">
    <path d="M40 50 L76 40"/><path d="M60 56 L112 42"/><path d="M96 58 L150 40"/><path d="M128 56 L180 46"/>
    <path d="M52 42 L96 54"/><path d="M120 38 L172 54"/><path d="M80 36 L132 52"/>
  </g>
  <g stroke="#d9a35c" stroke-width="2" stroke-linecap="round" fill="none">
    <path d="M70 44 L100 38"/><path d="M118 40 L150 46"/><path d="M48 52 L66 48"/>
  </g>
</svg>`;

// A cartoon impact star where the dragon kicks off, and smear arcs behind it on the jump.
const BURST_SVG = `<svg viewBox="-60 -60 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M0 -56 L12 -18 L48 -34 L24 -4 L56 12 L18 16 L28 52 L0 26 L-28 52 L-18 16 L-56 12 L-24 -4 L-48 -34 L-12 -18Z" fill="#fff4c2" stroke="#ffb02e" stroke-width="5" stroke-linejoin="round"/>
  <circle r="14" fill="#fff"/>
</svg>`;
const SMEAR_SVG = `<svg viewBox="0 0 266 162" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="#fff" stroke-linecap="round">
  <path d="M120 120 C80 140 40 150 -10 162" stroke-width="10" opacity="0.85"/>
  <path d="M150 104 C110 132 70 150 20 170" stroke-width="7" opacity="0.7"/>
  <path d="M96 100 C64 116 30 124 -20 128" stroke-width="6" opacity="0.6"/>
</svg>`;

type Pose = { wf: string; wb: string; tail: string; head: string; rig: string; body: string };

const lerp = (a: number, b: number, k: number): number => a + (b - a) * Math.max(0, Math.min(1, k));
const ease = (k: number): number => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const wing = (rot: number, sx: number, sy: number): string => `rotate(${rot.toFixed(1)}deg) scale(${sx.toFixed(2)}, ${sy.toFixed(2)})`;
const rot = (deg: number): string => `rotate(${deg.toFixed(1)}deg)`;

/** The dragon's pose at time t (0 to 1 of the launch). */
export function poseAt(t: number): Pose {
  const ms = t * LAUNCH_MS;
  // One wingbeat: 0 = wings up, 1 = wings down (matches the race's flap animation).
  const beat = (period: number, from: number): number => (1 - Math.cos(((ms - from) / period) * Math.PI * 2)) / 2;
  let wf: [number, number, number];
  let tail: number;
  let head: number;
  let bob = 0;
  let body = 'none';

  if (t < 0.06) {
    // Perched, wings folded, looking up at the sky.
    wf = [-12, 0.9, 0.3]; tail = -6; head = -6;
  } else if (t < 0.17) {
    // Crouch: sink down, tuck the head, cock the tail.
    const k = ease((t - 0.06) / 0.08);
    wf = [lerp(-12, -16, k), 0.9, lerp(0.3, 0.24, k)]; tail = lerp(-6, -22, k); head = lerp(-6, 10, k);
    body = `translateY(${(8 * k).toFixed(1)}%) scale(${lerp(1, 1.1, k).toFixed(3)}, ${lerp(1, 0.82, k).toFixed(3)})`;
  } else if (t < 0.21) {
    // The spring: stretched out (the smear frame), wings flung up, tail whipping down.
    wf = [-30, 1.08, 1.14]; tail = 24; head = -16;
    body = 'translateY(-6%) scale(0.84, 1.22)';
  } else if (t < 0.52) {
    // Climbing with hard, fast wingbeats; the head turns forward as it banks.
    const b = beat(300, 0.21 * LAUNCH_MS);
    wf = [lerp(-14, 12, b), 1, lerp(1.05, -0.66, b)];
    tail = lerp(16, -10, ease((t - 0.21) / 0.12)) + 6 * Math.sin(ms / 160);
    head = t < 0.42 ? -10 : lerp(-10, 8, (t - 0.42) / 0.1);
    bob = lerp(3, -4, b);
    if (t < 0.25) body = 'scale(0.95, 1.06)';
  } else if (t < 0.84) {
    // The dive: wings swept back, tail straight, head pointed at the start line.
    wf = [18, 0.9, 0.36]; tail = -4 + 2 * Math.sin(ms / 90); head = 6;
  } else {
    // Flare and land: wings spread to brake, then settle into the race's flying pose.
    const k = ease((t - 0.84) / 0.1);
    const b = beat(520, 0.84 * LAUNCH_MS);
    wf = [lerp(18, lerp(-12, 6, b), k), lerp(0.9, 1, k), lerp(0.36, lerp(1.04, -0.3, b), k)];
    tail = lerp(-4, 4, k); head = lerp(6, -2, k); bob = lerp(0, 2, b);
    if (t > 0.97) wf = [-8, 1, 1];
  }
  return {
    wf: wing(...wf),
    // The far wing follows the near one, a little smaller, like the race flap.
    wb: wing(wf[0] + 2, wf[1], wf[2] * 0.95),
    tail: rot(tail),
    head: rot(head),
    rig: `translateY(${bob.toFixed(1)}px)`,
    body,
  };
}

/** Holds each pose for a frame on twos: a list of keyframes that step instead of blend. */
function steppedTrack(pick: (p: Pose) => string): Keyframe[] {
  const n = Math.round((LAUNCH_MS / 1000) * POSE_FPS);
  const frames: Keyframe[] = [];
  for (let i = 0; i <= n; i++) frames.push({ offset: i / n, transform: pick(poseAt(i / n)), easing: 'steps(1, end)' });
  return frames;
}

/**
 * Plays the launch over `sky`, ending exactly where `racer` sits at the start line.
 * For the launch the sky reaches up over the race title, so the flight has room even on
 * phones; the page itself never moves. Returns a function that ends it at once.
 */
export function playLaunch(sky: HTMLElement, racer: HTMLElement, dragonMarkup: string, fx: ParticleField, trail: string[], skyTop: string): () => void {
  const track = sky.parentElement;
  if (!track) return () => {};
  const skyBox = sky.getBoundingClientRect();
  const W = skyBox.width;
  // The taller sky: up to 240px more, reaching up over the race title but never over the top bar.
  const bar = document.querySelector('.top-bar')?.getBoundingClientRect().bottom ?? 0;
  const extra = Math.max(0, Math.min(240, skyBox.top - Math.max(0, bar) - 6));
  const H = skyBox.height + extra;
  const layerBox = { left: skyBox.left, top: skyBox.top - extra };
  const r = (racer.querySelector('.racer-art') ?? racer).getBoundingClientRect();
  const end = { left: r.left - layerBox.left, top: r.top - layerBox.top, width: r.width, height: r.height };
  if (!W || !H || !end.width) return () => {};
  const toSky = (y: number): number => y - extra;

  // The big dragon is drawn at its largest size and only ever scales down, so it stays sharp.
  const big = Math.min(W * 0.46, H * 0.9, 360);
  const nestW = big * 1.05;

  const layer = h('div', { class: 'launch-layer' });
  layer.style.top = `${-extra}px`;
  layer.style.height = `${H}px`;
  const ext = h('div', { class: 'launch-sky' });
  ext.style.height = `${extra + 2}px`;
  ext.style.background = `linear-gradient(180deg, transparent 0, ${skyTop} ${Math.min(12, extra * 0.2).toFixed(0)}px, ${skyTop} 100%)`;
  const nest = h('div', { class: 'launch-nest' });
  nest.innerHTML = NEST_SVG;
  nest.style.width = `${nestW}px`;
  const burst = h('div', { class: 'launch-burst' });
  burst.innerHTML = BURST_SVG;
  const flyer = h('div', { class: 'launch-flyer' });
  const body = h('div', { class: 'launch-body' });
  const smear = h('div', { class: 'launch-smear' });
  smear.innerHTML = SMEAR_SVG;
  body.innerHTML = dragonMarkup;
  flyer.append(smear, body);
  flyer.style.width = `${big}px`;
  layer.append(ext, nest, burst, flyer);
  track.append(layer);
  racer.style.visibility = 'hidden';

  const svgEl = body.querySelector('svg.dragon');
  const part = (sel: string): Element | null => svgEl?.querySelector(sel) ?? null;

  // The nest sits low on the left; the dragon perches in it.
  const nestX = W * 0.08;
  const nestY = H - nestW * 0.42;
  const p0 = 0.78;
  const perchX = nestX + nestW * 0.5 - big * p0 * 0.5;
  const perchY = nestY - big * p0 * 0.42;
  const at = (x: number, y: number, scale: number, deg = 0): string => `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${deg}deg) scale(${scale.toFixed(3)})`;
  const endScale = end.width / big;
  const opts: KeyframeAnimationOptions = { duration: LAUNCH_MS, fill: 'forwards' };
  const anims: Animation[] = [];

  // The flight path (smooth): perch, spring up in an arc toward the camera, bank out the
  // right edge, re-enter from the left at lane height, overshoot a touch and settle.
  anims.push(
    flyer.animate(
      [
        { offset: 0, transform: at(perchX, perchY, p0) },
        { offset: 0.17, transform: at(perchX, perchY, p0), easing: 'cubic-bezier(.2,.0,.5,1)' },
        { offset: 0.3, transform: at(W * 0.24, H * 0.06 - big * 0.2, 0.88, -18), easing: 'cubic-bezier(.4,.0,.6,1)' },
        { offset: 0.42, transform: at(W * 0.5, H * 0.02 - big * 0.1, 1, -6), easing: 'cubic-bezier(.4,.0,.9,.5)' },
        { offset: 0.52, transform: at(W + big * 0.1, H * 0.3, 1, 16) },
        { offset: 0.521, transform: at(-end.width * 2.4, end.top - end.height * 0.9, endScale * 1.3, 12), easing: 'cubic-bezier(.15,.7,.3,1)' },
        { offset: 0.84, transform: at(end.left + end.width * 0.28, end.top - end.height * 0.06, endScale * 1.05, -4), easing: 'ease-in-out' },
        { offset: 1, transform: at(end.left, end.top, endScale) },
      ],
      opts,
    ),
  );
  // Body parts on twos.
  anims.push(body.animate(steppedTrack((p) => p.body), opts));
  const tracks: [string, (p: Pose) => string][] = [['.wing-front', (p) => p.wf], ['.wing-back', (p) => p.wb], ['.tail', (p) => p.tail], ['.head', (p) => p.head], ['.rig', (p) => p.rig]];
  for (const [sel, pick] of tracks) {
    const el = part(sel);
    if (el) anims.push(el.animate(steppedTrack(pick), opts));
  }
  // Smear arcs flash for the two spring frames only.
  anims.push(smear.animate([{ offset: 0, opacity: 0 }, { offset: 0.17, opacity: 1, easing: 'steps(1, end)' }, { offset: 0.25, opacity: 0, easing: 'steps(1, end)' }, { offset: 1, opacity: 0 }], { ...opts, easing: 'linear' }));
  // The kick-off star pops at the nest.
  const bx = nestX + nestW * 0.5;
  const by = nestY + nestW * 0.1;
  const bs = nestW * 0.6;
  burst.style.width = `${bs}px`;
  anims.push(
    burst.animate(
      [
        { offset: 0, opacity: 0, transform: `translate3d(${bx - bs / 2}px, ${by - bs / 2}px, 0) scale(0.2)` },
        { offset: 0.17, opacity: 0, transform: `translate3d(${bx - bs / 2}px, ${by - bs / 2}px, 0) scale(0.2)` },
        { offset: 0.19, opacity: 1, transform: `translate3d(${bx - bs / 2}px, ${by - bs / 2}px, 0) scale(0.9) rotate(8deg)`, easing: 'ease-out' },
        { offset: 0.3, opacity: 0, transform: `translate3d(${bx - bs / 2}px, ${by - bs / 2}px, 0) scale(1.35) rotate(20deg)` },
        { offset: 1, opacity: 0, transform: `translate3d(${bx - bs / 2}px, ${by - bs / 2}px, 0) scale(1.35)` },
      ],
      opts,
    ),
  );
  // The ledge drops away once the dragon is airborne, like the camera following it up.
  anims.push(
    nest.animate(
      [
        { offset: 0, transform: `translate3d(${nestX}px, ${nestY}px, 0)` },
        { offset: 0.17, transform: `translate3d(${nestX}px, ${nestY + 5}px, 0)` },
        { offset: 0.2, transform: `translate3d(${nestX}px, ${nestY}px, 0)` },
        { offset: 0.42, transform: `translate3d(${nestX}px, ${H + 10}px, 0)`, easing: 'ease-in' },
        { offset: 1, transform: `translate3d(${nestX}px, ${H + 10}px, 0)` },
      ],
      opts,
    ),
  );
  // The tall sky folds away as the dragon dives into its lane.
  anims.push(ext.animate([{ offset: 0, opacity: 1, transform: 'translateY(0)' }, { offset: 0.6, opacity: 1, transform: 'translateY(0)', easing: 'ease-in' }, { offset: 0.82, opacity: 0, transform: `translateY(${extra * 0.5}px)` }, { offset: 1, opacity: 0 }], opts));

  const later = (t: number, fn: () => void): number => window.setTimeout(fn, LAUNCH_MS * t);
  const timers = [
    later(0.18, () => {
      fx.emit(bx, toSky(by), { count: 22, colors: ['#ffffff', '#e9ecef', '#ced4da'], kind: 'puff', vx: 0, vy: -20, spread: 150, size: 11, life: 0.7 });
      fx.emit(bx, toSky(by - nestW * 0.04), { count: 16, colors: ['#b97a3a', '#8a5a2b', '#d9a35c'], kind: 'spark', vx: 0, vy: -140, spread: 170, size: 4, life: 0.8 });
    }),
    // Speed streaks along the dive into the lane.
    ...[0.56, 0.63, 0.7, 0.77].map((t, i) =>
      later(t, () => fx.emit(end.left * (i / 4), toSky(end.top + end.height * 0.55), { count: 14, colors: [...trail, '#ffffff'], kind: 'streak', vx: -420, spread: 50, size: 5, life: 0.4 })),
    ),
    later(0.9, () => fx.emit(end.left + end.width * 0.1, toSky(end.top + end.height * 0.65), { count: 12, colors: ['#ffffff', '#e9ecef'], kind: 'puff', vx: -40, spread: 60, size: 7, life: 0.5 })),
  ];

  let done = false;
  const finish = (): void => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    anims.forEach((a) => a.cancel());
    layer.remove();
    racer.style.visibility = '';
  };
  anims[0].finished.then(finish, () => {});
  return finish;
}
