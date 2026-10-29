// Accent art for the teacher screens: the game's world drawn for grown-ups. Fine-lined
// vines, toadstools and a dragon beside a hatching egg, in muted tones with soft light,
// so the dashboard keeps the fantasy without looking like a kids' screen.

import { dragonSvg, eggSvg } from '../game/dragons';
import { seededRandom } from '../game/dragons';

const LEAF = ['#4f7d5c', '#5f8f68', '#46704f'];
const LEAF_LIGHT = '#8fbf8a';
const VINE = '#3b5a44';
const GOLD = '#d9b25a';

/** A leaf with a midrib and two veins, pointing along `angle` degrees. */
function leaf(x: number, y: number, angle: number, size: number, i: number): string {
  const s = size;
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(${(s / 20).toFixed(3)})">
<path d="M0 0 C6 -7 16 -7 22 0 C16 7 6 7 0 0Z" fill="${LEAF[i % LEAF.length]}"/>
<path d="M0 0 C6 -7 16 -7 22 0" fill="none" stroke="${LEAF_LIGHT}" stroke-width="0.7" opacity="0.6"/>
<path d="M1 0 L20 0 M8 0 L12 -3.5 M12 0 L16 -3 M8 0 L12 3.5 M12 0 L16 3" fill="none" stroke="#2d4a35" stroke-width="0.6" stroke-linecap="round" opacity="0.8"/>
</g>`;
}

/** A curling tendril, a small spiral off the vine. */
function tendril(x: number, y: number, flip: number): string {
  return `<path d="M${x} ${y} c${4 * flip} -6 ${12 * flip} -6 ${12 * flip} 0 c0 4 ${-5 * flip} 5 ${-6 * flip} 2 c${-1 * flip} -2 ${1 * flip} -3 ${2 * flip} -2" fill="none" stroke="${VINE}" stroke-width="1.1" stroke-linecap="round"/>`;
}

/** A vine along a cubic curve, with leaves and tendrils spaced along it. */
function vine(d: [number, number, number, number, number, number, number, number], leaves: number, seed: number, width = 2.2): string {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = d;
  const at = (t: number): [number, number] => {
    const u = 1 - t;
    return [u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3];
  };
  const rand = seededRandom(seed);
  let out = `<path d="M${x0} ${y0} C${x1} ${y1} ${x2} ${y2} ${x3} ${y3}" fill="none" stroke="${VINE}" stroke-width="${width}" stroke-linecap="round"/>`;
  for (let i = 0; i < leaves; i++) {
    const t = (i + 0.5) / leaves;
    const [x, y] = at(t);
    const [nx, ny] = at(Math.min(1, t + 0.01));
    const along = (Math.atan2(ny - y, nx - x) * 180) / Math.PI;
    const side = i % 2 ? 1 : -1;
    out += leaf(x, y, along + side * (45 + rand() * 25), 11 + rand() * 7, i);
    if (i % 3 === 1) out += tendril(x, y, side);
  }
  return out;
}

/** A toadstool with a shaded cap, pale spots, gills and a stem. */
function mushroom(x: number, y: number, h: number, id: string, tilt = 0): string {
  const w = h * 0.95;
  return `<g transform="translate(${x} ${y}) rotate(${tilt})">
<path d="M${-w * 0.14} 0 C${-w * 0.16} ${-h * 0.35} ${-w * 0.1} ${-h * 0.6} ${-w * 0.08} ${-h * 0.7} L${w * 0.08} ${-h * 0.7} C${w * 0.1} ${-h * 0.6} ${w * 0.16} ${-h * 0.35} ${w * 0.14} 0Z" fill="url(#${id}-stem)"/>
<path d="M${-w * 0.5} ${-h * 0.66} C${-w * 0.48} ${-h * 1.05} ${w * 0.48} ${-h * 1.05} ${w * 0.5} ${-h * 0.66} C${w * 0.3} ${-h * 0.58} ${-w * 0.3} ${-h * 0.58} ${-w * 0.5} ${-h * 0.66}Z" fill="url(#${id}-cap)"/>
<g stroke="#5a2a20" stroke-width="0.5" opacity="0.7">${Array.from({ length: 9 }, (_, i) => {
    const gx = -w * 0.42 + (i * w * 0.84) / 8;
    return `<line x1="${gx.toFixed(1)}" y1="${(-h * 0.645).toFixed(1)}" x2="${(gx * 0.25).toFixed(1)}" y2="${(-h * 0.6).toFixed(1)}"/>`;
  }).join('')}</g>
<g fill="#f3e6cf" opacity="0.85"><ellipse cx="${-w * 0.2}" cy="${-h * 0.86}" rx="${w * 0.07}" ry="${h * 0.035}"/><ellipse cx="${w * 0.12}" cy="${-h * 0.92}" rx="${w * 0.05}" ry="${h * 0.028}"/><ellipse cx="${w * 0.3}" cy="${-h * 0.78}" rx="${w * 0.045}" ry="${h * 0.025}"/><ellipse cx="${-w * 0.36}" cy="${-h * 0.74}" rx="${w * 0.035}" ry="${h * 0.02}"/></g>
<path d="M${-w * 0.36} ${-h * 0.82} C${-w * 0.2} ${-h * 0.97} ${w * 0.1} ${-h * 0.99} ${w * 0.26} ${-h * 0.9}" fill="none" stroke="#fff" stroke-width="1" opacity="0.25" stroke-linecap="round"/>
</g>`;
}

function mushroomDefs(id: string): string {
  return `<linearGradient id="${id}-cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4623f"/><stop offset="1" stop-color="#7e2f24"/></linearGradient>
<linearGradient id="${id}-stem" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9ccb3"/><stop offset="0.6" stop-color="#f1e7d3"/><stop offset="1" stop-color="#bfae90"/></linearGradient>`;
}

/** Tiny floating motes of light. */
function motes(seed: number, n: number, w: number, h: number): string {
  const rand = seededRandom(seed);
  return Array.from({ length: n }, () => `<circle cx="${(rand() * w).toFixed(1)}" cy="${(rand() * h).toFixed(1)}" r="${(0.6 + rand() * 1.3).toFixed(1)}" fill="${GOLD}" opacity="${(0.25 + rand() * 0.5).toFixed(2)}"/>`).join('');
}

/** The banner across the top of the teacher screens. */
export function teacherHeroSvg(): string {
  const id = 'th';
  return `<svg class="th-scene" viewBox="0 0 900 170" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
<radialGradient id="${id}-glow" cx="0.78" cy="0.6" r="0.5"><stop offset="0" stop-color="#8b6cff" stop-opacity="0.32"/><stop offset="1" stop-color="#8b6cff" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-egg" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.75"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2340"/><stop offset="1" stop-color="#1b1828"/></linearGradient>
${mushroomDefs(id)}
</defs>
<rect width="900" height="170" fill="url(#${id}-glow)"/>
${motes(7, 40, 900, 170)}
<path d="M0 150 C150 136 300 158 470 146 C620 136 760 150 900 140 L900 170 L0 170Z" fill="url(#${id}-ground)"/>
${vine([0, 18, 160, -6, 300, 52, 470, 14], 13, 3)}
${vine([900, 10, 820, 40, 760, 0, 640, 22], 9, 5, 1.8)}
${vine([0, 120, 40, 80, 20, 50, 70, 30], 6, 9, 1.6)}
${mushroom(70, 152, 46, id, -6)}
${mushroom(106, 154, 30, id, 8)}
${mushroom(40, 156, 22, id, -12)}
${mushroom(842, 150, 26, id, 6)}
<ellipse cx="735" cy="118" rx="44" ry="44" fill="url(#${id}-egg)"/>
</svg>`;
}

/** The dragon and the hatching egg that sit on the banner. */
export function heroDragon(): string {
  return dragonSvg('emberback', 0, 'adult', 'th-dragon');
}

export function heroEgg(): string {
  return eggSvg('tidefin', 0.95, 11);
}

/** Vines that climb the corners of the page behind everything, very faint. */
export function teacherBackdropSvg(): string {
  return `<svg class="tm-backdrop" viewBox="0 0 400 800" preserveAspectRatio="xMaxYMax meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
${vine([400, 800, 330, 640, 400, 520, 340, 360], 14, 21, 2)}
${vine([400, 600, 360, 520, 390, 440, 370, 300], 8, 23, 1.4)}
${motes(31, 18, 400, 800)}
</svg>`;
}
