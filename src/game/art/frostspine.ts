// Frostspine: a slender, tall-standing ice dragon with a long upright neck, a
// narrow angular head, faceted crystal spines and horns, and a diamond tail tip.

import { celEye, dk, f, lt, mix, star4, type Ctx, type Parts, type TribeArt } from './cel';

const BODY = 'M76 98 C76 86 90 78 110 75 C126 72 140 70 151 64 C161 58 168 50 172 42 L199 44 C198 56 195 68 190 80 C184 96 172 108 150 112 C130 116 104 116 90 112 C80 109 76 104 76 98Z';
const BELLY = 'M90 109 C112 115 140 113 158 105 C172 97 181 84 186 68 L193 64 C191 82 184 97 170 106 C150 118 112 118 90 109Z';
const TAIL = 'M8 -14 C-14 -15 -34 -7 -50 3 C-62 10 -74 12 -86 9 L-86 15 C-73 20 -60 19 -46 12 C-30 4 -14 3 8 8Z';
const WING = 'M0 0 C4 -20 2 -42 -6 -56 L-50 -66 L-45 -56 L-64 -48 L-55 -40 L-71 -27 L-60 -21 L-66 -7 L-42 -4 L-32 6Z';
const EDGE = 'M-50 -66 L-45 -56 L-64 -48 L-55 -40 L-71 -27 L-60 -21 L-66 -7 L-42 -4 L-32 6';
const BONES = 'M-6 -56 L-50 -66 M-6 -56 L-64 -48 M-6 -56 L-71 -27';
// Facet panels of the wing (wrist fan), alternating light and dark.
const FACETS: Array<[string, number]> = [
  ['M-6 -56 L-50 -66 L-45 -56Z', 0.3],
  ['M-6 -56 L-45 -56 L-64 -48Z', -0.08],
  ['M-6 -56 L-64 -48 L-55 -40Z', 0.18],
  ['M-6 -56 L-55 -40 L-71 -27Z', -0.14],
  ['M-6 -56 L-71 -27 L-60 -21 L-30 -18Z', 0.1],
  ['M-30 -18 L-60 -21 L-66 -7 L-42 -4Z', -0.2],
];
const TIPS: Array<[number, number]> = [[-50, -66], [-64, -48], [-71, -27], [-66, -7]];
const THIGH = 'M90 96 C82 104 84 116 94 118 C104 119 110 110 108 100 C106 92 96 90 90 96Z';
const FOOT = 'M100 112 C98 118 96 122 92 125 L82 127 L85 124 L79 123 L88 120 C90 117 91 114 92 110Z';
const FARLEG = 'M110 104 C110 112 108 118 104 122 L94 125 L97 121 L91 120 L100 117 C102 112 102 106 102 102Z';
const ARM = 'M162 98 C164 108 166 114 170 118 L178 121 L175 117 L181 116 L173 113 C170 108 168 102 168 96Z';
const CLAWS: Array<[number, number, number]> = [[178, 121, 1], [181, 116, 1], [82, 127, -1], [79, 123, -1], [94, 125, -1], [91, 120, -1]];
const BACK: Array<[number, number]> = [[86, 83], [97, 78], [108, 75.5], [120, 73.5], [132, 71], [143, 67.5], [153, 62.5], [161, 56.5], [167, 50]];
const SPINES = [10, 15, 20, 24, 27, 25, 21, 16, 12];
const FLAKES: Array<[number, number, number]> = [[100, 90, 2.6], [118, 84, 3.2], [136, 80, 2.4], [152, 76, 3], [126, 96, 2.2], [166, 70, 2.4], [110, 100, 1.8], [174, 60, 2]];
const MORE_FLAKES: Array<[number, number, number]> = [[92, 96, 1.6], [144, 90, 1.8], [160, 84, 1.6], [130, 88, 1.4], [106, 82, 1.5], [180, 56, 1.4], [148, 70, 1.5], [170, 76, 1.3]];

/** A faceted ice crystal standing on x, y, leaning back by `t`: outline, dark facet, lit crown, bright edge. */
function crystal(x: number, y: number, h: number, w: number, t: number): { d: string; dark: string; crown: string; edge: string } {
  const tx = f(x - t * h);
  const ty = f(y - h);
  const lx = f(x - w - t * h * 0.5);
  const ly = f(y - h * 0.5);
  const rx = f(x + w - t * h * 0.62);
  const ry = f(y - h * 0.62);
  const mx = f(x + w * 0.15 - t * h * 0.56);
  const my = f(y - h * 0.56);
  return {
    d: `M${f(x - w)} ${f(y)} L${lx} ${ly} L${tx} ${ty} L${rx} ${ry} L${f(x + w)} ${f(y)}Z`,
    dark: `M${f(x - w)} ${f(y)} L${lx} ${ly} L${tx} ${ty} L${mx} ${my} L${f(x + w * 0.15)} ${f(y)}Z`,
    crown: `M${mx} ${my} L${tx} ${ty} L${rx} ${ry}Z`,
    edge: `M${rx} ${ry} L${tx} ${ty}`,
  };
}

/** A little six-armed snowflake as one path. */
const flake = (x: number, y: number, r: number): string => {
  const a = r * 0.5;
  const b = r * 0.87;
  return `M${f(x - r)} ${y} L${f(x + r)} ${y} M${f(x - a)} ${f(y - b)} L${f(x + a)} ${f(y + b)} M${f(x - a)} ${f(y + b)} L${f(x + a)} ${f(y - b)}`;
};

function draw(c: Ctx): Parts {
  const { p, A, line, shade, light, rim, SW, id } = c;
  const ice = p.accent;
  const iceDk = mix(p.accent, p.wing, 0.6);
  const iceHi = lt(p.accent, 0.75);
  // Babies have shorter necks: the head sits lower.
  const dy = c.stage === 'hatchling' ? 12 : c.stage === 'young' ? 6 : 0;
  // The neck's front edge tucks in on babies so their big heads never poke past the chest.
  const nr = c.stage === 'hatchling' ? 190 : c.stage === 'young' ? 193 : 196;
  const NECK = `M172 62 C170 50 173 ${f(40 + dy * 0.5)} 181 ${26 + dy} L199 ${30 + dy} C195 ${f(40 + dy * 0.6)} ${nr + 1} 54 ${nr} 66Z`;
  // Babies get a short, rounder snout; everything on the snout shifts back by sn.
  const sn = c.stage === 'hatchling' ? -7 : 0;
  const HEAD = sn ? 'M178 25 C177 14 186 7 198 7 C208 7 216 11 222 16 C229 21 231 28 226 32 L210 37 L192 38 C184 37 178 32 178 25Z' : 'M178 25 C177 15 185 7 197 7 L212 10 L231 20 C237 23 238 29 233 32 L214 37 L192 38 C184 37 178 32 178 25Z';
  const defs = `<clipPath id="${id}B"><path d="${BODY}"/></clipPath><clipPath id="${id}H"><path d="${HEAD}"/></clipPath><clipPath id="${id}N"><path d="${NECK}"/></clipPath><clipPath id="${id}T"><path d="${TAIL}"/></clipPath><clipPath id="${id}W"><path d="${WING}"/></clipPath><clipPath id="${id}L"><path d="${BELLY}"/></clipPath><clipPath id="${id}Th"><path d="${THIGH}"/></clipPath><clipPath id="${id}rim"><path d="M60 40 L168 22 L178 40 L150 60 L124 70 L84 82 L60 100Z"/></clipPath>
<linearGradient id="${id}w" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${p.wing}"/><stop offset="1" stop-color="${lt(p.wing, 0.3)}"/></linearGradient>`;

  // Wings: membrane, faceted ice panels, shadow band, frost edge with crystal shards, bones, arm.
  const wing = (back: boolean): string => {
    const wr = c.r;
    let s = `<path d="${WING}" fill="${back ? dk(p.wing, 0.22) : `url(#${id}w)`}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${id}W)">`;
    for (const [d, k] of c.fine ? FACETS : FACETS.slice(0, 4)) s += `<path d="${d}" fill="${k > 0 ? lt(p.wing, k) : dk(p.wing, -k)}" opacity="${back ? 0.5 : 0.85}"/>`;
    s += `<path d="M-84 -14 L12 -10 L12 12 L-84 12Z" fill="${dk(p.wing, 0.32)}" opacity="${back ? 0.25 : 0.45}"/>`;
    if (c.fine) {
      s += `<path d="M-6 -56 L-45 -56 M-6 -56 L-55 -40 M-30 -18 L-60 -21 M-30 -18 L-6 -56" stroke="${lt(p.wing, 0.5)}" stroke-width="0.7" fill="none" opacity="0.6"/>`;
      for (let i = 0; i < 6; i++) s += `<path d="M${f(-60 + wr() * 40)} ${f(-46 + wr() * 40)} l1.6 -1.6 l1.6 1.6 l-1.6 1.6z" fill="${iceHi}" opacity="0.55"/>`;
    }
    if (c.portrait && !back) {
      // Close up, frost ferns creep in from the edge and tiny sparkles catch the light.
      for (let i = 0; i < 8; i++) {
        const x = -62 + i * 4;
        const y = -50 + i * 6;
        s += `<path d="M${f(x)} ${f(y)} l6 2 M${f(x + 2)} ${f(y + 0.6)} l1 -2.4 M${f(x + 4)} ${f(y + 1.3)} l1 2.4" stroke="${iceHi}" stroke-width="0.6" fill="none" opacity="0.7"/>`;
      }
      for (let i = 0; i < 12; i++) s += `<circle cx="${f(-62 + wr() * 56)}" cy="${f(-54 + wr() * 50)}" r="${f(0.4 + wr() * 0.7)}" fill="#fff" opacity="0.8"/>`;
    }
    s += `</g>`;
    s += `<path d="${EDGE}" stroke="${lt(ice, 0.5)}" stroke-width="1.4" fill="none" opacity="0.9" stroke-linejoin="round" stroke-linecap="round"/>`;
    s += `<path d="${BONES}" stroke="${back ? line : dk(p.wing, 0.45)}" stroke-width="${f(SW * 0.9)}" stroke-linecap="round" fill="none"/>`;
    if (c.fine) s += `<path d="M-6 -56 L-48 -65 M-6 -56 L-62 -48" stroke="${lt(p.wing, 0.4)}" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    // Ice shards at each finger tip.
    if (c.fine) for (const [x, y] of TIPS) {
      const len = Math.hypot(x + 6, y + 56) || 1;
      const ux = (x + 6) / len;
      const uy = (y + 56) / len;
      const ex = f(x + ux * 8);
      const ey = f(y + uy * 8);
      const mx = x + ux * 3;
      const my = y + uy * 3;
      s += `<path d="M${x} ${y} L${f(mx - uy * 2.4)} ${f(my + ux * 2.4)} L${ex} ${ey} L${f(mx + uy * 2.4)} ${f(my - ux * 2.4)}Z" fill="${ice}" stroke="${line}" stroke-width="0.8" stroke-linejoin="round"/>`;
      if (c.fine) s += `<path d="M${x} ${y} L${f(mx + uy * 2.4)} ${f(my - ux * 2.4)} L${ex} ${ey}Z" fill="${iceDk}"/>`;
    }
    s += `<path d="M0 0 C4 -20 2 -42 -6 -56" stroke="${line}" stroke-width="${f(SW * 1.7)}" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M2 -6 C5 -24 3 -40 -4 -52" stroke="${light}" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    s += `<path d="M-6 -56 l1 -8 l4 7z" fill="${ice}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
    return s;
  };

  // Back crystals: outline, dark facet, lit crown, and the bright edges in one glowing group.
  let back = '';
  let edges = '';
  BACK.forEach(([x, y], i) => {
    const h = SPINES[i] * A.spine + 3;
    const w = 3.6 + SPINES[i] * 0.05;
    const k = crystal(x, y + 4, h, w, 0.28);
    back += `<path d="${k.d}" fill="${ice}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/><path d="${k.dark}" fill="${iceDk}"/>`;
    if (c.fine) back += `<path d="${k.crown}" fill="${iceHi}" opacity="0.8"/>`;
    edges += `<path d="${k.edge}" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none"/>`;
    if (c.portrait) {
      // Close up, a second facet line and a sparkle on the tallest crystals, and small shards between.
      back += `<path d="M${f(x + w * 0.15)} ${f(y + 4)} L${f(x + w * 0.15 - 0.28 * h * 0.56)} ${f(y + 4 - h * 0.56)}" stroke="${dk(iceDk, 0.2)}" stroke-width="0.6" opacity="0.7"/>`;
      const next = BACK[i + 1];
      if (next) {
        const s2 = crystal((x + next[0]) / 2, (y + next[1]) / 2 + 4, h * 0.42, 2.2, 0.3);
        back += `<path d="${s2.d}" fill="${dk(ice, 0.06)}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/><path d="${s2.dark}" fill="${dk(iceDk, 0.1)}"/>`;
      }
      if (SPINES[i] > 20) edges += star4(f(x - 0.28 * h), f(y + 4 - h), 2.6, '#fff');
    }
  });
  back += c.glow(edges);

  // Tail: slender, cel shaded, ridge scales, small crystals and the diamond tip.
  let tail = '';
  for (const [x, y, h] of [[-12, -15, 7], [-26, -11, 6], [-40, -4, 5], [-54, 4, 4], [-67, 9, 3]]) {
    const k = crystal(x, y + 3, h * A.spine + 3, 2.6, 0.3);
    tail += `<path d="${k.d}" fill="${ice}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>`;
    if (c.fine) tail += `<path d="${k.dark}" fill="${iceDk}"/>`;
  }
  tail += `<path d="${TAIL}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  tail += `<g clip-path="url(#${id}T)"><path d="M10 2 C-16 0 -40 6 -60 16 L-90 18 L-90 40 L10 40Z" fill="${shade}"/><path d="M6 -12 C-14 -13 -32 -6 -46 2 L-44 -2 C-32 -9 -14 -14 6 -10Z" fill="${light}"/>`;
  if (c.fine) {
    const n = c.portrait ? 24 : 14;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      tail += `<path d="M${f(4 - t * 84)} ${f(-6 + t * 16 + (i % 2) * 3)} l2.2 -1.8 l2.2 1.8 l-2.2 1.8z" fill="${shade}" opacity="0.4"/>`;
    }
  }
  if (c.portrait) for (let i = 0; i < 14; i++) tail += `<circle cx="${f(-4 - c.r() * 76)}" cy="${f(-6 + i * 0.9 + c.r() * 6)}" r="${f(0.4 + c.r() * 0.5)}" fill="${iceHi}" opacity="0.75"/>`;
  tail += `</g>`;
  tail += `<path d="M4 6 C-16 4 -32 8 -46 14" stroke="${p.belly}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const gem =
    `<path d="M2 0 L-10 -10 L-22 0 L-10 10Z" fill="${ice}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M-10 -10 L-22 0 L-10 10 L-7 0Z" fill="${iceDk}"/><path d="M-10 -10 L-7 0 L2 0Z" fill="${iceHi}"/>` +
    `<path d="M-10 -10 L2 0" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>` +
    (c.portrait ? `<path d="M-7 0 L-10 10 M-7 0 L-22 0" stroke="${dk(iceDk, 0.2)}" stroke-width="0.6" opacity="0.7"/>${star4(-11, -9, 3, '#fff')}` : '');
  tail += `<g transform="translate(-84 12) rotate(12)">${c.glow(gem)}</g>`;

  // Body: base, shadow, light, scales, markings, frost flakes, rim light, belly plates.
  let body = `<path d="${BODY}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 1.1)}" stroke-linejoin="round"/>`;
  body += `<g clip-path="url(#${id}B)">`;
  body += `<path d="M66 102 C96 100 128 104 152 96 C170 90 182 80 188 64 L192 40 L210 40 L210 130 L66 130Z" fill="${shade}"/>`;
  body += `<path d="M82 88 C90 81 104 79 120 77 C136 75 150 70 160 62 C165 57 168 52 171 46 L176 47 C171 58 162 68 148 74 C128 80 104 81 84 92Z" fill="${light}"/>`;
  if (c.fine) {
    const step = c.portrait ? 4.5 : 6;
    for (let y = 76; y < 100; y += step) {
      for (let x = 86 + (Math.round(y / step) % 2) * 3.5; x < 186; x += c.portrait ? 6 : 8) {
        const top = 74 + (x > 140 ? -(x - 140) * 0.75 : 0) + (x < 100 ? (100 - x) * 0.6 : 0);
        if (y < top + 3 || x > 150 + (100 - y) * 0.5 + 30) continue;
        body += `<path d="M${f(x)} ${f(y)} l2.6 -2 l2.6 2 l-2.6 2z" fill="${y > 92 ? line : shade}" opacity="${y > 92 ? 0.12 : 0.28}"/>`;
      }
    }
  }
  body += c.marks(BODY);
  // Rime pattern: frost snowflakes and specks on the flank.
  const flakes = c.portrait ? [...FLAKES, ...MORE_FLAKES] : c.fine ? FLAKES : FLAKES.slice(0, 4);
  body += `<path d="${flakes.map(([x, y, r]) => flake(x, y, r)).join(' ')}" stroke="${lt(ice, 0.6)}" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="0.85"/>`;
  if (c.fine) for (const [x, y, r] of flakes) body += `<circle cx="${x}" cy="${y}" r="${f(r * 0.35)}" fill="#fff" opacity="0.8"/>`;
  if (c.portrait) for (let i = 0; i < 26; i++) body += `<circle cx="${f(88 + c.r() * 96)}" cy="${f(78 + c.r() * 22)}" r="${f(0.4 + c.r() * 0.6)}" fill="${iceHi}" opacity="0.7"/>`;
  body += `</g>`;
  body += `<path d="${BODY}" fill="none" stroke="${rim}" stroke-width="3" opacity="0.85" clip-path="url(#${id}rim)"/>`;
  body += `<path d="${BELLY}" fill="${p.belly}"/><g clip-path="url(#${id}L)">`;
  body += `<path d="M88 109 C112 115 140 114 158 106 C162 114 140 122 108 119Z" fill="${dk(p.belly, 0.2)}"/>`;
  // Ventral plates run along the chest and up the front of the neck.
  const plates: Array<[number, number, number, number]> = [[100, 104, 100, 118], [112, 106, 112, 118], [124, 106, 124, 118], [136, 104, 137, 117], [148, 100, 150, 114], [158, 95, 162, 109], [167, 88, 172, 101], [174, 80, 180, 92], [180, 71, 187, 82], [184, 62, 192, 71]];
  for (const [x1, y1, x2, y2] of plates) {
    if (c.fine) body += `<path d="M${x1} ${y1} Q${f((x1 + x2) / 2 + 3)} ${f((y1 + y2) / 2)} ${x2} ${y2}" stroke="${ice}" stroke-width="2.4" fill="none" opacity="0.45" stroke-linecap="round"/>`;
    body += `<path d="M${x1} ${y1} Q${f((x1 + x2) / 2 + 3)} ${f((y1 + y2) / 2)} ${x2} ${y2}" stroke="${dk(p.belly, 0.4)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    if (c.portrait) body += `<path d="M${x1 + 3} ${y1 + 2} Q${f((x1 + x2) / 2 + 5)} ${f((y1 + y2) / 2)} ${x2 + 2} ${y2 - 2}" stroke="${lt(p.belly, 0.6)}" stroke-width="0.7" fill="none" opacity="0.8" stroke-linecap="round"/>`;
  }
  body += `<path d="M94 108 C114 113 136 112 152 105" stroke="${lt(p.belly, 0.6)}" stroke-width="1.2" fill="none" opacity="0.8" stroke-linecap="round"/></g>`;

  // Legs: long and slim, standing tall.
  let legs = `<path d="${THIGH}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.9)}"/>`;
  legs += `<path d="M88 110 C94 118 104 116 110 104 L112 122 L82 122Z" fill="${shade}" clip-path="url(#${id}Th)"/><path d="M92 97 C97 93 103 93 106 97 C100 96 96 97 92 100Z" fill="${light}"/>`;
  if (c.fine) legs += `<path d="M94 102 l3.4 -1.8 l3.4 1.8 l-3.4 1.8z M100 108 l3.4 -1.8 l3.4 1.8 l-3.4 1.8z" fill="${shade}" opacity="0.5"/>`;
  if (c.portrait) for (let i = 0; i < 6; i++) legs += `<path d="M${f(90 + (i % 3) * 5)} ${f(105 + Math.floor(i / 3) * 5)} l2.2 -1.6 l2.2 1.6 l-2.2 1.6z" fill="${shade}" opacity="0.45"/>`;
  legs += `<path d="${FOOT}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
  legs += `<path d="${ARM}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/><path d="M165 100 C166 107 168 112 171 115" stroke="${shade}" stroke-width="1.8" fill="none" opacity="0.6"/>`;
  legs += `<path d="M164 99 l-3 -4 l5 1z" fill="${ice}" stroke="${line}" stroke-width="0.8" stroke-linejoin="round"/>`;
  legs += `<g fill="#fffdf5" stroke="${line}" stroke-width="0.8" stroke-linejoin="round">${CLAWS.map(([x, y, k]) => `<path d="M${x} ${y} l${f(3 * k)} 0.6 l${f(-1.7 * k)} 2.4z"/>`).join('')}</g>`;
  if (c.portrait) legs += `<g fill="${dk(p.belly, 0.25)}">${CLAWS.map(([x, y, k]) => `<path d="M${f(x + 1.3 * k)} ${f(y + 0.3)} l${f(1.7 * k)} 0.3 l${f(-1.5 * k)} 2.1z"/>`).join('')}</g>`;

  // Head: upper neck with its own crystals, then (raised by the neck) horns, skull,
  // icicle beard, cel bands, brow, smile, frost puff and eye.
  let head = '';
  for (const [x, y, h] of [[174, 46, 9], [175, 38 + dy * 0.6, 8], [177, 31 + dy * 0.8, 6]]) {
    const k = crystal(x, y, h * A.spine + 2.5, 2.6, 0.45);
    head += `<path d="${k.d}" fill="${ice}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>`;
    if (c.fine) head += `<path d="${k.dark}" fill="${iceDk}"/>`;
    if (c.fine) head += `<path d="${k.edge}" stroke="#fff" stroke-width="1" stroke-linecap="round"/>`;
  }
  head += `<path d="${NECK}" fill="${p.body}"/>`;
  head += `<g clip-path="url(#${id}N)"><path d="M189 66 C186 54 188 ${40 + dy} 194 ${28 + dy} L212 ${28 + dy} L212 70Z" fill="${shade}"/><path d="M172 62 C171 50 174 ${40 + dy * 0.5} 181 ${26 + dy} L185 ${27 + dy} C179 ${40 + dy * 0.5} 177 50 177 62Z" fill="${light}"/>`;
  head += `<path d="M199 ${30 + dy} C195 ${f(40 + dy * 0.6)} ${nr + 1} 54 ${nr} 66 L${nr - 8} 66 C${nr - 9} 54 189 ${f(42 + dy * 0.6)} 192 ${29 + dy}Z" fill="${p.belly}"/>`;
  for (let i = 0; i < 4; i++) {
    const y = 60 - i * (8 - dy * 0.12);
    head += `<path d="M${f(189.5 - i * 0.4)} ${f(y)} Q${f(193 - i * 0.3)} ${f(y + 1.5)} ${f(196 - i * 0.6)} ${f(y - 0.5)}" stroke="${dk(p.belly, 0.4)}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  }
  if (c.fine) for (let i = 0; i < (c.portrait ? 6 : 3); i++) head += `<path d="M${f(180 + (i % 2) * 4)} ${f(50 - i * (c.portrait ? 3.6 : 6))} l2.2 -1.8 l2.2 1.8 l-2.2 1.8z" fill="${shade}" opacity="0.35"/>`;
  head += `</g>`;
  head += `<path d="M172 62 C170 50 173 ${f(40 + dy * 0.5)} 181 ${26 + dy}" stroke="${line}" stroke-width="${SW}" fill="none" stroke-linecap="round"/><path d="M199 ${30 + dy} C195 ${f(40 + dy * 0.6)} ${nr + 1} ${54 - dy * 0.3} ${f(nr + dy * 0.1)} ${66 - dy}" stroke="${line}" stroke-width="${SW}" fill="none" stroke-linecap="round"/>`;
  head += `<path d="M175 ${36 + dy * 0.6} C174 46 174 54 176 60" stroke="${rim}" stroke-width="1.6" fill="none" opacity="0.7" stroke-linecap="round"/>`;

  let hd = '';
  let hornGlow = '';
  // Crystal horns: nubs on babies, tall faceted spires on adults.
  const g = c.stage === 'adult' ? 1 : c.stage === 'young' ? 0.7 : 0.32;
  for (const [x, y, h, w, t] of [[186, 11, 18, 4, 0.75], [195, 8.5, 13, 3, 0.45]]) {
    const k = crystal(x, y, h * g + 3, w, t);
    hd += `<path d="${k.d}" fill="${ice}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/><path d="${k.dark}" fill="${iceDk}"/>`;
    if (c.fine) hd += `<path d="${k.crown}" fill="${iceHi}" opacity="0.85"/>`;
    hornGlow += `<path d="${k.edge}" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>`;
    if (c.portrait) hd += `<path d="M${f(x - w * 0.5)} ${f(y - 2)} l${f(-t * 4)} -4" stroke="${line}" stroke-width="0.6" opacity="0.5"/>`;
  }
  hd += c.glow(hornGlow);
  // Icicle beard under the jaw.
  for (const [x, y, h] of [[184, 33, 7], [190.5, 36.5, 9], [197, 38, 6.5], [203, 38, 4.5]]) {
    const L = h * (0.6 + A.spine * 0.4);
    hd += `<path d="M${x - 3} ${y} L${f(x - 1)} ${f(y + L)} L${x + 3} ${y}Z" fill="${ice}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>`;
    if (c.fine) hd += `<path d="M${x - 3} ${y} L${f(x - 1)} ${f(y + L)} L${f(x - 0.4)} ${y}Z" fill="${iceDk}"/>`;
  }
  hd += `<path d="${HEAD}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  hd += `<g clip-path="url(#${id}H)"><path d="M176 31 L196 31 L214 30 L238 26 L238 42 L176 42Z" fill="${shade}"/><path d="M181 22 C183 14 190 10 198 10 L211 13 L208 15 L197 13 C190 13 186 17 184 23Z" fill="${light}"/><path d="M${214 + sn} ${14 - sn * 0.2} L${229 + sn} 21 L${228 + sn} 23 L${213 + sn} 16Z" fill="${light}"/>`;
  // Angular facet lines on the snout.
  hd += `<path d="M206 16 L${220 + sn} 26 L${232 + sn} 26" stroke="${shade}" stroke-width="1" fill="none" opacity="0.5"/>`;
  if (c.fine) for (let i = 0; i < (c.portrait ? 8 : 4); i++) hd += `<path d="M${f(184 + i * (c.portrait ? 4 : 7))} ${f(33 - (i % 2) * 2)} l2.2 -1.8 l2.2 1.8 l-2.2 1.8z" fill="${shade}" opacity="0.4"/>`;
  if (c.portrait) for (let i = 0; i < 10; i++) hd += `<circle cx="${f(182 + c.r() * 44)}" cy="${f(13 + c.r() * 14)}" r="${f(0.4 + c.r() * 0.5)}" fill="${iceHi}" opacity="0.7"/>`;
  hd += `</g>`;
  hd += `<path d="M200 35 L${214 + sn} 35 L${231 + sn} 30.5 C${226 + sn} 36 ${214 + sn} 39.5 203 39Z" fill="${p.belly}"/>`;
  hd += `<path d="M205 34.5 C${214 + sn * 0.5} 35.5 ${223 + sn} 34 ${231 + sn} 29.5" stroke="${line}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  hd += `<path d="M${216 + sn * 0.5} 35 l1.4 2.8 l1.4 -3z" fill="#fff" stroke="${line}" stroke-width="0.4"/>`;
  hd += `<path d="M${228 + sn} 23 l3 -1 l0.6 1.8z" fill="${line}"/>`;
  if (c.fine) hd += `<g class="cel-puff">${star4(237 + sn, 18, 2.4, lt(ice, 0.5))}<circle cx="${240 + sn}" cy="14.5" r="1.2" fill="#fff" opacity="0.85"/>${star4(242.5 + sn, 19.5, 1.5, '#fff')}</g>`;
  hd += `<ellipse cx="${208 + sn * 0.3}" cy="29" rx="3.6" ry="2" fill="#ff8fab" opacity="0.45"/>`;
  hd += celEye(c, 197, 22, mix(p.wing, '#1864ab', 0.35));
  // Calm, angular brow.
  hd += `<path d="M187 ${f(19 - A.eye)} L196 ${f(15 - A.eye)} L206 ${f(17 - A.eye)}" stroke="${line}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  head += dy ? `<g transform="translate(0 ${dy})">${hd}</g>` : hd;

  return {
    defs,
    wing,
    farLeg: `<path d="${FARLEG}" fill="${dk(p.body, 0.3)}" stroke="${line}" stroke-width="${f(SW * 0.8)}" stroke-linejoin="round"/>`,
    tail,
    back,
    body,
    legs,
    head,
  };
}

export const FROSTSPINE: TribeArt = { draw, crown: { hatchling: [-3, -8], young: [-1, -14], adult: [0, -20] } };
