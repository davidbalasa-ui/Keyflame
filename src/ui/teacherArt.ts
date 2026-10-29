// Accent art for the classroom screens: the game's world drawn for grown-ups. A twilight
// glade with layered hills, vines framing the edges, toadstools, a twig nest with an egg
// about to hatch, and the approved cel-shaded Emberback. The banner is art only; text sits
// below it, so nothing ever collides at any width.

import { eggSvg, seededRandom } from '../game/dragons';
import { celEmberback } from './art/celEmberback';

const W = 640;
const H = 250;
const LEAF = ['#4e7d5b', '#5d8d66', '#42704d', '#6a9a6e'];
const VINE = '#34503d';

const f = (n: number): string => n.toFixed(1);

/** A leaf with a light edge, a midrib and paired veins. */
function leaf(x: number, y: number, angle: number, size: number, i: number): string {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)}) scale(${(size / 20).toFixed(3)})">
<path d="M0 0 C5 -7.5 15 -8 22 0 C15 7 5 7 0 0Z" fill="${LEAF[i % LEAF.length]}"/>
<path d="M0 0 C5 -7.5 15 -8 22 0" fill="none" stroke="#a6d39e" stroke-width="0.8" opacity="0.55"/>
<path d="M1 0 L20.5 0 M7 0 L10.5 -3.6 M11.5 0 L15 -3.2 M7 0 L10.5 3.4 M11.5 0 L15 3" fill="none" stroke="#24402d" stroke-width="0.55" stroke-linecap="round" opacity="0.85"/>
</g>`;
}

function tendril(x: number, y: number, flip: number, s = 1): string {
  return `<path d="M${f(x)} ${f(y)} c${f(4 * flip * s)} ${f(-6 * s)} ${f(12 * flip * s)} ${f(-6 * s)} ${f(12 * flip * s)} 0 c0 ${f(4 * s)} ${f(-5 * flip * s)} ${f(5 * s)} ${f(-6 * flip * s)} ${f(2 * s)} c${f(-1 * flip * s)} ${f(-2 * s)} ${f(1 * flip * s)} ${f(-3 * s)} ${f(2 * flip * s)} ${f(-2 * s)}" fill="none" stroke="${VINE}" stroke-width="1" stroke-linecap="round"/>`;
}

type Curve = [number, number, number, number, number, number, number, number];

/** A vine along a cubic curve, tapering, with leaves, tendrils and a few buds. */
function vine(d: Curve, leaves: number, seed: number, width = 2.4): string {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = d;
  const at = (t: number): [number, number] => {
    const u = 1 - t;
    return [u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3];
  };
  const rand = seededRandom(seed);
  const path = `M${x0} ${y0} C${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;
  let out = `<path d="${path}" fill="none" stroke="${VINE}" stroke-width="${width}" stroke-linecap="round"/>
<path d="${path}" fill="none" stroke="#5f8a69" stroke-width="${f(width * 0.3)}" stroke-linecap="round" opacity="0.5" transform="translate(-0.6 -0.6)"/>`;
  for (let i = 0; i < leaves; i++) {
    const t = (i + 0.6) / (leaves + 0.4);
    const [x, y] = at(t);
    const [nx, ny] = at(Math.min(1, t + 0.01));
    const along = (Math.atan2(ny - y, nx - x) * 180) / Math.PI;
    const side = i % 2 ? 1 : -1;
    out += leaf(x, y, along + side * (40 + rand() * 30), (12 + rand() * 8) * (1 - t * 0.35), i + seed);
    if (i % 3 === 1) out += tendril(x, y, side, 0.9 - t * 0.3);
    if (i % 4 === 2) out += `<circle cx="${f(x + side * 4)}" cy="${f(y + 3)}" r="1.6" fill="#f2d7e6" opacity="0.8"/>`;
  }
  return out;
}

/** A toadstool: shaded cap with a rim light, gills, pale spots, and a lit stem. */
function mushroom(x: number, y: number, h: number, id: string, tilt = 0): string {
  const w = h * 0.95;
  const gills = Array.from({ length: 11 }, (_, i) => {
    const gx = -w * 0.44 + (i * w * 0.88) / 10;
    return `<line x1="${f(gx)}" y1="${f(-h * 0.645)}" x2="${f(gx * 0.22)}" y2="${f(-h * 0.6)}"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y}) rotate(${tilt})">
<ellipse cx="0" cy="1" rx="${f(w * 0.28)}" ry="${f(h * 0.05)}" fill="#0c0a14" opacity="0.55"/>
<path d="M${f(-w * 0.13)} 0 C${f(-w * 0.16)} ${f(-h * 0.35)} ${f(-w * 0.1)} ${f(-h * 0.6)} ${f(-w * 0.08)} ${f(-h * 0.7)} L${f(w * 0.08)} ${f(-h * 0.7)} C${f(w * 0.1)} ${f(-h * 0.6)} ${f(w * 0.16)} ${f(-h * 0.35)} ${f(w * 0.13)} 0Z" fill="url(#${id}-stem)"/>
<path d="M${f(-w * 0.5)} ${f(-h * 0.66)} C${f(-w * 0.48)} ${f(-h * 1.06)} ${f(w * 0.48)} ${f(-h * 1.06)} ${f(w * 0.5)} ${f(-h * 0.66)} C${f(w * 0.3)} ${f(-h * 0.58)} ${f(-w * 0.3)} ${f(-h * 0.58)} ${f(-w * 0.5)} ${f(-h * 0.66)}Z" fill="url(#${id}-cap)" stroke="#4a1a14" stroke-width="0.8"/>
<g stroke="#5a2a20" stroke-width="0.45" opacity="0.75">${gills}</g>
<g fill="#f6ead3" opacity="0.9"><ellipse cx="${f(-w * 0.2)}" cy="${f(-h * 0.87)}" rx="${f(w * 0.07)}" ry="${f(h * 0.034)}"/><ellipse cx="${f(w * 0.12)}" cy="${f(-h * 0.93)}" rx="${f(w * 0.05)}" ry="${f(h * 0.027)}"/><ellipse cx="${f(w * 0.31)}" cy="${f(-h * 0.78)}" rx="${f(w * 0.045)}" ry="${f(h * 0.024)}"/><ellipse cx="${f(-w * 0.37)}" cy="${f(-h * 0.74)}" rx="${f(w * 0.035)}" ry="${f(h * 0.02)}"/></g>
<path d="M${f(-w * 0.36)} ${f(-h * 0.83)} C${f(-w * 0.2)} ${f(-h * 0.98)} ${f(w * 0.1)} ${f(-h * 1)} ${f(w * 0.27)} ${f(-h * 0.91)}" fill="none" stroke="#ffd9b8" stroke-width="1.1" opacity="0.35" stroke-linecap="round"/>
</g>`;
}

/** Grass and moss blades along the ground line. */
function grass(seed: number, x0: number, x1: number, yAt: (x: number) => number): string {
  const rand = seededRandom(seed);
  let d = '';
  for (let x = x0; x < x1; x += 3 + rand() * 4) {
    const y = yAt(x);
    const h = 5 + rand() * 9;
    const lean = (rand() - 0.5) * 6;
    d += `M${f(x)} ${f(y + 2)} q${f(lean * 0.4)} ${f(-h * 0.6)} ${f(lean)} ${f(-h)} `;
  }
  return `<path d="${d}" fill="none" stroke="#3f6a4a" stroke-width="1.1" stroke-linecap="round" opacity="0.9"/>`;
}

/** A woven twig nest, drawn back half then front half around the egg. */
function nest(cx: number, cy: number, seed: number, front: boolean): string {
  const rand = seededRandom(seed + (front ? 1 : 0));
  const rx = 40;
  const ry = 13;
  let out = `<g stroke-linecap="round" fill="none">`;
  for (let i = 0; i < 26; i++) {
    const a0 = (front ? 0 : Math.PI) + rand() * Math.PI;
    const span = 0.5 + rand() * 0.9;
    const r = 0.8 + rand() * 0.3;
    const p = (a: number): string => `${f(cx + Math.cos(a) * rx * r)} ${f(cy + Math.sin(a) * ry * r)}`;
    const col = ['#6b4a2c', '#7d5834', '#5a3c22', '#8d6a42'][i % 4];
    out += `<path d="M${p(a0)} Q${p(a0 + span / 2).replace(' ', ` `)} ${p(a0 + span)}" stroke="${col}" stroke-width="${f(1.4 + rand() * 1.6)}"/>`;
  }
  return out + '</g>';
}

/** Puts a whole <svg> string at a spot inside another SVG. */
function place(markup: string, x: number, y: number, w: number, h: number): string {
  return markup.replace('<svg', `<svg x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"`);
}

/** The illustrated banner on top of the classroom screens. */
export function classroomScene(): string {
  const id = 'cs';
  const ground = (x: number): number => 214 + Math.sin(x / 70) * 5 + Math.sin(x / 23) * 1.5;
  const rand = seededRandom(5);
  const stars = Array.from({ length: 46 }, () => `<circle cx="${f(rand() * W)}" cy="${f(rand() * 120)}" r="${f(0.4 + rand() * 0.9)}" fill="#fff" opacity="${(0.2 + rand() * 0.6).toFixed(2)}"/>`).join('');
  const motes = Array.from({ length: 16 }, () => {
    const x = 60 + rand() * 520;
    const y = 120 + rand() * 80;
    return `<circle cx="${f(x)}" cy="${f(y)}" r="5" fill="url(#${id}-mote)"/><circle cx="${f(x)}" cy="${f(y)}" r="1.1" fill="#fff4c8"/>`;
  }).join('');
  let groundPath = `M0 ${f(ground(0))}`;
  for (let x = 10; x <= W; x += 10) groundPath += ` L${x} ${f(ground(x))}`;
  groundPath += ` L${W} ${H} L0 ${H}Z`;

  const eggX = 404;
  const eggY = 205;

  return `<svg class="cs-scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2150"/><stop offset="0.6" stop-color="#211a3c"/><stop offset="1" stop-color="#1a1530"/></linearGradient>
<radialGradient id="${id}-moon" cx="0.83" cy="0.2" r="0.32"><stop offset="0" stop-color="#cbb8ff" stop-opacity="0.35"/><stop offset="1" stop-color="#cbb8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-egglight" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.55"/><stop offset="0.5" stop-color="#ff9f43" stop-opacity="0.18"/><stop offset="1" stop-color="#ff9f43" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-mote" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.7"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f3428"/><stop offset="1" stop-color="#121c17"/></linearGradient>
<linearGradient id="${id}-cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cf6a42"/><stop offset="1" stop-color="#7a2c22"/></linearGradient>
<linearGradient id="${id}-stem" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d4c6aa"/><stop offset="0.6" stop-color="#f3e9d6"/><stop offset="1" stop-color="#b9a685"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#${id}-sky)"/>
<rect width="${W}" height="${H}" fill="url(#${id}-moon)"/>
<circle cx="532" cy="52" r="15" fill="#e9e1ff" opacity="0.85"/><circle cx="538" cy="48" r="13" fill="#271f4a" opacity="0.9"/>
${stars}
<path d="M0 168 C70 140 130 150 190 160 C260 172 320 132 400 140 C470 147 520 128 640 150 L640 ${H} L0 ${H}Z" fill="#2a2347"/>
<path d="M0 188 C80 170 150 182 230 186 C320 191 380 166 460 172 C540 178 590 168 640 176 L640 ${H} L0 ${H}Z" fill="#231d3b"/>
<g fill="#1d1832">${Array.from({ length: 9 }, (_, i) => {
    const x = 30 + i * 72 + (i % 2) * 18;
    const y = 186 - (i % 3) * 4;
    return `<path d="M${x} ${y} l7 -24 l7 24Z M${x + 3} ${y - 8} l4 -26 l4 26Z"/>`;
  }).join('')}</g>
<ellipse cx="${eggX}" cy="${eggY - 14}" rx="70" ry="52" fill="url(#${id}-egglight)"/>
<path d="${groundPath}" fill="url(#${id}-ground)"/>
${grass(3, 0, W, ground)}
${nest(eggX, eggY, 4, false)}
<g class="cs-egg">${place(eggSvg('tidefin', 0.95, 11), eggX - 21, eggY - 46, 42, 50)}</g>
${nest(eggX, eggY, 4, true)}
<g class="cs-dragon">${place(celEmberback('adult'), 150, 70, 230, 150)}</g>
${mushroom(60, ground(60) + 2, 48, id, -5)}
${mushroom(92, ground(92) + 3, 30, id, 7)}
${mushroom(36, ground(36) + 3, 22, id, -10)}
${mushroom(560, ground(560) + 2, 38, id, 4)}
${mushroom(586, ground(586) + 3, 22, id, -8)}
${motes}
${vine([0, 6, 70, 30, 40, 80, 18, 128], 9, 2)}
${vine([0, 4, 110, -2, 170, 20, 250, 8], 10, 7, 2)}
${vine([640, 4, 560, 10, 520, 28, 440, 14], 9, 13, 2)}
${vine([640, 8, 600, 40, 628, 90, 612, 126], 8, 17)}
</svg>`;
}

/** Vines that climb the page edge behind everything, very faint. Hidden on phones. */
export function teacherBackdropSvg(): string {
  return `<svg class="tm-backdrop" viewBox="0 0 400 800" preserveAspectRatio="xMaxYMax meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
${vine([400, 800, 330, 640, 400, 520, 340, 360], 14, 21, 2)}
${vine([400, 600, 360, 520, 390, 440, 370, 300], 8, 23, 1.4)}
</svg>`;
}
