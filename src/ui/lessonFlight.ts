// The lesson flight: your dragon flies away from you into the screen, through a glowing
// ring at the end of every word, toward a gate at the end of the lesson. It is not a
// race. The rings only come closer when you type a correct key, never with the clock,
// and a word with a mistake just leaves its ring dim.
// Cheap on iPads: a handful of flat layers that only move and scale (no live filters).

import type { OwnedDragon } from '../save/store';
import type { TypingSession } from '../engine/typing';
import { dragonSvg, stageFor } from '../game/dragons';
import { h, svg } from './dom';
import { CONFETTI, TRAIL_COLORS, attachField } from './particles';

export interface LessonFlight {
  el: HTMLElement;
  /** Call after every key, with the lesson's typing session. */
  update: (s: TypingSession, correct: boolean) => void;
  /** How many rings have been flown through cleanly so far. */
  readonly clean: number;
  readonly rings: number;
}

/** Word ends, where the rings hang: the index of each space, and the end of the text. */
export function ringStops(text: string): number[] {
  const stops: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === ' ' && text[i - 1] !== ' ') stops.push(i);
  if (stops[stops.length - 1] !== text.length) stops.push(text.length);
  return stops;
}

/** True when every character of the word before this stop was typed right first time. */
export function cleanWord(text: string, missed: ReadonlySet<number>, stops: number[], n: number): boolean {
  const from = n === 0 ? 0 : stops[n - 1] + 1;
  for (let i = from; i <= Math.min(stops[n], text.length - 1); i++) if (missed.has(i)) return false;
  return true;
}

// How far ahead the scene shows, in rings, and how fast things shrink with distance.
const VIEW = 6;
const DEPTH = 1.1;
const scaleAt = (d: number): number => 1 / (1 + Math.max(-0.6, d) * DEPTH);
/** Rings weave a little left and right, so the dragon has somewhere to steer. */
const sway = (n: number): number => Math.sin(n * 1.7) * 0.12 - 0.2;

const MOUNTAINS =
  '<svg viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60 L0 40 L30 22 L58 38 L92 12 L130 36 L162 20 L196 40 L232 14 L268 34 L300 18 L338 38 L370 24 L400 36 L400 60z" fill="#2f2a78"/><path d="M0 60 L0 48 L44 34 L80 50 L120 36 L170 52 L214 38 L262 52 L310 40 L356 52 L400 44 L400 60z" fill="#231f5c"/></svg>';

export function createLessonFlight(text: string, dragon: OwnedDragon | null, sky?: readonly [string, string, string]): LessonFlight {
  const stops = ringStops(text);
  const gateAt = stops.length - 1;
  const world = h('div', { class: 'flight-world' });
  const el = h(
    'div',
    { class: 'flight', 'aria-hidden': 'true', style: sky ? `--f1:${sky[0]};--f2:${sky[1]};--f3:${sky[2]}` : '' },
    h('div', { class: 'flight-sky' }),
    svg(MOUNTAINS, 'flight-mountains'),
    h('div', { class: 'flight-ground' }),
    world,
  );

  // Rings and the finish gate. Each is a flat element that only moves and scales.
  const rings = stops.map((_, n) => {
    const gate = n === gateAt;
    const r = h('div', { class: gate ? 'f-ring f-gate' : 'f-ring' }, h('span', { class: 'f-ring-glow' }), gate ? h('span', { class: 'f-gate-flag' }, '★') : null);
    world.append(r);
    return r;
  });
  // Clouds and ground tufts that drift past; they reuse a few elements forever.
  const clouds = Array.from({ length: 5 }, (_, i) => {
    const c = h('div', { class: 'f-cloud' });
    world.append(c);
    return { el: c, z: (i / 5) * VIEW, side: i % 2 ? 1 : -1, y: 0.15 + (i % 3) * 0.08 };
  });
  const tufts = Array.from({ length: 8 }, (_, i) => {
    const t = h('div', { class: 'f-tuft' });
    world.append(t);
    return { el: t, z: (i / 8) * VIEW, side: i % 2 ? 1 : -1 };
  });

  const art = dragon ? dragonSvg(dragon.tribe, dragon.palette, stageFor(dragon.xp), 'flap', dragon.skin, dragon.marking, dragon.stars) : dragonSvg('emberback', 0, 'hatchling', 'flap');
  const rider = h('div', { class: 'f-dragon' }, svg(art, 'f-dragon-art'));
  el.append(rider);
  const trail = dragon?.skin ? CONFETTI : TRAIL_COLORS[dragon?.tribe ?? 'emberback'];

  // Distance is counted in words: each ring is one step further, however long its word.
  let target = -1;
  let cam = -1;
  let steer = 0;
  let passed = 0;
  let clean = 0;
  let drift = 0;
  let index = 0;

  const field = attachField(el, (f, dt) => {
    const { w, h: ht } = f.size;
    if (!w) return;
    const k = 1 - Math.exp(-dt / 160);
    cam += (target - cam) * k;
    drift += dt / 4000;
    const horizon = ht * 0.34;
    const place = (node: HTMLElement, d: number, x: number, y: number, size: number): number => {
      const s = scaleAt(d);
      const show = d > -0.5 && d < VIEW;
      node.style.opacity = show ? String(Math.min(1, (VIEW - d) / 1.5, d < 0 ? 1 + d * 2 : 1)) : '0';
      if (!show) return s;
      const px = w / 2 + x * w * s;
      const py = horizon + (y * ht - horizon) * s;
      node.style.transform = `translate3d(${(px - size / 2).toFixed(1)}px, ${(py - size / 2).toFixed(1)}px, 0) scale(${(s * 1).toFixed(3)})`;
      node.style.zIndex = String(1000 - Math.round(d * 10));
      return s;
    };
    const ringSize = Math.min(w * 0.42, ht * 0.8);
    rings.forEach((r, n) => {
      r.style.width = r.style.height = `${ringSize}px`;
      place(r, n - cam, sway(n), 0.6, ringSize);
    });
    for (const c of clouds) {
      // Clouds drift slowly on their own, and faster as you fly.
      let d = c.z - cam - drift;
      d = ((d % VIEW) + VIEW) % VIEW;
      c.el.style.width = `${w * 0.3}px`;
      place(c.el, d, c.side * 0.7, c.y, w * 0.3);
    }
    for (const t of tufts) {
      let d = t.z - cam;
      d = ((d % VIEW) + VIEW) % VIEW;
      place(t.el, d, t.side * 0.62, 1.05, w * 0.12);
    }
    // The dragon steers toward the next ring.
    const next = Math.min(passed, gateAt);
    steer += (sway(next) + 0.2 - steer) * k;
    rider.style.transform = `translate3d(${(steer * w * 0.35).toFixed(1)}px, 0, 0) rotate(${(-steer * 20).toFixed(1)}deg)`;
    if (f.enabled && index > 0) f.emit(w * 0.12 + steer * w * 0.35, ht * 0.9, { count: dt > 40 ? 1 : Math.random() < 0.35 ? 1 : 0, colors: trail, kind: 'ember', vy: 40, spread: 18, size: 4, life: 0.6 });
  });

  const burst = (n: number, ok: boolean): void => {
    const r = rings[n];
    r.classList.add('passed');
    if (!ok) return;
    const { w, h: ht } = field.size;
    field.emit(w / 2 + sway(n) * w, ht * 0.6, { count: n === gateAt ? 60 : 18, colors: n === gateAt ? CONFETTI : ['#ffd43b', '#fff3bf', '#ffa94d'], kind: 'spark', spread: n === gateAt ? 260 : 140, size: 5, life: 0.8 });
  };

  const api: LessonFlight = {
    el,
    rings: stops.length,
    get clean() {
      return clean;
    },
    update: (s, correct) => {
      index = s.index;
      const missed = s.missedAt;
      // Which word we are in, and how far through it, as one number.
      let w = 0;
      while (w < gateAt && s.index > stops[w]) w++;
      const from = w === 0 ? 0 : stops[w - 1] + 1;
      target = s.done ? gateAt + 0.6 : w + Math.min(1, (s.index - from) / Math.max(1, stops[w] + 1 - from)) - 1;
      // A ring is flown through once the key after its word is typed.
      while (passed < stops.length && s.index >= (passed === gateAt ? text.length : stops[passed] + 1)) {
        const ok = cleanWord(text, missed, stops, passed);
        if (ok) clean++;
        else rings[passed].classList.add('dim');
        burst(passed, ok);
        passed++;
      }
      // Mistakes in the word being typed dim the ring ahead.
      if (passed < stops.length) rings[passed].classList.toggle('dim', !cleanWord(text, missed, stops, passed));
      rings.forEach((r, n) => r.classList.toggle('next', n === passed));
      if (!correct) {
        rider.classList.remove('wobble-once');
        void rider.offsetWidth;
        rider.classList.add('wobble-once');
      }
    },
  };
  rings[0]?.classList.add('next');
  return api;
}
