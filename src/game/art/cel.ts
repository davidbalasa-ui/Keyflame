// Shared kit for the cel-shaded tribe dragons: color helpers, the age sizes, the
// spots and stripes, and the frame that puts a tribe's parts on the animation rig.
//
// Every tribe draws its own body, but they all hang on the same rig and pivots as
// the classic art (wings 122,68 / 132,70, tail 84,92, neck 184,52), so .flap,
// .sleepy and the eye blink work unchanged.
//
// iPad speed rules (see tests/celArt.test.ts):
// - No SVG filters. Texture is drawn as plain shapes.
// - Nothing blinks shape by shape. A dragon may mark at most a few whole groups
//   with class "cel-glow" (a soft opacity pulse), and races switch even those off.

import type { Palette, Stage } from '../dragons';

/** race: small and many on screen. full: everywhere else. portrait: hatch reveal and Codex close-up. */
export type Detail = 'race' | 'full' | 'portrait';

const hex = (n: number[]): string => '#' + n.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
const rgb = (h: string): number[] => {
  const n = parseInt(h.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a: string, b: string, t: number): string => {
  const x = rgb(a);
  const y = rgb(b);
  return hex(x.map((c, i) => c + (y[i] - c) * t));
};
export const dk = (h: string, t: number): string => mix(h, '#000000', t);
export const lt = (h: string, t: number): string => mix(h, '#ffffff', t);
/** 0 (black) to 1 (white). */
export const luma = (h: string): number => {
  const [r, g, b] = rgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
/** Rounds to one decimal so the markup stays short. */
export const f = (n: number): number => +n.toFixed(1);

/** Small seeded random generator so a drawing always comes out the same. */
export function rnd(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A curved spike sweeping back from a point. */
export const spike = (x: number, y: number, h: number, w: number): string =>
  `M${f(x - w)} ${f(y)} Q${f(x - w * 0.2)} ${f(y - h * 0.55)} ${f(x - w * 1.3)} ${f(y - h)} Q${f(x + w * 0.6)} ${f(y - h * 0.45)} ${f(x + w)} ${f(y)}Z`;
/** The shadowed back half of a spike, for the two-tone cel look. */
export const spikeHalf = (x: number, y: number, h: number, w: number): string =>
  `M${f(x - w * 0.15)} ${f(y)} Q${f(x - w * 0.1)} ${f(y - h * 0.5)} ${f(x - w * 1.3)} ${f(y - h)} Q${f(x + w * 0.6)} ${f(y - h * 0.45)} ${f(x + w)} ${f(y)}Z`;

/** Four-point sparkle centered on x, y. */
export const star4 = (x: number, y: number, r: number, fill: string): string =>
  `<path d="M${f(x)} ${f(y - r)} Q${f(x + r * 0.16)} ${f(y - r * 0.16)} ${f(x + r)} ${f(y)} Q${f(x + r * 0.16)} ${f(y + r * 0.16)} ${f(x)} ${f(y + r)} Q${f(x - r * 0.16)} ${f(y + r * 0.16)} ${f(x - r)} ${f(y)} Q${f(x - r * 0.16)} ${f(y - r * 0.16)} ${f(x)} ${f(y - r)}Z" fill="${fill}"/>`;

export interface Age {
  /** Whole-body scale around 120,78. */
  scale: number;
  /** Head scale around the neck pivot; babies have big heads. */
  head: number;
  /** Front wing scale (the back wing is 0.86 of it). */
  wing: number;
  /** How tall spines, fins and horns grow, 0 to 1. */
  spine: number;
  /** Eye radius. */
  eye: number;
}

export const AGES: Record<Stage, Age> = {
  hatchling: { scale: 0.8, head: 1.36, wing: 0.74, spine: 0.45, eye: 8.8 },
  young: { scale: 0.9, head: 1.2, wing: 1.0, spine: 0.72, eye: 7.9 },
  adult: { scale: 1, head: 1.1, wing: 1.2, spine: 1, eye: 7.2 },
};

/** Everything a tribe needs to draw one dragon. */
export interface Ctx {
  /** Unique id prefix for clip paths and gradients. */
  id: string;
  p: Palette;
  stage: Stage;
  A: Age;
  detail: Detail;
  /** False at race size: skip fine texture. */
  fine: boolean;
  /** True for the hatch reveal and Codex close-up: add the extra detail. */
  portrait: boolean;
  /** Outline ink. */
  line: string;
  /** Cel shadow and light tones of the body color. */
  shade: string;
  light: string;
  /** Rim light along the top edge. */
  rim: string;
  /** Base stroke width. */
  SW: number;
  /** Seeded random, the same for every drawing of this tribe. */
  r: () => number;
  /** Spots or stripes, clipped to `clip`; tribes call it inside their body. */
  marks: (clip: string) => string;
  /** Shapes for the "cel-glow" layer: a group with one soft pulse, or still in races. */
  glow: (inner: string) => string;
}

/** What a tribe draws, in the spaces the rig expects. */
export interface Parts {
  defs?: string;
  /** Wing contents in shoulder space (0,0 = shoulder). Called for the back and front wing. */
  wing: (back: boolean) => string;
  /** Far hind leg, behind the tail and body. */
  farLeg?: string;
  /** Tail contents in tail space (0,0 = tail base). */
  tail: string;
  /** Spines and fins behind the body. */
  back?: string;
  /** Body, belly and markings. */
  body: string;
  /** Near legs and arms, over the body. */
  legs?: string;
  /** Head in world space (the frame wraps it in the neck pivot). */
  head: string;
}

export interface TribeArt {
  draw: (c: Ctx) => Parts;
  /** Optional per-tribe sizes for each age, merged over AGES. */
  age?: Partial<Record<Stage, Partial<Age>>>;
  /** Moves the full-stars circlet (drawn for a head around 184-206, 22-32) onto this tribe's head. */
  crown?: Partial<Record<Stage, [number, number]>>;
}

let uid = 0;

/** Spots or stripes in a darker (or, on dark dragons, lighter) shade of the body. */
function markings(id: string, p: Palette, marking: number, fine: boolean, clip: string): string {
  if (!marking) return '';
  const ink = luma(p.body) < 0.35 ? lt(p.body, 0.4) : dk(p.body, 0.3);
  const shine = lt(p.accent, 0.1);
  const clipId = `${id}m`;
  const defs = `<clipPath id="${clipId}"><path d="${clip}"/></clipPath>`;
  if (marking === 1) {
    const spots: Array<[number, number, number]> = [[96, 80, 5], [110, 73, 4], [124, 78, 6], [138, 71, 4.5], [150, 77, 5], [162, 64, 4], [172, 56, 3.5], [116, 88, 3], [142, 86, 3.4], [104, 90, 2.6]];
    return `<defs>${defs}</defs><g clip-path="url(#${clipId})">${spots
      .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r * 0.8)}" fill="${ink}" opacity="0.7"/>${fine ? `<ellipse cx="${f(x - r * 0.25)}" cy="${f(y - r * 0.3)}" rx="${f(r * 0.35)}" ry="${f(r * 0.25)}" fill="${shine}" opacity="0.35"/>` : ''}`)
      .join('')}</g>`;
  }
  const bands = [92, 106, 120, 134, 148, 160, 171]
    .map((x, i) => `<path d="M${x - 4} ${58 - i} Q${x + 4} ${76 - i} ${x - 2} ${96 - i * 2}" stroke="${ink}" stroke-width="${f(5 - i * 0.35)}" fill="none" stroke-linecap="round" opacity="0.65"/>`)
    .join('');
  return `<defs>${defs}</defs><g clip-path="url(#${clipId})">${bands}</g>`;
}

export interface FrameExtras {
  /** Drawn behind the dragon (evolution aura). */
  behind?: string;
  /** Drawn over the dragon (evolution sparkles). */
  front?: string;
  /** Added to the head (evolution circlet). */
  head?: string;
}

const crowned = (head: string | undefined, at: [number, number] | undefined): string =>
  !head ? '' : at ? `<g transform="translate(${at[0]} ${at[1]})">${head}</g>` : head;

/** Draws one tribe dragon on the shared rig, as an SVG string. */
export function celDragon(tribe: string, art: TribeArt, p: Palette, stage: Stage, extraClass: string, marking: number, detail: Detail, extras: FrameExtras = {}): string {
  const id = `kc${++uid}`;
  const line = dk(p.body, 0.7);
  const fine = detail !== 'race';
  let glows = 0;
  const A: Age = { ...AGES[stage], ...art.age?.[stage] };
  const c: Ctx = {
    id,
    p,
    stage,
    A,
    detail,
    fine,
    portrait: detail === 'portrait',
    line,
    shade: mix(dk(p.body, 0.3), '#3a1f7a', 0.28),
    light: lt(p.body, 0.32),
    rim: lt(p.accent, 0.55),
    SW: 2.4,
    r: rnd(tribe.length * 7919 + 11),
    marks: (clip) => markings(id, p, marking, fine, clip),
    glow: (inner) => (fine ? `<g class="cel-glow${++glows % 2 ? '' : ' g2'}">${inner}</g>` : `<g>${inner}</g>`),
  };
  const parts = art.draw(c);
  const sc = A.scale;
  return `<svg class="dragon cel cel-${tribe} ${extraClass}" viewBox="-26 -12 266 162" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>${parts.defs ?? ''}</defs>${extras.behind ?? ''}
<g transform="translate(${f(120 - 120 * sc)} ${f(78 - 78 * sc)}) scale(${sc})"><g class="rig">
<g transform="translate(122 68) scale(${f(A.wing * 0.86)})"><g class="wing wing-back">${parts.wing(true)}</g></g>
${parts.farLeg ?? ''}
<g transform="translate(84 92)"><g class="tail">${parts.tail}</g></g>
${parts.back ?? ''}
${parts.body}
${parts.legs ?? ''}
<g transform="translate(184 52) scale(${A.head})"><g class="head"><g transform="translate(-184 -52)">${parts.head}${crowned(extras.head, art.crown?.[stage])}</g></g></g>
<g transform="translate(132 70) scale(${A.wing})"><g class="wing wing-front">${parts.wing(false)}</g></g>
</g></g>${extras.front ?? ''}</svg>`;
}

/**
 * A friendly cel-shaded eye at cx, cy with radius r: white, iris with a shadowed
 * lower half, slit pupil, a big catch-light, and the blinking lid.
 */
export function celEye(c: Ctx, cx: number, cy: number, iris: string, lidFill = c.p.body): string {
  const r = c.A.eye;
  const ir = r * 0.76;
  const ix = cx + 1.6;
  const iy = cy + 0.8;
  let s = `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${f(r + 0.6)}" fill="#fffdf6" stroke="${c.line}" stroke-width="1.6"/>`;
  s += `<circle cx="${ix}" cy="${iy}" r="${f(ir)}" fill="${iris}"/><path d="M${f(ix - ir)} ${f(iy + 1.2)} a${f(ir)} ${f(ir)} 0 0 0 ${f(ir * 2)} 0z" fill="${dk(iris, 0.35)}"/>`;
  if (c.fine) s += `<circle cx="${ix}" cy="${iy}" r="${f(ir)}" fill="none" stroke="${dk(iris, 0.5)}" stroke-width="0.7"/>`;
  s += `<ellipse cx="${f(ix + 0.8)}" cy="${f(iy + 0.2)}" rx="${f(r * 0.3)}" ry="${f(r * 0.56)}" fill="#120c22"/>`;
  s += `<path d="M${f(cx + 3)} ${f(cy + 1 - r * 0.75)} l${f(r * 0.42)} ${f(r * 0.3)} l${f(-r * 0.42)} ${f(r * 0.3)} l${f(-r * 0.2)} ${f(-r * 0.3)}z" fill="#fff"/>`;
  if (c.fine) s += `<circle cx="${f(cx - 0.6)}" cy="${f(cy + 1 + r * 0.45)}" r="${f(r * 0.12)}" fill="#fff" opacity="0.9"/>`;
  if (c.portrait) s += `<path d="M${f(ix - ir * 0.7)} ${f(iy + ir * 0.35)} a${f(ir * 0.8)} ${f(ir * 0.8)} 0 0 0 ${f(ir * 1.4)} 0" stroke="${lt(iris, 0.45)}" stroke-width="0.8" fill="none" opacity="0.7"/>`;
  s += `<ellipse class="lid" cx="${cx}" cy="${cy}" rx="${f(r + 1)}" ry="${f(r + 1.5)}" fill="${lidFill}" stroke="${c.line}" stroke-width="1.2"/>`;
  return s;
}
