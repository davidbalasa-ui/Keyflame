// Cel-shaded eggs and evolution star tiers, in the same bold style as the cel dragons
// (dark outline, hard shadow and light bands, rim light, small texture shapes).
//
// The egg keeps the classic outline exactly, so the tap cracks (eggCracksSvg) and the
// hatch split along EGG_SEAM still line up. Each tribe has its own shell pattern,
// and the seed moves small details so no two eggs look quite the same.
//
// iPad speed: no filters, and nothing animates shape by shape. Evolution sparkles
// sit in one group that pulses as a whole (class "cel-twinkle").

import { TRIBES, type Palette, type TribeId } from '../dragons';
import { dk, f, lt, luma, mix, rnd, star4 } from './cel';

/** The classic egg outline. Do not change it: cracks and the hatch split follow it. */
export const EGG_PATH = 'M50 6 C78 6 90 52 90 74 C90 98 72 112 50 112 C28 112 10 98 10 74 C10 52 22 6 50 6z';
/** Hard shadow crescent on the lower right. */
const SHADOW = 'M68 14 C84 34 92 58 92 76 C92 102 72 116 46 116 C30 116 16 108 8 96 C32 106 62 100 73 78 C81 60 80 36 68 14Z';
/** Hard light band on the upper left. */
const LIGHT = 'M14 66 C14 46 26 12 48 8 C38 18 30 34 28 50 C27 60 27 68 29 76 C22 74 16 72 14 66Z';
const RIM = 'M14.5 70 C15 50 26 12 50 9.5';
const BOUNCE = 'M85 86 C81 98 70 106 56 108.5';

let uid = 0;

interface EggCtx {
  id: string;
  p: Palette;
  r: () => number;
  line: string;
}

/** A number between a and b from the egg's seed. */
const between = (r: () => number, a: number, b: number): number => a + r() * (b - a);

/** A zigzag from x, y heading at angle (degrees), as a path. */
function zig(r: () => number, x: number, y: number, angle: number, len: number, steps: number): string {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let d = `M${f(x)} ${f(y)}`;
  for (let i = 1; i <= steps; i++) {
    const t = (len * i) / steps;
    const side = (i % 2 ? 1 : -1) * between(r, 2, 4.5);
    d += ` L${f(x + dx * t - dy * side)} ${f(y + dy * t + dx * side)}`;
  }
  return d;
}

/** Emberback: warm volcanic shell with dark rock patches, glowing lava cracks and ember specks. */
function emberback(c: EggCtx): string {
  const { p, r, line } = c;
  const rock = mix(dk(p.body, 0.35), p.wing, 0.35);
  const hot = lt(p.accent, 0.55);
  let s = '';
  // Dark lava-rock spots, each with a lit rim and a warm glint.
  const spots: Array<[number, number]> = [[30, 46], [64, 34], [50, 72], [74, 64], [26, 86], [62, 98], [40, 26]];
  for (const [bx, by] of spots) {
    const x = bx + between(r, -3, 3);
    const y = by + between(r, -3, 3);
    const w = between(r, 4.5, 7);
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w)}" ry="${f(w * 0.8)}" fill="${rock}" stroke="${line}" stroke-width="1"/>`;
    s += `<path d="M${f(x - w * 0.8)} ${f(y - w * 0.1)} A${f(w * 0.85)} ${f(w * 0.68)} 0 0 1 ${f(x + w * 0.6)} ${f(y - w * 0.5)} A${f(w)} ${f(w * 0.75)} 0 0 0 ${f(x - w * 0.8)} ${f(y - w * 0.1)}Z" fill="${lt(rock, 0.3)}"/>`;
    s += `<circle cx="${f(x + w * 0.25)}" cy="${f(y + w * 0.2)}" r="${f(w * 0.22)}" fill="${p.accent}"/>`;
  }
  // Lava cracks: a soft glow under a bright core.
  const cracks = [
    zig(r, 18, between(r, 58, 66), between(r, -10, 10), 30, 4),
    zig(r, between(r, 52, 58), between(r, 18, 24), between(r, 70, 100), 30, 4),
    zig(r, between(r, 42, 48), between(r, 86, 92), between(r, -20, 0), 34, 4),
  ];
  s += cracks.map((d) => `<path d="${d}" stroke="${p.accent}" stroke-width="5" fill="none" opacity="0.55" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  s += cracks.map((d) => `<path d="${d}" stroke="${hot}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  // Ember specks.
  for (let i = 0; i < 9; i++) s += `<circle cx="${f(between(r, 20, 80))}" cy="${f(between(r, 24, 104))}" r="${f(between(r, 0.9, 1.8))}" fill="${i % 3 ? p.accent : hot}"/>`;
  return s;
}

/** Tidefin: deep water with curling waves, a thin high wave and pearly glints. */
function tidefin(c: EggCtx): string {
  const { p, r, line } = c;
  const foam = lt(p.belly, 0.4);
  const phase = between(r, 0, 12);
  const wave = (y: number, amp: number): string => {
    let d = `M-4 ${y}`;
    for (let x = -4 - phase; x < 104; x += 16) d += ` Q${f(x + 4)} ${f(y - amp)} ${f(x + 8)} ${y} T${f(x + 16)} ${y}`;
    return d;
  };
  const y1 = f(between(r, 74, 80));
  let s = `<path d="${wave(y1, 7)} L104 124 L-4 124Z" fill="${p.wing}"/>`;
  s += `<path d="${wave(y1 + 16, 5)} L104 124 L-4 124Z" fill="${dk(p.wing, 0.22)}"/>`;
  s += `<path d="${wave(y1, 7)}" stroke="${foam}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${wave(y1 + 16, 5)}" stroke="${p.accent}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  // Wave curls on the crests.
  for (let x = 4 - phase; x < 100; x += 16) {
    if (x < 8 || x > 92) continue;
    s += `<path d="M${f(x)} ${f(y1 - 3)} a3.4 3.4 0 1 1 4.8 3.6" stroke="${foam}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  // A thin high wave line with two curls.
  const y2 = f(between(r, 44, 50));
  s += `<path d="M14 ${y2} q6 -6 12 0 t12 0 t12 0 t12 0 t12 0 t12 0" stroke="${lt(p.accent, 0.35)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  // Pearls, each with a soft lilac shadow and a glint.
  const pearls: Array<[number, number]> = [[30, 30], [64, 56], [34, 62], [56, 96], [74, 86]];
  for (const [bx, by] of pearls) {
    const x = bx + between(r, -3, 3);
    const y = by + between(r, -3, 3);
    const pr = between(r, 2.4, 3.6);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(pr)}" fill="#fdf8ff" stroke="${line}" stroke-width="0.9"/>`;
    s += `<path d="M${f(x - pr * 0.9)} ${f(y + pr * 0.2)} a${f(pr * 0.9)} ${f(pr * 0.9)} 0 0 0 ${f(pr * 1.8)} 0z" fill="#dcd0f5"/>`;
    s += `<circle cx="${f(x - pr * 0.35)}" cy="${f(y - pr * 0.35)}" r="${f(pr * 0.32)}" fill="#fff"/>`;
  }
  // Bubbles.
  for (let i = 0; i < 4; i++) s += `<circle cx="${f(between(r, 22, 78))}" cy="${f(between(r, 16, 40))}" r="${f(between(r, 1.2, 2))}" fill="none" stroke="${foam}" stroke-width="0.9"/>`;
  return s;
}

/** Stormcrest: bold angular zigzag bands with a gold stripe, and small diamonds between them. */
function stormcrest(c: EggCtx): string {
  const { p, r, line } = c;
  const band = (y: number, h: number, amp: number, phase: number): string => {
    let top = `M-4 ${f(y)}`;
    let bot = '';
    const pts: Array<[number, number]> = [];
    for (let x = -4 - phase, i = 0; x <= 108; x += 7, i++) pts.push([x, y + (i % 2 ? -amp : amp)]);
    for (const [x, yy] of pts) top += ` L${f(x)} ${f(yy)}`;
    for (const [x, yy] of [...pts].reverse()) bot += ` L${f(x)} ${f(yy + h)}`;
    return `${top}${bot}Z`;
  };
  const zline = (y: number, amp: number, phase: number): string => {
    let d = `M${f(-4 - phase)} ${f(y + amp)}`;
    for (let x = -4 - phase + 7, i = 1; x <= 108; x += 7, i++) d += ` L${f(x)} ${f(y + (i % 2 ? -amp : amp))}`;
    return d;
  };
  const ph = between(r, 0, 7);
  const ys = [between(r, 34, 38), between(r, 60, 64), between(r, 88, 92)];
  let s = '';
  // Each band casts a hard shadow just below it.
  const drop = dk(p.body, 0.35);
  s += `<path d="${band(ys[0] + 2.4, 7, 4, ph)}" fill="${drop}"/><path d="${band(ys[1] + 2.4, 11, 5, ph + 3.5)}" fill="${drop}"/><path d="${band(ys[2] + 2.4, 7, 4, ph)}" fill="${drop}"/>`;
  s += `<path d="${band(ys[0], 7, 4, ph)}" fill="${p.belly}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
  s += `<path d="${band(ys[1], 11, 5, ph + 3.5)}" fill="${p.wing}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
  s += `<path d="${zline(ys[1] + 5.5, 5, ph + 3.5)}" stroke="${p.accent}" stroke-width="2.2" fill="none" stroke-linejoin="round"/>`;
  s += `<path d="${band(ys[2], 7, 4, ph)}" fill="${p.belly}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
  // Small lit chevrons on top of the light bands.
  s += `<path d="${zline(ys[0] + 1.6, 4, ph)}" stroke="${lt(p.belly, 0.6)}" stroke-width="1" fill="none" opacity="0.9"/>`;
  s += `<path d="${zline(ys[2] + 1.6, 4, ph)}" stroke="${lt(p.belly, 0.6)}" stroke-width="1" fill="none" opacity="0.9"/>`;
  // Little dots along the dark band.
  for (let x = 14 + between(r, 0, 6); x < 88; x += 11) s += `<circle cx="${f(x)}" cy="${f(ys[1] + 5.5 + between(r, -1, 1))}" r="1.1" fill="${p.belly}" opacity="0.8"/>`;
  // Diamonds between the bands.
  const dia: Array<[number, number]> = [[34, 22], [58, 18], [26, 50], [50, 48], [72, 50], [36, 78], [62, 78], [48, 104]];
  for (const [bx, by] of dia) {
    if (r() < 0.12) continue;
    const x = bx + between(r, -2.5, 2.5);
    const y = by + between(r, -2, 2);
    const d = between(r, 2.4, 3.4);
    s += `<path d="M${f(x)} ${f(y - d * 1.3)} L${f(x + d)} ${f(y)} L${f(x)} ${f(y + d * 1.3)} L${f(x - d)} ${f(y)}Z" fill="${p.accent}" stroke="${line}" stroke-width="0.8" stroke-linejoin="round"/>`;
    s += `<path d="M${f(x)} ${f(y - d * 1.3)} L${f(x + d)} ${f(y)} L${f(x)} ${f(y + d * 1.3)}Z" fill="${dk(p.accent, 0.25)}"/>`;
  }
  return s;
}

/** Mossclaw: two-tone leaves with a midrib, little flowers, and a moss tuft on top. */
function mossclaw(c: EggCtx): string {
  const { p, r, line } = c;
  const leafA = lt(p.belly, 0.1);
  const leafB = mix(p.belly, p.body, 0.45);
  const rib = dk(p.body, 0.3);
  const spots: Array<[number, number, number]> = [[30, 42, -30], [64, 34, 30], [48, 62, 10], [24, 76, -50], [72, 70, 50], [40, 96, -20], [64, 96, 35], [46, 26, -10]];
  let s = '';
  for (const [bx, by, ba] of spots) {
    const x = bx + between(r, -3, 3);
    const y = by + between(r, -3, 3);
    const a = ba + between(r, -20, 20);
    const k = between(r, 1.05, 1.35);
    s += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${f(k)})">`;
    s += `<path d="M0 7 Q8 0 0 -9 Q-8 0 0 7Z" fill="${leafA}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
    s += `<path d="M0 7 Q8 0 0 -9Z" fill="${leafB}"/>`;
    s += `<path d="M0 8 L0 -6" stroke="${rib}" stroke-width="1" stroke-linecap="round"/>`;
    s += `</g>`;
  }
  // Tiny flowers.
  for (let i = 0; i < 4; i++) {
    const x = between(r, 22, 78);
    const y = between(r, 30, 104);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="1.9" fill="${p.accent}" stroke="${line}" stroke-width="0.6"/><circle cx="${f(x - 0.5)}" cy="${f(y - 0.5)}" r="0.6" fill="#fff"/>`;
  }
  return s;
}

/** Mossclaw's tuft, drawn over the outline so it sits on top of the egg. */
function mossTuft(c: EggCtx): string {
  const { p, r, line } = c;
  const moss = lt(p.body, 0.18);
  const sh = dk(p.body, 0.15);
  const dx = between(r, -3, 3);
  const blobs: Array<[number, number, number]> = [[40, 13, 5], [46, 8, 6], [54, 7.5, 6], [60, 12, 5]];
  let s = '';
  // Two sprout leaves.
  s += `<path d="M${f(50 + dx)} 4 q-2 -7 -8 -8 q1 6 8 8z" fill="${lt(p.belly, 0.1)}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
  s += `<path d="M${f(51 + dx)} 4 q3 -6 9 -6 q-2 6 -9 6z" fill="${mix(p.belly, p.body, 0.4)}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
  for (const [x, y, rr] of blobs) s += `<circle cx="${f(x + dx)}" cy="${y}" r="${rr}" fill="${moss}" stroke="${line}" stroke-width="1.3"/>`;
  // One shadow band and lit tops, as cel shapes inside the tuft.
  s += `<path d="M${f(36 + dx)} 15 Q${f(50 + dx)} 19 ${f(64 + dx)} 14 Q${f(60 + dx)} 18.5 ${f(50 + dx)} 18.5 Q${f(40 + dx)} 18.5 ${f(36 + dx)} 15Z" fill="${sh}"/>`;
  for (const [x, y, rr] of blobs) s += `<ellipse cx="${f(x + dx - rr * 0.3)}" cy="${f(y - rr * 0.4)}" rx="${f(rr * 0.45)}" ry="${f(rr * 0.28)}" fill="${lt(moss, 0.35)}"/>`;
  return s;
}

/** Frostspine: faceted ice crystal patches and frost specks. */
function frostspine(c: EggCtx): string {
  const { p, r, line } = c;
  const iceLit = '#ffffff';
  const iceDark = lt(p.wing, 0.15);
  const crystal = (x: number, y: number, len: number, w: number, a: number): string =>
    `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})">` +
    `<path d="M0 0 L${f(-w)} ${f(-len * 0.25)} L${f(-w)} ${f(-len * 0.8)} L0 ${f(-len)} L${f(w)} ${f(-len * 0.8)} L${f(w)} ${f(-len * 0.25)}Z" fill="${iceLit}" stroke="${line}" stroke-width="0.9" stroke-linejoin="round"/>` +
    `<path d="M0 0 L0 ${f(-len)} L${f(w)} ${f(-len * 0.8)} L${f(w)} ${f(-len * 0.25)}Z" fill="${iceDark}"/></g>`;
  const patches: Array<[number, number]> = [[34, 46], [66, 56], [40, 88], [72, 96]];
  let s = '';
  for (const [bx, by] of patches) {
    const x = bx + between(r, -3, 3);
    const y = by + between(r, -3, 3);
    const k = between(r, 1.25, 1.55);
    // A small base patch of frost, then three crystals fanning out.
    s += `<ellipse cx="${f(x)}" cy="${f(y + 1)}" rx="${f(7 * k)}" ry="${f(3 * k)}" fill="${lt(p.body, 0.55)}"/>`;
    s += crystal(x - 4 * k, y + 1, 8 * k, 2.4 * k, -40);
    s += crystal(x + 4 * k, y + 1, 6 * k, 2 * k, 62);
    s += crystal(x + 4 * k, y + 1, 9 * k, 2.4 * k, 35);
    s += crystal(x, y + 1, 13 * k, 3 * k, between(r, -6, 6));
  }
  // Frost specks and tiny sparkles.
  for (let i = 0; i < 10; i++) s += `<circle cx="${f(between(r, 20, 80))}" cy="${f(between(r, 20, 104))}" r="${f(between(r, 0.9, 1.7))}" fill="#fff"/>`;
  for (let i = 0; i < 3; i++) s += star4(between(r, 26, 74), between(r, 24, 100), between(r, 2.4, 3.2), '#fff');
  return s;
}

/** Duneskimmer: rolling dune bands with lit ridges, wind ripples, sand specks and a rising sun. */
function duneskimmer(c: EggCtx): string {
  const { p, r, line } = c;
  const sun = '#ffe8a3';
  let s = `<circle cx="${f(between(r, 58, 66))}" cy="${f(between(r, 30, 36))}" r="9" fill="${sun}" stroke="${line}" stroke-width="1"/>`;
  const dune = (y: number, t: number, fill: string, ridge: string): string => {
    const a = between(r, -6, 6);
    const b = between(r, -6, 6);
    const d = `M-4 ${f(y + a)} C${f(20 + t)} ${f(y - 12 + b)} ${f(46 + t)} ${f(y + 6)} ${f(70 + t)} ${f(y - 4 + a)} S${f(96)} ${f(y - 2)} 104 ${f(y - 6 + b)}`;
    return `<path d="${d} L104 124 L-4 124Z" fill="${fill}" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/><path d="${d}" stroke="${ridge}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.95" transform="translate(0 1.6)"/>`;
  };
  s += dune(between(r, 54, 60), between(r, -8, 8), mix(p.body, p.wing, 0.6), p.belly);
  s += dune(between(r, 74, 80), between(r, -8, 8), dk(p.wing, 0.12), lt(p.wing, 0.6));
  s += dune(between(r, 93, 99), between(r, -8, 8), dk(p.wing, 0.38), lt(p.wing, 0.3));
  // Wind ripples on the dunes.
  for (let i = 0; i < 8; i++) {
    const x = between(r, 18, 70);
    const y = between(r, 64, 106);
    s += `<path d="M${f(x)} ${f(y)} q6 -3 12 0" stroke="${dk(p.wing, 0.3)}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  }
  // A wind swirl in the sky.
  s += `<path d="M18 ${f(between(r, 40, 46))} q10 -4 18 0 a3 3 0 1 0 -2 -5" stroke="${p.belly}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  // Sand specks.
  for (let i = 0; i < 14; i++) s += `<circle cx="${f(between(r, 18, 82))}" cy="${f(between(r, 20, 106))}" r="${f(between(r, 0.7, 1.3))}" fill="${i % 2 ? p.accent : p.belly}"/>`;
  return s;
}

/** Shadeglide: a night sky with a milky band, small stars and a crescent moon. */
function shadeglide(c: EggCtx): string {
  const { p, r, line } = c;
  const mx = between(r, 60, 66);
  const my = between(r, 30, 36);
  const mr = 11;
  let s = `<path d="M-4 ${f(between(r, 80, 88))} C30 ${f(between(r, 60, 70))} 60 ${f(between(r, 56, 62))} 104 ${f(between(r, 40, 48))} L104 ${f(between(r, 58, 64))} C64 ${f(between(r, 72, 78))} 34 ${f(between(r, 84, 90))} -4 104Z" fill="${p.belly}" opacity="0.7"/>`;
  // Crescent moon with a shadowed inner edge.
  const moon = `M${f(mx)} ${f(my - mr)} A${mr} ${mr} 0 1 0 ${f(mx)} ${f(my + mr)} A${f(mr * 0.72)} ${f(mr * 0.85)} 0 1 1 ${f(mx)} ${f(my - mr)}Z`;
  s += `<path d="${moon}" fill="${p.accent}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>`;
  s += `<path d="M${f(mx - mr * 0.75)} ${f(my + mr * 0.2)} A${f(mr * 0.85)} ${f(mr * 0.85)} 0 0 0 ${f(mx)} ${f(my + mr)} A${f(mr * 0.72)} ${f(mr * 0.85)} 0 0 1 ${f(mx - mr * 0.5)} ${f(my + mr * 0.1)}Z" fill="${dk(p.accent, 0.22)}"/>`;
  // Stars: bright four-point ones and small dots.
  const big: Array<[number, number]> = [[34, 30], [26, 60], [52, 56], [74, 70], [40, 86], [64, 98]];
  for (const [bx, by] of big) {
    const x = bx + between(r, -3, 3);
    const y = by + between(r, -3, 3);
    const sr = between(r, 4, 5.6);
    s += star4(x, y, sr + 0.9, dk(p.body, 0.5));
    s += star4(x, y, sr, p.accent);
    s += star4(x, y, sr * 0.45, '#fffbe6');
  }
  for (let i = 0; i < 10; i++) s += `<circle cx="${f(between(r, 18, 82))}" cy="${f(between(r, 18, 106))}" r="${f(between(r, 0.6, 1.2))}" fill="${i % 3 ? '#fff' : p.accent}"/>`;
  return s;
}

const PATTERNS: Record<TribeId, (c: EggCtx) => string> = { emberback, tidefin, stormcrest, mossclaw, frostspine, duneskimmer, shadeglide };

/** A cel-shaded egg in the tribe's first colors, cracking as warmth fills. */
export function celEggSvg(tribe: TribeId, warmth: number, seed = 1, warmCracks = true): string {
  const p = TRIBES[tribe].palettes[0];
  const id = `ke${++uid}`;
  const line = dk(p.body, 0.7);
  const dark = luma(p.body) < 0.3;
  const shade = mix(dk(p.body, 0.3), '#3a1f7a', 0.28);
  const light = lt(p.body, dark ? 0.2 : 0.3);
  const rim = lt(p.accent, 0.55);
  const c: EggCtx = { id, p, r: rnd(seed * 7919 + tribe.length * 131 + 3), line };
  const cracks = !warmCracks
    ? []
    : [warmth >= 0.25 ? 'M50 22 l-4 10 l6 4 l-3 8' : '', warmth >= 0.5 ? 'M30 60 l8 2 l4 -6 l7 5 l5 -4' : '', warmth >= 0.75 ? 'M62 74 l6 -6 l4 6 l6 -3 M40 88 l6 -4 l5 4' : ''].filter(Boolean);
  const crackInk = cracks.length ? `<path d="${cracks.join(' ')}" fill="none" stroke="${line}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${cracks.join(' ')}" fill="none" stroke="${lt(p.accent, 0.5)}" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round" transform="translate(0.6 0.6)"/>` : '';
  return `<svg class="egg cel-egg cel-egg-${tribe}" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><clipPath id="${id}c"><path d="${EGG_PATH}"/></clipPath><radialGradient id="${id}g" cx="0.5" cy="0.6" r="0.5"><stop offset="0" stop-color="${p.accent}" stop-opacity="${(0.15 + warmth * 0.55).toFixed(2)}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="50" cy="66" rx="48" ry="56" fill="url(#${id}g)"/>
<ellipse cx="50" cy="113" rx="27" ry="4.2" fill="#000" opacity="0.25"/>
<path d="${EGG_PATH}" fill="${p.body}"/>
<g clip-path="url(#${id}c)"><path d="${LIGHT}" fill="${light}"/>${PATTERNS[tribe](c)}<path d="${SHADOW}" fill="${shade}" opacity="0.55"/><path d="${BOUNCE}" stroke="${lt(p.body, 0.25)}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.6"/></g>
<path d="${RIM}" stroke="${rim}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.9"/>
<path d="${EGG_PATH}" fill="none" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>
${tribe === 'mossclaw' ? mossTuft(c) : ''}
<ellipse cx="31" cy="34" rx="4.6" ry="10" fill="#fff" opacity="0.85" transform="rotate(24 31 34)"/>
<circle cx="40" cy="19" r="2.2" fill="#fff" opacity="0.9"/>
${crackInk}
</svg>`;
}

// ---- Evolution star tiers ----

const GOLD = '#ffd43b';
const GOLD_DARK = '#b07800';
const GOLD_LIGHT = '#fff3bf';
/** Sparkle spots around the dragon (dragon viewBox -26 -12 266 162), in the order they appear. */
const SPOTS: Array<[number, number]> = [[40, 20], [222, 8], [12, 96], [236, 98], [120, -2], [-12, 44], [176, 132], [62, 134]];
/** Sparkles per star tier 1 to 4. */
const COUNT = [0, 2, 3, 5, 8];

/** A cel four-point sparkle: dark outline, two-tone body, bright core. */
function celSparkle(x: number, y: number, r: number, fill: string, ink: string): string {
  const shade = dk(fill, 0.18);
  return (
    star4(x, y, r + 1.4, ink) +
    star4(x, y, r, fill) +
    `<path d="M${f(x)} ${f(y)} L${f(x + r)} ${f(y)} Q${f(x + r * 0.16)} ${f(y + r * 0.16)} ${f(x)} ${f(y + r)}Z" fill="${shade}"/>` +
    star4(x - r * 0.08, y - r * 0.08, r * 0.38, '#fffbe6')
  );
}

/**
 * Evolved dragons glow in their own colors. Each star adds more: a bigger aura,
 * more and bigger sparkles (gold from three stars), and at four stars a gold circlet.
 */
export function celEvolvedArt(id: string, p: Palette, stars: number): { aura: string; head: string; sparkles: string } {
  const n = Math.max(0, Math.min(4, Math.round(stars)));
  const gold = n >= 3;
  const fill = gold ? GOLD : p.accent;
  const ink = gold ? GOLD_DARK : dk(p.accent, 0.6);
  const size = 4.6 + n * 1.2;
  const sparkles = SPOTS.slice(0, COUNT[n])
    .map(([x, y], i) => celSparkle(x, y, size * (i % 2 ? 0.8 : 1), fill, ink) + (n >= 2 && i < 4 ? `<circle cx="${f(x + size * 1.4)}" cy="${f(y - size)}" r="${f(1 + n * 0.25)}" fill="${gold ? GOLD_LIGHT : lt(p.accent, 0.5)}" stroke="${ink}" stroke-width="0.6"/>` : ''))
    .join('');
  const head =
    n >= 4
      ? `<g class="evo-circlet">` +
        `<path d="M183 31 L184.5 22 L189.5 27 L195 19 L200.5 27 L205.5 22 L207 31 Q195 28.5 183 31Z" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="1.2" stroke-linejoin="round"/>` +
        `<path d="M195 19 L200.5 27 L205.5 22 L207 31 Q201 29.6 195 29.4Z" fill="#f2b705"/>` +
        `<path d="M183 31 Q195 28.5 207 31 L206.6 33 Q195 30.6 183.4 33Z" fill="#e0a100" stroke="${GOLD_DARK}" stroke-width="1" stroke-linejoin="round"/>` +
        `<path d="M185.4 24.6 L186.4 29 M190 28 L194.4 21.6" stroke="${GOLD_LIGHT}" stroke-width="1" stroke-linecap="round"/>` +
        `<circle cx="195" cy="27.4" r="1.9" fill="${p.accent === GOLD ? '#ff6b9a' : p.accent}" stroke="${GOLD_DARK}" stroke-width="0.7"/>` +
        `<circle cx="194.4" cy="26.8" r="0.6" fill="#fff"/>` +
        `<circle cx="184.5" cy="22" r="1.1" fill="${GOLD_LIGHT}" stroke="${GOLD_DARK}" stroke-width="0.6"/><circle cx="195" cy="19" r="1.2" fill="${GOLD_LIGHT}" stroke="${GOLD_DARK}" stroke-width="0.6"/><circle cx="205.5" cy="22" r="1.1" fill="${GOLD_LIGHT}" stroke="${GOLD_DARK}" stroke-width="0.6"/>` +
        `</g>`
      : '';
  return {
    aura: `<defs><radialGradient id="${id}v" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${p.accent}" stop-opacity="${(0.16 + n * 0.08).toFixed(2)}"/><stop offset="0.7" stop-color="${p.accent}" stop-opacity="${(0.06 + n * 0.03).toFixed(2)}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient></defs>
<ellipse class="evo-aura" cx="130" cy="74" rx="${120 + n * 6}" ry="${66 + n * 4}" fill="url(#${id}v)"/>`,
    head,
    sparkles: `<g class="evo-sparkles cel-twinkle">${sparkles}</g>`,
  };
}
