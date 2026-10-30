// Cel-shaded art for the aerie: the night cave and the seven decorations bought
// with embers. Everything lives in the 400 x 240 aerie scene (see screens/aerie.ts).
// The dragon stands in the middle (about x 120-280, y 80-220), so only floor items
// go there.
//
// Style: the bold cel look of the tribe dragons (dark outline, hard-edged shadow
// band, hard-edged light band, rim light, small texture shapes).
// iPad speed rules: no SVG filters, no per-shape animation. Each item animates at
// most one class: torches use .flicker on the inner flame layers of each torch,
// crystals and lanterns use one "cel-glow" group, stars use one "twinkle" group.

const f = (n: number): number => +n.toFixed(1);

/** Small seeded random generator so the art always comes out the same. */
function rnd(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Four-point sparkle centered on x, y. */
const star4 = (x: number, y: number, r: number, fill: string, extra = ''): string =>
  `<path d="M${f(x)} ${f(y - r)} Q${f(x + r * 0.16)} ${f(y - r * 0.16)} ${f(x + r)} ${f(y)} Q${f(x + r * 0.16)} ${f(y + r * 0.16)} ${f(x)} ${f(y + r)} Q${f(x - r * 0.16)} ${f(y + r * 0.16)} ${f(x - r)} ${f(y)} Q${f(x - r * 0.16)} ${f(y - r * 0.16)} ${f(x)} ${f(y - r)}Z" fill="${fill}"${extra}/>`;

const poly = (pts: number[][]): string => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + 'Z';
const line = (pts: number[][]): string => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L');

/** A smooth closed blob through points (quadratic curves between midpoints). */
function blob(pts: number[][]): string {
  const n = pts.length;
  const mid = (i: number): number[] => {
    const a = pts[i % n];
    const b = pts[(i + 1) % n];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  let d = `M${f(mid(0)[0])} ${f(mid(0)[1])}`;
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n];
    const m = mid(i);
    d += ` Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return d + 'Z';
}

/** Lumpy ellipse outline for moss and rocks. */
function lumpy(cx: number, cy: number, rx: number, ry: number, n: number, bump: number, seed: number): string {
  const r = rnd(seed);
  const pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // Bumps of a fixed size along the outline, so flat ellipses get lumps too.
    const k = (i % 2 ? bump : -bump * 0.3) * (0.7 + r() * 0.6);
    const nx = Math.cos(a) * ry;
    const ny = Math.sin(a) * rx;
    const nl = Math.hypot(nx, ny);
    pts.push([cx + Math.cos(a) * rx + (nx / nl) * k, cy + Math.sin(a) * ry + (ny / nl) * k]);
  }
  return blob(pts);
}

// ---------------------------------------------------------------- the cave

const INK = '#120c28';
const WALL = '#352a66';
const WALL_SH = '#2a2156';
const ROCK = '#2a2150';
const ROCK_SH = '#1f1842';
const ROCK_LT = '#43378a';
const RIM = '#8b7ae0';

/** The inner edge of the rock arch, from the bottom left round to the bottom right. */
const EDGE = [
  [22, 240], [26, 204], [20, 172], [28, 140], [22, 110], [30, 84], [42, 58], [60, 40], [84, 30], [110, 26], [140, 30], [170, 24],
  [200, 28], [230, 24], [262, 30], [290, 26], [316, 30], [340, 40], [358, 58], [370, 84], [378, 110], [372, 140], [380, 172], [374, 204], [378, 240],
];
const FRAME = poly([[0, 240], [0, 0], [400, 0], [400, 240], ...EDGE.slice().reverse()]);

/** Y of the arch's inner edge at x (along the top). */
function edgeY(x: number): number {
  for (let i = 6; i < 18; i++) {
    const [x0, y0] = EDGE[i];
    const [x1, y1] = EDGE[i + 1];
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return 30;
}

function stalactite(x: number, len: number, w: number): string {
  const y = edgeY(x) - 4;
  const tip = y + len + 4;
  let s = `<path d="M${f(x - w)} ${f(y)} Q${f(x - w * 0.35)} ${f(y + len * 0.55)} ${f(x + 0.5)} ${f(tip)} Q${f(x + w * 0.35)} ${f(y + len * 0.5)} ${f(x + w)} ${f(y)}Z" fill="${ROCK}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
  s += `<path d="M${f(x + w * 0.15)} ${f(y + 2)} Q${f(x + w * 0.2)} ${f(y + len * 0.55)} ${f(x + 0.5)} ${f(tip - 1)} Q${f(x + w * 0.35)} ${f(y + len * 0.5)} ${f(x + w - 1)} ${f(y + 2)}Z" fill="${ROCK_SH}"/>`;
  s += `<path d="M${f(x - w * 0.6)} ${f(y + 4)} Q${f(x - w * 0.3)} ${f(y + len * 0.5)} ${f(x - 0.4)} ${f(tip - 3)}" stroke="${RIM}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  return s;
}

function stalagmite(x: number, y: number, h: number, w: number): string {
  let s = `<path d="M${f(x - w)} ${f(y)} Q${f(x - w * 0.4)} ${f(y - h * 0.5)} ${f(x)} ${f(y - h)} Q${f(x + w * 0.4)} ${f(y - h * 0.5)} ${f(x + w)} ${f(y)}Z" fill="${ROCK}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`;
  s += `<path d="M${f(x - w * 0.55)} ${f(y - 1)} Q${f(x - w * 0.3)} ${f(y - h * 0.5)} ${f(x - 0.3)} ${f(y - h + 2)}" stroke="${ROCK_LT}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  return s;
}

function pebble(x: number, y: number, rx: number, ry: number): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#3a2f72" stroke="${INK}" stroke-width="1"/><ellipse cx="${f(x - rx * 0.25)}" cy="${f(y - ry * 0.35)}" rx="${f(rx * 0.5)}" ry="${f(ry * 0.35)}" fill="#5a4ba6"/>`;
}

function buildCave(): string {
  const edgeLine = line(EDGE);
  let s = `<defs><clipPath id="aerFrame"><path d="${FRAME}"/></clipPath>`;
  s += `<radialGradient id="aerPool" cx="0.5" cy="0.55" r="0.5"><stop offset="0" stop-color="#7a66d6" stop-opacity="0.5"/><stop offset="0.6" stop-color="#5a48b0" stop-opacity="0.18"/><stop offset="1" stop-color="#4a3c9a" stop-opacity="0"/></radialGradient></defs>`;
  s += `<rect width="400" height="240" fill="${ROCK_SH}"/>`;
  // Back wall: base, rock plates, cast shadow under the arch, a soft light pool.
  s += `<path d="M20 240 V80 Q20 24 96 24 H304 Q380 24 380 80 V240Z" fill="${WALL}"/>`;
  const plates: Array<[number[][], string]> = [
    [[[34, 96], [70, 70], [98, 90], [86, 140], [44, 150]], '#3b3074'],
    [[[44, 150], [86, 140], [102, 182], [72, 206], [30, 200]], '#30276a'],
    [[[316, 70], [360, 92], [368, 150], [326, 138], [302, 92]], '#3b3074'],
    [[[326, 138], [368, 150], [372, 200], [330, 206], [300, 182]], '#30276a'],
    [[[110, 46], [180, 38], [214, 48], [196, 78], [130, 82]], '#3e3378'],
    [[[214, 48], [286, 42], [300, 72], [258, 90], [196, 78]], '#382d70'],
    [[[98, 90], [130, 82], [160, 122], [124, 170], [86, 140]], '#33296b'],
    [[[258, 90], [302, 92], [326, 138], [290, 170], [250, 126]], '#33296b'],
  ];
  for (const [pts, fill] of plates) s += `<path d="${poly(pts)}" fill="${fill}" stroke="${INK}" stroke-width="1.2" stroke-opacity="0.45" stroke-linejoin="round"/>`;
  // Lit top edges of the upper plates.
  for (const i of [0, 2, 4, 5]) s += `<path d="${line(plates[i][0].slice(0, 3))}" stroke="#5a4bab" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>`;
  s += `<path d="M58 112 l10 8 l-4 10 M330 108 l-8 10 l6 8 M150 58 l12 6 M246 60 l-10 8" stroke="${INK}" stroke-width="1" fill="none" opacity="0.5" stroke-linecap="round"/>`;
  s += `<path d="M76 176 l8 6 M318 170 l-8 8 M178 56 l-6 8" stroke="${INK}" stroke-width="0.9" fill="none" opacity="0.4" stroke-linecap="round"/>`;
  s += `<path d="${edgeLine}" stroke="${WALL_SH}" stroke-width="30" fill="none" stroke-linejoin="round" opacity="0.85"/>`;
  s += `<ellipse cx="200" cy="150" rx="175" ry="112" fill="url(#aerPool)"/>`;
  // The rock arch: shadow tone, then mid band, light band and rim light along the
  // inner edge, all clipped to the rock, and angular facets to break it up.
  s += `<path d="${FRAME}" fill="${ROCK_SH}"/><g clip-path="url(#aerFrame)">`;
  s += `<path d="${edgeLine}" stroke="${ROCK}" stroke-width="30" fill="none" stroke-linejoin="round"/>`;
  s += `<path d="${edgeLine}" stroke="${ROCK_LT}" stroke-width="9" fill="none" stroke-linejoin="round"/>`;
  s += `<path d="${edgeLine}" stroke="${RIM}" stroke-width="2.4" fill="none" stroke-linejoin="round" opacity="0.9"/>`;
  const facets = [
    [[0, 0], [52, 0], [30, 22], [0, 40]], [[348, 0], [400, 0], [400, 40], [370, 22]],
    [[120, 0], [176, 0], [150, 12]], [[236, 0], [290, 0], [262, 13]],
    [[0, 120], [10, 104], [12, 150], [0, 164]], [[400, 118], [390, 104], [388, 150], [400, 166]],
    [[0, 200], [12, 190], [14, 240], [0, 240]], [[400, 196], [388, 190], [386, 240], [400, 240]],
  ];
  for (const p of facets) s += `<path d="${poly(p)}" fill="#18123a" stroke="${INK}" stroke-width="1" stroke-opacity="0.6"/>`;
  s += `<path d="M66 12 l-8 10 M100 8 l6 9 M200 6 l-4 10 l6 4 M300 8 l-6 8 M338 14 l8 8" stroke="#4d3f96" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  s += `<path d="M8 70 l6 10 M392 70 l-6 10 M6 180 l8 6 M394 182 l-8 6" stroke="#4d3f96" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.6"/>`;
  s += `</g><path d="${edgeLine}" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linejoin="round"/>`;
  // Stalactites, clear of the banner and the lantern rope.
  s += stalactite(54, 14, 6) + stalactite(118, 16, 6) + stalactite(162, 10, 4.5) + stalactite(240, 12, 5) + stalactite(282, 18, 6) + stalactite(346, 14, 6);
  // Floor: base, lit back edge, front shadow, slab lines, pebbles, stalagmites.
  const top = 'M0 214 Q60 204 120 202 Q200 198 280 202 Q340 204 400 214';
  s += `<path d="${top} V240 H0Z" fill="#2b2259"/>`;
  s += `<path d="${top} L400 220 Q340 211 280 208 Q200 204 120 208 Q60 211 0 220Z" fill="#463a88"/>`;
  s += `<path d="M0 240 V230 Q200 221 400 230 V240Z" fill="#1b1540"/>`;
  s += `<path d="${top}" stroke="${INK}" stroke-width="1.8" fill="none"/>`;
  s += `<path d="M34 222 l18 8 M118 214 l-6 12 M286 214 l8 12 M354 222 l-16 8" stroke="${INK}" stroke-width="1" fill="none" opacity="0.45" stroke-linecap="round"/>`;
  for (const [x, y, rx, ry] of [[14, 232, 4, 2.4], [32, 226, 3, 1.8], [46, 234, 3.6, 2], [54, 220, 2.2, 1.4], [386, 232, 4, 2.4], [368, 226, 3, 1.8], [356, 235, 3.2, 1.9], [374, 218, 2.2, 1.4], [150, 236, 3, 1.6], [246, 237, 3.2, 1.7]]) s += pebble(x, y, rx, ry);
  s += stalagmite(26, 216, 22, 7) + stalagmite(40, 214, 11, 4) + stalagmite(374, 216, 22, 7) + stalagmite(360, 214, 11, 4);
  return s;
}

// ---------------------------------------------------------------- moss rug

function buildMoss(): string {
  const ink = '#123d1f';
  const base = lumpy(200, 222, 150, 15, 30, 4.4, 11);
  const upper = lumpy(200, 215, 114, 8.5, 24, 3.4, 23);
  let s = `<defs><clipPath id="aerMossB"><path d="${base}"/></clipPath><clipPath id="aerMossU"><path d="${upper}"/></clipPath></defs>`;
  s += `<ellipse cx="200" cy="228" rx="154" ry="12" fill="#120c28" opacity="0.45"/>`;
  s += `<path d="${base}" fill="#2f9e44" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#aerMossB)"><ellipse cx="200" cy="236" rx="166" ry="12" fill="#1f7a34"/><ellipse cx="196" cy="211" rx="128" ry="7" fill="#40c057"/></g>`;
  s += `<path d="${upper}" fill="#40c057" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#aerMossU)"><ellipse cx="200" cy="221" rx="120" ry="5" fill="#2f9e44"/><ellipse cx="190" cy="209" rx="92" ry="3.6" fill="#8ce99a"/></g>`;
  // Moss cushions: round clumps with a lit top.
  for (const [x, y, w] of [[96, 221, 8], [128, 226, 9], [160, 229, 8], [240, 229, 8], [272, 226, 9], [304, 221, 8], [150, 214, 7], [250, 214, 7]]) {
    s += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${f(w * 0.48)}" fill="#37b24d" stroke="${ink}" stroke-width="1" stroke-opacity="0.7"/><ellipse cx="${f(x - w * 0.2)}" cy="${f(y - w * 0.18)}" rx="${f(w * 0.5)}" ry="${f(w * 0.2)}" fill="#69db7c"/>`;
  }
  // Tufts: three blades with a light center blade.
  for (const [x, y] of [[66, 214], [92, 209], [124, 205], [158, 204], [242, 204], [276, 205], [308, 209], [334, 214], [112, 228], [290, 228]]) {
    s += `<path d="M${x - 4} ${y} Q${x - 5} ${y - 4} ${x - 7} ${y - 7} Q${x - 2} ${y - 5} ${x - 1} ${y - 1} Q${x} ${y - 6} ${x + 1} ${y - 10} Q${x + 2.4} ${y - 5} ${x + 2} ${y - 1} Q${x + 4} ${y - 5} ${x + 7} ${y - 6} Q${x + 5} ${y - 3} ${x + 4} ${y}Z" fill="#51cf66" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/>`;
    s += `<path d="M${x} ${y - 2} Q${x + 0.4} ${y - 5} ${x + 1} ${y - 8} Q${x + 1.4} ${y - 5} ${x + 1.2} ${y - 2}Z" fill="#b2f2bb"/>`;
  }
  // Tiny flowers.
  const fl: Array<[number, number, string]> = [[80, 222, '#fff5f5'], [104, 214, '#ffc9de'], [140, 210, '#e5dbff'], [176, 226, '#fff5f5'], [226, 227, '#ffc9de'], [262, 210, '#fff5f5'], [300, 216, '#e5dbff'], [322, 224, '#ffc9de']];
  for (const [x, y, c] of fl) {
    let d = '';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * 1.9;
      const py = y + Math.sin(a) * 1.4;
      d += `M${f(px - 1.3)} ${f(py)} a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0`;
    }
    s += `<path d="${d}" fill="${c}" stroke="${ink}" stroke-width="0.5"/><circle cx="${x}" cy="${y}" r="0.9" fill="#ffd43b"/>`;
  }
  return `<g>${s}</g>`;
}

// ---------------------------------------------------------------- torches

function torch(): string {
  const ink = '#2b160c';
  let s = `<circle cx="0" cy="94" r="34" fill="url(#aerTorchGlow)"/>`;
  s += `<path d="M-7 120 h14 v16 q0 4 -4 4 h-6 q-4 0 -4 -4z" fill="#495057" stroke="${ink}" stroke-width="1.4"/><path d="M-5.6 121.6 h3 v15 h-3z" fill="#868e96"/>`;
  s += `<circle cx="0" cy="123.5" r="1.1" fill="#ced4da"/><circle cx="0" cy="136.5" r="1.1" fill="#ced4da"/>`;
  s += `<path d="M-3 108 L3 108 L2.2 150 Q0 153 -2.2 150Z" fill="#8d5b3a" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/>`;
  s += `<path d="M0.6 109 L2.6 109 L1.9 149.6 Q1.2 151 0.6 150.6Z" fill="#6b3f22"/><path d="M-2.1 111 L-1 111 L-1.2 147 L-1.7 147Z" fill="#c08a5e"/>`;
  for (const y of [112, 117, 143]) s += `<path d="M-3.3 ${y} l6.6 -1.4 v3 l-6.6 1.4z" fill="#e8d5b0" stroke="${ink}" stroke-width="0.8" stroke-linejoin="round"/>`;
  s += `<path d="M1 111.2 l2.3 -0.5 v3 l-2.3 0.5z M1 116.2 l2.3 -0.5 v3 l-2.3 0.5z M1 142.2 l2.3 -0.5 v3 l-2.3 0.5z" fill="#b8966a"/>`;
  s += `<path d="M-6 126 h12 v4 h-12z" fill="#343a40" stroke="${ink}" stroke-width="1.1"/>`;
  s += `<path d="M-7 100 L7 100 L4.5 109 L-4.5 109Z" fill="#5c5f66" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/><path d="M1.5 101 L6.4 101 L4 108.4 L1 108.4Z" fill="#3b3d42"/><path d="M-6.6 100.6 h13.2 v1.6 h-13.2z" fill="#adb5bd"/>`;
  s += `<path d="M0 72 C6 80 12 86 11 94 C10 99 6 102 0 102 C-6 102 -10 99 -11 94 C-12 87 -6 84 -3 78 C-2 82 -1 84 1 85 C2 80 1 76 0 72Z" fill="#ff7a1a" stroke="#8a2c0a" stroke-width="1.4" stroke-linejoin="round"/>`;
  s += `<g class="flicker"><path d="M0.4 80 C4 86 8 90 7.4 95 C6.8 99 3.6 101 0 101 C-4 101 -7.2 99 -7.4 95 C-7.6 91 -3.4 89 -1.6 85 C-1 88 0 89 1 89.4 C1.6 86 1.2 83 0.4 80Z" fill="#ffb02e"/>`;
  s += `<path d="M0 87 C3 91 5 94.6 4.6 97.4 C4.2 99.8 2.2 100.8 0 100.8 C-2.2 100.8 -4.2 99.8 -4.4 97.4 C-4.6 94.6 -2 92.4 0 87Z" fill="#ffe066"/><ellipse cx="0" cy="98" rx="1.9" ry="2.4" fill="#fffbe6"/></g>`;
  s += `<circle cx="-5" cy="67" r="1.1" fill="#ffd43b"/><circle cx="4" cy="63" r="0.8" fill="#ffe8a3"/>`;
  return s;
}

function buildTorches(): string {
  const defs = `<defs><radialGradient id="aerTorchGlow"><stop offset="0" stop-color="#ffb347" stop-opacity="0.45"/><stop offset="0.5" stop-color="#ff922b" stop-opacity="0.16"/><stop offset="1" stop-color="#ff922b" stop-opacity="0"/></radialGradient></defs>`;
  const t = torch();
  return `<g>${defs}<g transform="translate(42 0) rotate(5 0 130)">${t}</g><g transform="translate(358 0) scale(-1 1) rotate(5 0 130)">${t}</g></g>`;
}

// ---------------------------------------------------------------- glow crystals

interface Gem { base: string; light: string; shade: string; tip: string; ink: string }
const BLUE: Gem = { base: '#4dabf7', light: '#a5d8ff', shade: '#1c6fc0', tip: '#e7f5ff', ink: '#13285a' };
const VIOLET: Gem = { base: '#b197fc', light: '#e5dbff', shade: '#7048e8', tip: '#f8f0fc', ink: '#2b1a5c' };

/** One crystal: base at bx, by, leaning ang degrees, length L, width w. Returns [shapes, glow core]. */
function crystal(bx: number, by: number, ang: number, L: number, w: number, c: Gem): [string, string] {
  const a = (ang * Math.PI) / 180;
  const d = [Math.sin(a), -Math.cos(a)];
  const n = [Math.cos(a), Math.sin(a)];
  const at = (along: number, side: number): number[] => [bx + d[0] * along + n[0] * side, by + d[1] * along + n[1] * side];
  const sh = L - w * 0.9;
  const BL = at(0, -w / 2);
  const BR = at(0, w / 2);
  const SL = at(sh, -w / 2);
  const SR = at(sh, w / 2);
  const T = at(L, 0);
  const RB = at(0, w * 0.12);
  const RS = at(sh, w * 0.12);
  let s = `<path d="${poly([BL, SL, T, SR, BR])}" fill="${c.base}" stroke="${c.ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
  s += `<path d="${poly([BL, SL, T, RS, RB])}" fill="${c.light}"/>`;
  s += `<path d="${poly([at(0, w * 0.32), at(sh, w * 0.32), T, SR, BR])}" fill="${c.shade}"/>`;
  s += `<path d="${poly([SL, T, RS])}" fill="${c.tip}"/>`;
  s += `<path d="${line([RB, RS, T])}" stroke="#ffffff" stroke-width="1" fill="none" stroke-linejoin="round" opacity="0.9"/>`;
  s += `<path d="${poly([BL, SL, T, SR, BR])}" fill="none" stroke="${c.ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
  const core = `<path d="${poly([at(2, -w * 0.12), at(sh * 0.85, -w * 0.2), at(L - 3, -w * 0.05), at(sh * 0.6, w * 0.02)])}" fill="#ffffff" opacity="0.75"/>`;
  return [s, core];
}

function buildCrystals(): string {
  const parts: Array<[string, string]> = [
    crystal(68, 226, -16, 40, 15, BLUE),
    crystal(104, 226, 14, 34, 14, BLUE),
    crystal(86, 227, -2, 62, 22, BLUE),
    crystal(114, 229, 22, 14, 7, VIOLET),
    crystal(76, 230, -8, 22, 10, VIOLET),
    crystal(98, 231, 10, 18, 9, BLUE),
  ];
  let s = `<defs><radialGradient id="aerCrystalGlow"><stop offset="0" stop-color="#74c0fc" stop-opacity="0.55"/><stop offset="1" stop-color="#74c0fc" stop-opacity="0"/></radialGradient></defs>`;
  s += `<ellipse cx="88" cy="222" rx="50" ry="22" fill="url(#aerCrystalGlow)"/>`;
  s += parts.map((p) => p[0]).join('');
  for (const [x, y, rx, ry] of [[72, 231, 12, 4.4], [98, 232, 14, 4.2], [118, 231, 7, 3.4]]) {
    s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#3a2f72" stroke="${INK}" stroke-width="1.2"/><ellipse cx="${f(x - rx * 0.15)}" cy="${f(y - ry * 0.4)}" rx="${f(rx * 0.6)}" ry="${f(ry * 0.35)}" fill="#5a4ba6"/>`;
  }
  s += `<g class="cel-glow">${parts.map((p) => p[1]).join('')}${star4(80, 172, 3.6, '#ffffff')}${star4(116, 192, 2.6, '#e7f5ff')}${star4(56, 196, 2.4, '#e7f5ff')}</g>`;
  return `<g>${s}</g>`;
}

// ---------------------------------------------------------------- rider banner

function buildBanner(): string {
  const ink = '#4a0f1f';
  const gold = '#ffd43b';
  const goldInk = '#7a4b00';
  const cloth = 'M180 18 H220 C221 29 219 39 220 52 L200 44 L180 52 C181 39 179 29 180 18Z';
  let s = `<defs><clipPath id="aerBanner"><path d="${cloth}"/></clipPath></defs>`;
  s += `<path d="M178 16 L200 6 L222 16" stroke="#c9a227" stroke-width="1.2" fill="none" stroke-linejoin="round"/><circle cx="200" cy="6" r="1.8" fill="#adb5bd" stroke="${INK}" stroke-width="0.8"/>`;
  s += `<path d="${cloth}" fill="#120c28" opacity="0.35" transform="translate(3 3)"/>`;
  s += `<path d="${cloth}" fill="#e8364f"/>`;
  s += `<g clip-path="url(#aerBanner)">`;
  s += `<path d="M178 46 L200 38 L222 46 V60 H178Z" fill="#b3243f" opacity="0.75"/>`;
  for (const x of [187, 206, 214.5]) s += `<path d="M${x} 18 h3 C${x + 4} 30 ${x + 2} 40 ${x + 3} 56 h-3 C${x - 1} 40 ${x + 1} 30 ${x} 18Z" fill="#b3243f"/>`;
  for (const x of [182.5, 196]) s += `<path d="M${x} 18 h2.4 C${x + 3.4} 30 ${x + 1.4} 40 ${x + 2.4} 56 h-2.4 C${x - 1} 40 ${x + 1} 30 ${x} 18Z" fill="#ff6b81"/>`;
  s += `<path d="M181.2 19 C182.2 29 180.2 39 181.2 51" stroke="#ffa8b8" stroke-width="1.6" fill="none"/>`;
  s += `<path d="M181 50 L200 42 L219 50" stroke="${gold}" stroke-width="1.8" fill="none" stroke-linejoin="round"/>`;
  s += `<path d="M184 24 V46 M216 24 V46" stroke="#ffd8a8" stroke-width="0.8" stroke-dasharray="2 2" fill="none" opacity="0.85"/>`;
  s += `</g><path d="${cloth}" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
  s += `<path d="M179 17 H221 V22.5 H179Z" fill="#a61e3a" stroke="${ink}" stroke-width="1"/>`;
  // Emblem: a gold badge with a winged flame (an original rider mark).
  s += `<circle cx="200" cy="31" r="9.5" fill="${gold}" stroke="${goldInk}" stroke-width="1.2"/><path d="M190.6 31.6 a9.4 9.4 0 0 0 18.8 0 a9.4 7.4 0 0 1 -18.8 0Z" fill="#e09100"/>`;
  s += `<circle cx="200" cy="31" r="7" fill="#8f1631"/>`;
  s += `<path d="M196.4 33 C193 32.6 191.4 30.2 191.6 27 C192.6 28.4 194 28.9 195 28.7 C194.6 29.8 195.4 30.8 196.8 31Z" fill="${gold}"/><path d="M203.6 33 C207 32.6 208.6 30.2 208.4 27 C207.4 28.4 206 28.9 205 28.7 C205.4 29.8 204.6 30.8 203.2 31Z" fill="${gold}"/>`;
  s += `<path d="M200 23.6 C203 26.6 204.6 29.6 204 32.4 C203.5 34.8 202 36 200 36 C198 36 196.5 34.8 196 32.4 C195.6 30.4 197 29.4 198 27.6 C198.5 29.4 199 30 199.6 30.4 C200.4 28.4 200.6 26 200 23.6Z" fill="${gold}" stroke="${goldInk}" stroke-width="0.6"/>`;
  s += `<path d="M200 29.6 C201.6 31 202.2 32.4 201.8 33.6 C201.4 34.6 200.8 35 200 35 C199.2 35 198.4 34.6 198.2 33.6 C198 32.4 198.8 31.4 200 29.6Z" fill="#fff3bf"/>`;
  s += star4(190, 40, 1.8, '#ffe066') + star4(210.5, 39, 1.6, '#ffe066');
  s += `<circle cx="193" cy="45" r="0.8" fill="${gold}"/><circle cx="207" cy="45" r="0.8" fill="${gold}"/>`;
  // Rod, knobs and tassels.
  s += `<rect x="174" y="14" width="52" height="4" rx="2" fill="${gold}" stroke="${goldInk}" stroke-width="1.2"/><path d="M175.5 16.6 h49 v1 h-49z" fill="#e09100"/><path d="M177 14.9 h30 v0.9 h-30z" fill="#fff3bf"/>`;
  s += `<circle cx="173" cy="16" r="2.6" fill="${gold}" stroke="${goldInk}" stroke-width="1.1"/><circle cx="227" cy="16" r="2.6" fill="${gold}" stroke="${goldInk}" stroke-width="1.1"/>`;
  for (const x of [180, 220]) s += `<path d="M${x} 52 C${x + 2} 53 ${x + 2} 55.6 ${x} 56.6 C${x - 2} 55.6 ${x - 2} 53 ${x} 52Z" fill="${gold}" stroke="${goldInk}" stroke-width="0.8"/><path d="M${x + 0.4} 53 C${x + 1.2} 54 ${x + 1.2} 55 ${x + 0.4} 55.8Z" fill="#e09100"/>`;
  return `<g>${s}</g>`;
}

// ---------------------------------------------------------------- string lanterns

/** The lantern rope: a sagging curve from 40,36 to 360,36. */
const rope = (t: number): number[] => [40 + 320 * t, 36 + 96 * t * (1 - t)];
const LANTERN_COLORS = ['#ffe066', '#ff8787', '#8ce99a', '#74c0fc', '#e599f7'];
const LANTERN_SHADE = ['#f08c00', '#e03131', '#2f9e44', '#1c7ed6', '#ae3ec9'];

function buildLanterns(): string {
  const ink = '#2a1a10';
  let defs = '<defs>';
  LANTERN_COLORS.forEach((c, i) => {
    defs += `<radialGradient id="aerLan${i}"><stop offset="0" stop-color="${c}" stop-opacity="0.5"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  });
  defs += '</defs>';
  let s = defs;
  s += `<path d="M40 36 Q200 84 360 36" stroke="${ink}" stroke-width="2.6" fill="none"/><path d="M40 36 Q200 84 360 36" stroke="#c9a87a" stroke-width="1.4" fill="none"/>`;
  s += `<path d="M40 36 Q200 84 360 36" stroke="#7a5a3a" stroke-width="1.4" fill="none" stroke-dasharray="1 3"/>`;
  for (const x of [40, 360]) s += `<circle cx="${x}" cy="36" r="2.6" fill="#868e96" stroke="${INK}" stroke-width="1"/><circle cx="${x - 0.6}" cy="35.2" r="0.9" fill="#dee2e6"/>`;
  let glow = '';
  [0.156, 0.328, 0.5, 0.672, 0.844].forEach((t, i) => {
    const [x0, y0] = rope(t);
    const x = f(x0);
    const y = f(y0);
    const c = LANTERN_COLORS[i];
    const sh = LANTERN_SHADE[i];
    s += `<circle cx="${x}" cy="${f(y + 13)}" r="15" fill="url(#aerLan${i})"/>`;
    s += `<path d="M${x} ${y} V${f(y + 4)}" stroke="${ink}" stroke-width="1"/>`;
    s += `<path d="M${f(x - 3)} ${f(y + 4)} H${f(x + 3)} L${f(x + 4.4)} ${f(y + 7.4)} H${f(x - 4.4)}Z" fill="#495057" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/>`;
    s += `<path d="M${f(x + 0.6)} ${f(y + 4.6)} H${f(x + 2.6)} L${f(x + 3.6)} ${f(y + 7)} H${f(x + 0.6)}Z" fill="#343a40"/>`;
    s += `<path d="M${f(x - 4)} ${f(y + 7)} C${f(x - 8.4)} ${f(y + 9)} ${f(x - 8.4)} ${f(y + 17)} ${f(x - 4)} ${f(y + 19)} H${f(x + 4)} C${f(x + 8.4)} ${f(y + 17)} ${f(x + 8.4)} ${f(y + 9)} ${f(x + 4)} ${f(y + 7)}Z" fill="${c}" stroke="${ink}" stroke-width="1.2"/>`;
    s += `<path d="M${f(x + 2)} ${f(y + 7.6)} H${f(x + 4)} C${f(x + 7.8)} ${f(y + 9.4)} ${f(x + 7.8)} ${f(y + 16.6)} ${f(x + 4)} ${f(y + 18.4)} H${f(x + 2)} C${f(x + 5)} ${f(y + 16)} ${f(x + 5)} ${f(y + 10)} ${f(x + 2)} ${f(y + 7.6)}Z" fill="${sh}" opacity="0.8"/>`;
    s += `<path d="M${f(x - 3.6)} ${f(y + 8.6)} C${f(x - 6.6)} ${f(y + 10.6)} ${f(x - 6.6)} ${f(y + 15.4)} ${f(x - 3.6)} ${f(y + 17.4)}" stroke="#ffffff" stroke-width="1.1" fill="none" opacity="0.7" stroke-linecap="round"/>`;
    s += `<path d="M${f(x - 2)} ${f(y + 7.4)} Q${f(x - 3.6)} ${f(y + 13)} ${f(x - 2)} ${f(y + 18.6)} M${f(x + 2)} ${f(y + 7.4)} Q${f(x + 3.6)} ${f(y + 13)} ${f(x + 2)} ${f(y + 18.6)} M${f(x - 7)} ${f(y + 13)} H${f(x + 7)}" stroke="${ink}" stroke-width="0.6" fill="none" opacity="0.45"/>`;
    s += `<path d="M${f(x - 3)} ${f(y + 19)} H${f(x + 3)} V${f(y + 21.4)} H${f(x - 3)}Z" fill="#495057" stroke="${ink}" stroke-width="0.9"/>`;
    s += `<path d="M${x} ${f(y + 21.4)} C${f(x + 1.6)} ${f(y + 22.6)} ${f(x + 1)} ${f(y + 25)} ${x} ${f(y + 26)} C${f(x - 1)} ${f(y + 25)} ${f(x - 1.6)} ${f(y + 22.6)} ${x} ${f(y + 21.4)}Z" fill="${sh}"/>`;
    glow += `<ellipse cx="${f(x - 0.6)}" cy="${f(y + 13)}" rx="2.6" ry="3.6" fill="#fffbe6" opacity="0.85"/>`;
  });
  s += `<g class="cel-glow g2">${glow}</g>`;
  return `<g>${s}</g>`;
}

// ---------------------------------------------------------------- treasure pile

function coin(x: number, y: number, r: number): string {
  return `<ellipse cx="${x}" cy="${f(y + 1.3)}" rx="${r}" ry="${f(r * 0.45)}" fill="#c97a00" stroke="#5c3200" stroke-width="1"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r * 0.45)}" fill="#ffd43b" stroke="#5c3200" stroke-width="1"/><ellipse cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.12)}" rx="${f(r * 0.35)}" ry="${f(r * 0.12)}" fill="#fff3bf"/>`;
}

function standingCoin(x: number, y: number, r: number): string {
  return `<circle cx="${f(x + 1.2)}" cy="${y}" r="${r}" fill="#c97a00" stroke="#5c3200" stroke-width="1"/><circle cx="${x}" cy="${y}" r="${r}" fill="#fcc419" stroke="#5c3200" stroke-width="1"/><circle cx="${x}" cy="${y}" r="${f(r * 0.62)}" fill="none" stroke="#e09100" stroke-width="1"/><path d="M${f(x - r * 0.55)} ${f(y - r * 0.2)} a${f(r * 0.6)} ${f(r * 0.6)} 0 0 1 ${f(r * 0.5)} ${f(-r * 0.4)}" stroke="#fff3bf" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
}

function buildTreasure(): string {
  const ink = '#3b1d0a';
  const goldInk = '#5c3200';
  const mound = 'M276 230 C280 218 292 210 304 208 C312 200 328 200 336 208 C346 211 352 218 356 230Z';
  let s = `<defs><clipPath id="aerMound"><path d="${mound}"/></clipPath></defs>`;
  s += `<ellipse cx="320" cy="230" rx="50" ry="8" fill="#120c28" opacity="0.45"/>`;
  // A small chest behind the pile, with a round lid and a heart lock.
  s += `<path d="M338 206 H364 V223 H338Z" fill="#9c5a2e" stroke="${ink}" stroke-width="1.4"/><path d="M355 206.6 H363.4 V222.4 H355Z" fill="#7a3f1c"/>`;
  s += `<path d="M337 206 V200 Q351 189 365 200 V206Z" fill="#b86b3a" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/><path d="M352 194.6 Q359 196 364.4 200.4 V205.4 H352Z" fill="#8a4a22"/>`;
  s += `<path d="M339.6 199 Q351 191.6 362 197" stroke="#e0a06a" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M343 193.4 V223 M359 194.4 V223" stroke="#ffd43b" stroke-width="2.4"/><path d="M337 205 H365 V208 H337Z" fill="#ffd43b" stroke="${goldInk}" stroke-width="0.8"/>`;
  s += `<path d="M351 214 C349.6 212.8 347.6 211.4 347.6 209.6 C347.6 207.8 349.8 207.2 351 208.8 C352.2 207.2 354.4 207.8 354.4 209.6 C354.4 211.4 352.4 212.8 351 214Z" fill="#ffe066" stroke="${goldInk}" stroke-width="0.9"/>`;
  // The coin mound with cel bands and coin edges.
  s += `<path d="${mound}" fill="#f59f00" stroke="${goldInk}" stroke-width="1.6" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#aerMound)"><path d="M270 222 Q316 231 362 222 V236 H270Z" fill="#c97a00"/><path d="M290 214 C302 206 314 202 326 203 C318 206 306 210 296 218Z" fill="#ffd43b"/>`;
  s += `<path d="M286 223 q4 -2.4 8 0 M300 225 q4 -2.4 8 0 M316 221 q4 -2.4 8 0 M332 224 q4 -2.4 8 0 M344 220 q3 -2 6 0 M306 215 q4 -2.4 8 0 M324 213 q4 -2.4 8 0" stroke="#b86e00" stroke-width="1" fill="none"/></g>`;
  s += `<path d="M284 220 C290 212 298 209 306 207.6" stroke="#fff3bf" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  s += standingCoin(290, 219, 6.4) + standingCoin(352, 221, 6);
  for (const [x, y, r] of [[300, 213, 5], [338, 213, 4.6], [282, 229, 5.6], [299, 234, 5], [318, 230, 6], [334, 235, 4.4], [347, 230, 5.4]]) s += coin(x, y, r);
  // A friendly pink gem on top.
  s += `<path d="M312 201 L316 195 H324 L328 201 L320 210Z" fill="#e64980" stroke="#5c0f2e" stroke-width="1.2" stroke-linejoin="round"/>`;
  s += `<path d="M316.6 195.6 H323.4 L321.8 201 H318.2Z" fill="#ffa8c5"/><path d="M321.8 201 H327.4 L320.4 209Z" fill="#a61e4d"/><path d="M313 201 H318.2 L320 208.6Z" fill="#f783ac"/>`;
  s += star4(325, 194.4, 3.4, '#ffffff') + star4(296, 205, 2.4, '#fff3bf') + star4(362, 189, 2.4, '#fff3bf');
  return `<g>${s}</g>`;
}

// ---------------------------------------------------------------- starry ceiling

function buildStars(): string {
  const r = rnd(4242);
  const ropeY = (x: number): number => rope((x - 40) / 320)[1];
  const clear = (x: number, y: number): boolean => !(x > 166 && x < 234 && y < 62) && y < ropeY(x) - 6 && !(x > 30 && x < 52 && y > 30);
  let s = '';
  // Tiny specks.
  let n = 0;
  while (n < 22) {
    const x = 14 + r() * 372;
    const y = 4 + r() * 50;
    if (!clear(x, y)) continue;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.6 + r() * 0.5)}" fill="${n % 3 ? '#ffffff' : '#d0bfff'}" opacity="0.8"/>`;
    n++;
  }
  // Two little constellations: lines, then stars with a soft halo.
  const left = [[70, 14], [84, 22], [100, 17], [112, 26], [128, 20]];
  const right = [[266, 12], [280, 21], [298, 11], [292, 31], [312, 24]];
  s += `<path d="${line(left)}" stroke="#c5b8ff" stroke-width="0.7" fill="none" opacity="0.6"/><path d="M266 12 L280 21 L298 11 M280 21 L292 31 L312 24" stroke="#c5b8ff" stroke-width="0.7" fill="none" opacity="0.6"/>`;
  for (const [x, y] of [...left, ...right, [148, 8], [250, 40]]) s += `<circle cx="${x}" cy="${y}" r="3.2" fill="#b197fc" opacity="0.3"/><circle cx="${x}" cy="${y}" r="1.5" fill="#ffffff"/>`;
  // Big sparkles twinkle together.
  let tw = '';
  for (const [x, y, k] of [[34, 22, 4.6], [146, 34, 3.6], [244, 14, 4.2], [340, 16, 4.6], [62, 48, 3], [364, 52, 3.2]]) {
    tw += star4(x, y, k, '#fff9db') + `<circle cx="${x}" cy="${y}" r="${f(k * 0.22)}" fill="#ffffff"/>`;
  }
  s += `<g class="twinkle">${tw}</g>`;
  return `<g>${s}</g>`;
}

/** The cave behind everything: back wall, rock arch, stalactites and floor. */
export const CAVE_ART: string = buildCave();

/** Markup for each decoration, in the 400 x 240 scene. */
export const DECOR_ART: Record<string, string> = {
  moss: buildMoss(),
  torches: buildTorches(),
  crystals: buildCrystals(),
  banner: buildBanner(),
  lanterns: buildLanterns(),
  treasure: buildTreasure(),
  stars: buildStars(),
};

/**
 * A viewBox ("x y w h") for each decoration's small shop-card picture. Compact items are
 * framed whole; the wide ones (moss, torches, lanterns, stars) frame one readable part.
 */
export const DECOR_THUMB: Record<string, string> = {
  moss: '50 194 150 46',
  torches: '16 56 54 102',
  crystals: '36 162 104 84',
  banner: '166 2 68 60',
  lanterns: '124 42 152 50',
  treasure: '266 182 106 58',
  stars: '22 0 134 58',
};
