// A cel-shaded twig nest the egg sits in (nest screen, Home hero, hatch screen).
//
// It comes in two layers that share one viewBox (0 0 200 90): the back rim and hollow
// go behind the egg, the front bowl goes in front, so the egg sits down inside it.
// Same style as the eggs and dragons: dark outline, flat shadow and light bands, and
// each twig is a dark stroke under a lighter one. Static, no filters, no gradients.

import { dk, f, lt, rnd } from './cel';

const INK = '#2b1606';
const WOOD = '#8a5a32';
const WOOD_DARK = '#5e3a1c';
const WOOD_LIGHT = '#c08a55';
const STRAW = '#e8c07a';
const HOLLOW = '#2a170b';

/** The bowl outline: front rim along the top, round bottom. */
const BOWL = 'M6 40 Q100 62 194 40 C196 58 182 76 150 83 C120 89 80 89 50 83 C18 76 4 58 6 40Z';
const BOWL_SHADOW = 'M14 58 C40 72 80 78 110 77 C146 76 176 66 190 54 C186 68 172 78 150 83 C120 89 80 89 50 83 C30 79 18 70 14 58Z';
const BOWL_LIGHT = 'M8 42 Q100 64 192 42 L191 48 Q100 70 9 48Z';

/** One outlined twig along a quadratic curve. */
function twig(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, w: number, color: string): string {
  const d = `M${f(x1)} ${f(y1)} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}`;
  return `<path d="${d}" stroke="${INK}" stroke-width="${f(w + 2)}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${color}" stroke-width="${f(w)}" fill="none" stroke-linecap="round"/>`;
}

/** A small two-tone leaf. */
function leaf(x: number, y: number, a: number, k: number, color: string): string {
  return (
    `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${f(k)})">` +
    `<path d="M0 0 Q6 -5 13 0 Q6 5 0 0Z" fill="${color}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>` +
    `<path d="M0 0 Q6 5 13 0Z" fill="${dk(color, 0.25)}"/><path d="M1 0 L11 0" stroke="${dk(color, 0.4)}" stroke-width="0.8"/></g>`
  );
}

/** The back rim and the dark hollow, drawn behind the egg. */
export function nestBackSvg(seed = 1): string {
  const r = rnd(seed * 31 + 7);
  let s = `<ellipse cx="100" cy="38" rx="94" ry="20" fill="${WOOD_DARK}" stroke="${INK}" stroke-width="2.4"/>`;
  // Back-rim twigs arc over the top edge.
  for (let i = 0; i < 7; i++) {
    const x1 = 8 + i * 22 + r() * 8;
    const x2 = x1 + 34 + r() * 16;
    s += twig(x1, 34 - r() * 4, (x1 + x2) / 2, 14 + r() * 6, Math.min(194, x2), 32 - r() * 4, 3.2, i % 2 ? WOOD : WOOD_LIGHT);
  }
  // The hollow the egg sits in, with a straw lining along its back edge.
  s += `<ellipse cx="100" cy="42" rx="80" ry="14" fill="${HOLLOW}"/>`;
  s += `<path d="M24 40 Q100 22 176 40" stroke="${STRAW}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  s += `<path d="M34 37 Q100 24 166 37" stroke="${lt(STRAW, 0.3)}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  return `<svg class="nest-art nest-back" viewBox="0 0 200 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${s}</svg>`;
}

/** The front bowl, drawn over the bottom of the egg. */
export function nestFrontSvg(seed = 1): string {
  const r = rnd(seed * 17 + 3);
  let s = `<ellipse cx="100" cy="86" rx="82" ry="5" fill="#000" opacity="0.3"/>`;
  s += `<path d="${BOWL}" fill="${WOOD}"/>`;
  s += `<path d="${BOWL_SHADOW}" fill="${WOOD_DARK}"/>`;
  s += `<path d="${BOWL_LIGHT}" fill="${WOOD_LIGHT}"/>`;
  // Woven twigs wrapping around the bowl, crossing each other.
  for (let i = 0; i < 9; i++) {
    const y = 50 + i * 3.6 + r() * 2;
    const left = 10 + (y - 46) * 0.55 + r() * 6;
    const sag = 8 + r() * 6;
    const dir = i % 2 ? 1 : -1;
    s += twig(left, y + dir * 3, 100 + dir * 18, y + sag, 200 - left, y - dir * 3, 2.6 + r() * 0.8, [WOOD_LIGHT, WOOD, '#a3703f'][i % 3]);
  }
  // Loose twig ends sticking out at the sides.
  s += twig(4, 44, -2, 36, -6, 30, 2.4, WOOD_LIGHT);
  s += twig(192, 46, 202, 40, 206, 33, 2.4, WOOD);
  s += twig(20, 72, 8, 76, 2, 84, 2.2, WOOD);
  s += twig(176, 74, 190, 78, 198, 82, 2.2, WOOD_LIGHT);
  // Straw tufts poking over the front rim.
  for (const x of [36, 74, 128, 164]) {
    const y = 40 + Math.abs(100 - x) * -0.1 + 9;
    s += `<path d="M${f(x)} ${f(y)} l-3 -7 M${f(x + 3)} ${f(y)} l1 -8 M${f(x + 6)} ${f(y)} l4 -6" stroke="${STRAW}" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  // The bowl outline, then leaves and one feather tucked in.
  s += `<path d="${BOWL}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
  s += leaf(18, 54, 150, 1.1, '#69db7c') + leaf(30, 60, 200, 0.9, '#40c057') + leaf(178, 56, 20, 1.1, '#69db7c') + leaf(168, 64, -20, 0.85, '#40c057');
  s += `<g transform="translate(150 50) rotate(-28)"><path d="M0 0 Q14 -6 30 -2 Q16 4 0 0Z" fill="#b197fc" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M0 0 Q16 4 30 -2 Q15 1 0 0Z" fill="#845ef7"/><path d="M-2 1 L28 -2" stroke="${INK}" stroke-width="0.9"/></g>`;
  s += `<circle cx="58" cy="78" r="2.4" fill="#ffd8a8" stroke="${INK}" stroke-width="0.9"/><circle cx="138" cy="80" r="2" fill="#ffd8a8" stroke="${INK}" stroke-width="0.9"/>`;
  return `<svg class="nest-art nest-front" viewBox="0 0 200 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${s}</svg>`;
}
