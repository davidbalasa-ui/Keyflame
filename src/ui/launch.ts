// The race launch: during the 3-2-1 countdown the player's dragon leaps out of its
// cliff nest, sweeps past the camera, and glides into its lane just before "Fly!".
// It reuses the real dragon art (every tribe, palette, star tier, Starglint and the
// simple-art fallback come for free) and only animates transforms and opacity, so
// iPad Safari keeps it on the compositor. Players who chose less motion skip it.

import { h } from './dom';
import type { ParticleField } from './particles';

/** How long the launch takes. The countdown says "Fly!" at 2700 ms. */
export const LAUNCH_MS = 2500;

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

interface Box { left: number; top: number; width: number; height: number }

const rel = (el: Element, to: Box): Box => {
  const r = el.getBoundingClientRect();
  return { left: r.left - to.left, top: r.top - to.top, width: r.width, height: r.height };
};

/**
 * Plays the launch inside `sky`, ending exactly where `racer` sits at the start line.
 * Returns a function that cancels it and shows the racer straight away.
 */
export function playLaunch(sky: HTMLElement, racer: HTMLElement, dragonMarkup: string, fx: ParticleField, trail: string[]): () => void {
  const skyBox = sky.getBoundingClientRect();
  const W = skyBox.width;
  const H = skyBox.height;
  const end = rel(racer.querySelector('.racer-art') ?? racer, skyBox);
  if (!W || !H || !end.width) return () => {};

  // The big dragon is drawn at its largest size and only ever scales down, so it stays sharp.
  const big = Math.min(W * 0.44, H * 0.95, 340);
  const s = (px: number): number => px / big;
  const nestW = big * 1.05;

  const layer = h('div', { class: 'launch-layer' });
  const nest = h('div', { class: 'launch-nest' });
  nest.innerHTML = NEST_SVG;
  nest.style.width = `${nestW}px`;
  const flyer = h('div', { class: 'launch-flyer' });
  const body = h('div', { class: 'launch-body' });
  body.innerHTML = dragonMarkup;
  flyer.append(body);
  flyer.style.width = `${big}px`;
  layer.append(nest, flyer);
  sky.append(layer);

  const art = body.firstElementChild as SVGElement | null;
  racer.style.visibility = 'hidden';

  // Nest sits low on the left third; the dragon perches in it.
  const nestX = W * 0.08;
  const nestY = H - nestW * 0.42;
  nest.style.transform = `translate3d(${nestX}px, ${nestY}px, 0)`;

  const at = (x: number, y: number, scale: number, rot = 0): string => `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot}deg) scale(${scale.toFixed(3)})`;
  const endScale = s(end.width);
  const anims: Animation[] = [];

  // Path: perch (a little smaller, as if further away) -> crouch -> leap up in an arc toward
  // the camera -> bank out the right edge -> dive back in from the left -> settle on the start line.
  const p0 = 0.78;
  const perchX0 = nestX + nestW * 0.5 - big * p0 * 0.5;
  const perchY0 = nestY - big * p0 * 0.42;
  anims.push(
    flyer.animate(
      [
        { offset: 0, transform: at(perchX0, perchY0, p0) },
        { offset: 0.14, transform: at(perchX0, perchY0, p0), easing: 'cubic-bezier(.25,.0,.45,1)' },
        { offset: 0.3, transform: at(W * 0.26, H * 0.02 - big * 0.25, 0.9, -16), easing: 'cubic-bezier(.4,.0,.6,1)' },
        { offset: 0.42, transform: at(W * 0.5, -big * 0.12, 1, -4), easing: 'cubic-bezier(.4,.0,.9,.5)' },
        { offset: 0.52, transform: at(W + big * 0.1, H * 0.25, 1, 14) },
        { offset: 0.521, transform: at(-end.width * 2.4, end.top - end.height * 0.7, endScale * 1.3, 10), easing: 'cubic-bezier(.15,.7,.3,1)' },
        { offset: 0.86, transform: at(end.left + end.width * 0.25, end.top - end.height * 0.05, endScale * 1.04, -2), easing: 'ease-in-out' },
        { offset: 1, transform: at(end.left, end.top, endScale) },
      ],
      { duration: LAUNCH_MS, fill: 'forwards' },
    ),
  );
  // Anticipation: squash down in the nest, stretch on the jump.
  anims.push(
    body.animate(
      [
        { offset: 0, transform: 'scale(1, 1)' },
        { offset: 0.08, transform: 'scale(1.06, 0.88) translateY(6%)' },
        { offset: 0.15, transform: 'scale(1.08, 0.84) translateY(8%)' },
        { offset: 0.2, transform: 'scale(0.94, 1.1) translateY(-4%)' },
        { offset: 0.3, transform: 'scale(1, 1)' },
        { offset: 1, transform: 'scale(1, 1)' },
      ],
      { duration: LAUNCH_MS, fill: 'forwards' },
    ),
  );
  // The ledge drops away once the dragon is airborne, like the camera following it up.
  anims.push(
    nest.animate(
      [
        { offset: 0, transform: `translate3d(${nestX}px, ${nestY}px, 0)`, opacity: 1 },
        { offset: 0.18, transform: `translate3d(${nestX}px, ${nestY + 4}px, 0)`, opacity: 1 },
        { offset: 0.42, transform: `translate3d(${nestX}px, ${H + 10}px, 0)`, opacity: 1, easing: 'ease-in' },
        { offset: 1, transform: `translate3d(${nestX}px, ${H + 10}px, 0)`, opacity: 0 },
      ],
      { duration: LAUNCH_MS, fill: 'forwards' },
    ),
  );

  // Wings fold while perched and start beating on the jump; they beat fast on the dive in.
  art?.classList.add('sleepy-wings');
  const timers = [
    window.setTimeout(() => {
      art?.classList.remove('sleepy-wings');
      art?.classList.add('flap');
      art?.style.setProperty('--flap', '0.32s');
      const cx = nestX + nestW * 0.5;
      fx.emit(cx, nestY + nestW * 0.18, { count: 22, colors: ['#ffffff', '#e9ecef', '#ced4da'], kind: 'puff', vx: 0, vy: -20, spread: 140, size: 10, life: 0.7 });
      fx.emit(cx, nestY + nestW * 0.12, { count: 14, colors: ['#b97a3a', '#8a5a2b', '#d9a35c'], kind: 'spark', vx: 0, vy: -120, spread: 160, size: 4, life: 0.8 });
    }, LAUNCH_MS * 0.17),
    window.setTimeout(() => {
      // Speed streaks behind it as it dives into the lane.
      fx.emit(end.left, end.top + end.height * 0.6, { count: 24, colors: trail, kind: 'streak', vx: -380, spread: 60, size: 5, life: 0.45 });
    }, LAUNCH_MS * 0.62),
    window.setTimeout(() => art?.style.setProperty('--flap', '0.6s'), LAUNCH_MS * 0.86),
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
