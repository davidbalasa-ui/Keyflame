// Mossclaw: a stocky, round forest dragon with a high hump, thick neck and short
// blunt snout. Leaf plates on the back, leafy frills down the neck, moss on the
// shoulders and hips, big clawed forearms, broad leaf wings and a leaf tail tip.

import { celEye, dk, f, lt, mix, type Ctx, type Parts, type TribeArt } from './cel';

const BODY = 'M72 98 C66 70 90 44 122 44 C146 44 160 40 170 34 C178 29 188 28 196 34 L206 54 C202 68 196 84 188 96 C178 114 154 124 124 124 C96 124 74 118 72 98Z';
const BELLY = 'M94 114 C118 122 150 120 168 108 C182 98 192 82 198 64 L206 66 C204 86 194 104 178 116 C156 130 112 128 94 114Z';
const TAIL = 'M8 -22 C-12 -26 -32 -16 -44 -4 C-52 4 -60 8 -68 7 C-62 20 -46 24 -34 16 C-22 8 -8 10 8 16Z';
const HEAD = 'M174 42 C173 27 187 17 204 18 C218 19 229 27 233 37 C236 46 233 55 225 58 C214 62 199 63 188 61 C178 59 175 51 174 42Z';
const WING = 'M0 0 C6 -16 4 -36 -4 -50 Q-14 -67 -32 -65 Q-49 -65 -51 -50 Q-62 -40 -53 -28 Q-56 -13 -40 -12 Q-28 -1 -16 -2Z';
const EDGE = 'M-4 -50 Q-14 -67 -32 -65 Q-49 -65 -51 -50 Q-62 -40 -53 -28 Q-56 -13 -40 -12 Q-28 -1 -16 -2';
const RIB = 'M-3 -4 Q-18 -28 -40 -57';
const THIGH = 'M80 100 C70 112 76 128 94 129 C110 130 122 120 119 104 C115 90 92 88 80 100Z';
const FOOT = 'M96 118 C91 124 91 130 95 133 L117 133 C122 131 121 125 116 123 C110 121 105 120 102 114Z';
const ARM = 'M152 94 C149 108 154 120 162 126 C168 133 184 133 189 127 C192 121 186 116 178 116 C173 110 171 101 170 90Z';
const FARARM = 'M136 100 C134 112 138 122 145 127 C151 132 162 131 163 126 C164 122 158 119 152 118 C150 112 150 104 150 98Z';
const CLAWS: Array<[number, number]> = [[188, 119], [190, 125], [186, 130], [116, 124], [119, 129]];
// Leaf plates along the hump, and the frill leaves down the neck: x, y, length, angle.
const PLATES: Array<[number, number, number, number]> = [[75, 78, 20, -74], [83, 63, 25, -54], [96, 53, 27, -38], [111, 47, 28, -24], [126, 45, 26, -14], [140, 45, 22, -6]];
const FRILLS: Array<[number, number, number, number]> = [[150, 44, 15, -60], [157, 41, 16, -52], [164, 38, 16, -44], [170, 34, 15, -36], [176, 31, 13, -28]];
// The leafy ruff lying back over the neck, just behind the head.
const RUFF: Array<[number, number, number, number]> = [[176, 40, 22, -74], [178, 51, 25, -90], [180, 62, 24, -105], [181, 73, 20, -120]];
const MOSS = 'M-9 2 C-12 -2 -9 -6 -5 -5 C-4 -9 1 -10 3 -6 C6 -9 11 -6 10 -2 C13 0 11 4 8 4 L-7 4 C-10 4 -11 3 -9 2Z';

/** Maps leaf space (stem at 0,0, tip up) to world space at x, y, tilted by a degrees. */
function leafPts(x: number, y: number, a: number): (lx: number, ly: number) => string {
  const r = (a * Math.PI) / 180;
  const cs = Math.cos(r);
  const sn = Math.sin(r);
  return (lx, ly) => `${f(x + lx * cs - ly * sn)} ${f(y + lx * sn + ly * cs)}`;
}
/** A leaf from its stem at x, y: length L, half width w, tilted by a degrees (0 points up). */
const leaf = (x: number, y: number, L: number, w: number, a: number): string => {
  const P = leafPts(x, y, a);
  return `M${P(0, 0)} C${P(w, -L * 0.25)} ${P(w * 0.85, -L * 0.7)} ${P(0, -L)} C${P(-w * 0.85, -L * 0.7)} ${P(-w, -L * 0.25)} ${P(0, 0)}Z`;
};
/** The shadowed half of a leaf (the side away from the light). */
const leafHalf = (x: number, y: number, L: number, w: number, a: number): string => {
  const P = leafPts(x, y, a);
  return `M${P(0, 0)} C${P(w, -L * 0.25)} ${P(w * 0.85, -L * 0.7)} ${P(0, -L)} Q${P(w * 0.15, -L * 0.5)} ${P(0, 0)}Z`;
};
/** Midrib, plus side veins when `side` is set. */
const veins = (x: number, y: number, L: number, w: number, a: number, side: boolean): string => {
  const P = leafPts(x, y, a);
  let d = `M${P(0, -L * 0.08)} Q${P(w * 0.15, -L * 0.5)} ${P(0, -L * 0.86)}`;
  if (side) for (const t of [0.3, 0.5, 0.68]) d += ` M${P(w * 0.06, -L * t)} L${P(w * 0.62, -L * (t + 0.14))} M${P(w * 0.02, -L * t)} L${P(-w * 0.62, -L * (t + 0.14))}`;
  return d;
};

function draw(c: Ctx): Parts {
  const { p, A, line, shade, light, rim, SW, id } = c;
  const plate = mix(p.belly, p.wing, 0.35);
  const moss = mix(p.belly, '#5c940d', 0.45);
  const twig = mix(dk(p.belly, 0.45), '#6b4423', 0.5);
  const vein = lt(p.accent, 0.35);
  const defs = `<clipPath id="${id}B"><path d="${BODY}"/></clipPath><clipPath id="${id}H"><path d="${HEAD}"/></clipPath><clipPath id="${id}T"><path d="${TAIL}"/></clipPath><clipPath id="${id}W"><path d="${WING}"/></clipPath><clipPath id="${id}Th"><path d="${THIGH}"/></clipPath><clipPath id="${id}A"><path d="${ARM}"/></clipPath><clipPath id="${id}rim"><ellipse cx="118" cy="40" rx="74" ry="16"/></clipPath>
<linearGradient id="${id}w" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${p.wing}"/><stop offset="1" stop-color="${lt(p.wing, 0.3)}"/></linearGradient>`;

  // A moss tuft: lumpy top, shaded underside, a few lit specks.
  const tuft = (x: number, y: number, k: number): string =>
    `<g transform="translate(${x} ${y}) scale(${k})"><path d="${MOSS}" fill="${moss}" stroke="${line}" stroke-width="${f(1.1 / k)}"/><path d="M-8.6 2.4 C-3 0 4 0 10.4 1 C10.6 3.4 9.4 4 8 4 L-7 4Z" fill="${dk(moss, 0.25)}"/>${c.fine ? `<path d="M-4 -3 h0.1 M2 -5 h0.1 M6 -2 h0.1" stroke="${lt(moss, 0.4)}" stroke-width="1.6" stroke-linecap="round"/>` : ''}</g>`;

  // One leaf: base, shadowed half, light sliver, midrib.
  const leafy = (x: number, y: number, L: number, w: number, a: number, fill: string, sw = 1.3, side = c.fine): string => {
    let s = `<path d="${leaf(x, y, L, w, a)}" fill="${fill}" stroke="${line}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    s += `<path d="${leafHalf(x, y, L, w, a)}" fill="${dk(fill, 0.25)}"/>`;
    s += `<path d="${veins(x, y, L, w, a, side)}" stroke="${dk(fill, 0.4)}" stroke-width="${f(sw * 0.6)}" fill="none" stroke-linecap="round"/>`;
    return s;
  };

  // Wings: a broad rounded leaf on a strong arm, with leaf veins for fingers.
  const wing = (back: boolean): string => {
    const wr = c.r;
    let s = `<path d="${WING}" fill="${back ? dk(p.wing, 0.24) : `url(#${id}w)`}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${id}W)">`;
    s += `<path d="M-70 -42 Q-30 -22 14 -6 L14 14 L-70 14Z" fill="${dk(p.wing, 0.3)}" opacity="${back ? 0.25 : 0.5}"/>`;
    s += `<path d="M-4 -50 Q-14 -67 -32 -65 L-30 -61 Q-15 -61 -6 -44Z" fill="${lt(p.wing, 0.4)}"/>`;
    if (c.fine) for (let i = 0; i < 6; i++) s += `<ellipse cx="${f(-44 + wr() * 34)}" cy="${f(-54 + wr() * 40)}" rx="${f(1.4 + wr() * 1.8)}" ry="${f(1 + wr() * 1.2)}" fill="${lt(p.wing, 0.2)}" opacity="0.45"/>`;
    // Side veins off the midrib, finer ones close up.
    const n = c.portrait && !back ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      const x = f(-3 - 37 * t + 4 * t * (1 - t));
      const y = f(-4 - 53 * t);
      const L = 15 * (1 - t * 0.4);
      s += `<path d="M${x} ${y} q${f(L * 0.05)} ${f(-L * 0.3)} ${f(L * 0.3)} ${f(-L * 0.6)} M${x} ${y} q${f(-L * 0.5)} ${f(-L * 0.05)} ${f(-L)} ${f(L * 0.2)}" stroke="${dk(p.wing, back ? 0.45 : 0.38)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
      if (c.portrait && !back) s += `<path d="M${f(x + 0.8)} ${f(y - 0.6)} q${f(-L * 0.45)} ${f(-L * 0.1)} ${f(-L * 0.9)} ${f(L * 0.15)}" stroke="${lt(p.wing, 0.45)}" stroke-width="0.6" fill="none" opacity="0.7"/>`;
    }
    if (c.portrait && !back) for (let i = 0; i < 12; i++) s += `<circle cx="${f(-48 + wr() * 40)}" cy="${f(-58 + wr() * 48)}" r="${f(0.5 + wr() * 0.7)}" fill="${lt(p.accent, 0.4)}" opacity="0.6"/>`;
    s += `</g>`;
    s += `<path d="${EDGE}" stroke="${lt(p.wing, 0.5)}" stroke-width="1.3" fill="none" opacity="0.85" stroke-linecap="round"/>`;
    s += `<path d="${RIB}" stroke="${back ? line : dk(p.wing, 0.45)}" stroke-width="${f(SW * 0.9)}" stroke-linecap="round" fill="none"/>`;
    if (c.fine) s += `<path d="M-5 -6 Q-19 -29 -38 -55" stroke="${lt(p.wing, 0.4)}" stroke-width="0.8" fill="none" opacity="0.7" stroke-linecap="round"/>`;
    s += `<path d="M0 0 C6 -16 4 -36 -4 -50" stroke="${line}" stroke-width="${f(SW * 2.1)}" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M2 -6 C6 -20 4 -34 -2 -45" stroke="${light}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.75"/>`;
    s += `<circle cx="-4" cy="-50" r="2.6" fill="${p.belly}" stroke="${line}" stroke-width="1"/>`;
    // Stood up a little and kept short, so the leaf plates on the hump show.
    return `<g transform="rotate(9) scale(0.94)">${s}</g>`;
  };

  // Back: leaf plates on the hump, leafy frills down the neck, glowing veins.
  let back = '';
  let glow = '';
  PLATES.forEach(([x, y, L, a]) => {
    const h = L * (0.4 + 0.6 * A.spine);
    back += leafy(x, y + 3, h, h * 0.46, a, plate, 1.5);
    if (c.fine) glow += `<path d="${veins(x, y + 3, h, h * 0.46, a, false)}" stroke="${vein}" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  });
  FRILLS.forEach(([x, y, L, a], i) => {
    const h = L * (0.4 + 0.6 * A.spine);
    // A second, darker leaf peeks out behind each frill so they read as ruffled.
    back += `<path d="${leaf(x - 2, y + 2, h * 0.8, h * 0.3, a - 22)}" fill="${dk(p.accent, 0.3)}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>`;
    back += leafy(x, y + 3, h, h * 0.36, a, i % 2 ? p.accent : lt(p.accent, 0.15), 1.3, c.portrait);
  });
  if (c.portrait) {
    // Close up, little sprouts sit between the plates and fireflies drift over the back.
    PLATES.slice(0, -1).forEach(([x, y, L, a], i) => {
      const [nx, ny] = PLATES[i + 1];
      back += leafy((x + nx) / 2, (y + ny) / 2 + 4, L * 0.4 * A.spine + 3, L * 0.16, a + 12, lt(plate, 0.15), 0.9, false);
    });
    for (const [x, y, r] of [[96, 34, 1.8], [132, 30, 1.5], [70, 56, 1.6], [160, 24, 1.3], [112, 26, 1.1]]) glow += `<circle cx="${x}" cy="${y}" r="${f(r * 2.4)}" fill="${lt(p.accent, 0.5)}" opacity="0.3"/><circle cx="${x}" cy="${y}" r="${r}" fill="${lt(p.accent, 0.7)}"/>`;
  }
  back += c.glow(glow);

  // Tail: thick and short, shaded, bark grain, small leaves on top and a big leaf at the tip.
  let tail = `<path d="${TAIL}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  tail += `<g clip-path="url(#${id}T)"><path d="M10 4 C-14 2 -36 10 -52 22 L-52 40 L10 40Z" fill="${shade}"/><path d="M6 -14 C-12 -18 -28 -12 -40 -2 L-38 -7 C-28 -15 -12 -18 6 -12Z" fill="${light}"/>`;
  if (c.fine) {
    const n = c.portrait ? 20 : 12;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      tail += `<path d="M${f(4 - t * 60)} ${f(-12 + t * 18 + (i % 2) * 6)} q-3 1.4 -6 0.4" stroke="${shade}" stroke-width="1.1" fill="none" opacity="0.55" stroke-linecap="round"/>`;
    }
  }
  tail += `</g>`;
  tail += `<path d="M6 10 C-14 6 -28 10 -40 18" stroke="${p.belly}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
  for (const [x, y, L, a] of [[-12, -17, 9, -70], [-26, -13, 8, -66], [-39, -4, 7, -60]]) tail += leafy(x, y + 2, L * (0.5 + 0.5 * A.spine), L * 0.4, a, plate, 1.1, false);
  tail += tuft(-6, -17, 0.9);
  const tl = 36 * (0.7 + 0.3 * A.spine);
  tail += leafy(-64, 13, tl, tl * 0.44, -78, plate, 1.6, c.fine);
  if (c.fine) tail += `<path d="M-66 9 q-10 -6 -20 -4" stroke="${lt(plate, 0.5)}" stroke-width="1" fill="none" opacity="0.7" stroke-linecap="round"/>`;

  // Body: base, shadow, light, bark grain, markings, belly plates, rim light, moss.
  let body = `<path d="${BODY}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 1.1)}" stroke-linejoin="round"/>`;
  body += `<g clip-path="url(#${id}B)">`;
  body += `<path d="M64 102 C92 98 130 104 156 94 C172 86 186 72 210 58 L210 130 L64 130Z" fill="${shade}"/>`;
  body += `<path d="M76 84 C80 62 96 50 122 50 C144 50 158 46 168 40 C174 35 180 33 186 33 L190 36 C180 39 172 46 160 50 C146 58 126 57 106 57 C92 58 82 68 78 88Z" fill="${light}"/>`;
  if (c.fine) {
    // Bark grain: short curved strokes in staggered rows.
    const step = c.portrait ? 5 : 7;
    for (let y = 52; y < 112; y += step) {
      for (let x = 80 + ((y / step) % 2) * 4; x < 196; x += c.portrait ? 7 : 9) {
        const top = 44 + (x < 100 ? (100 - x) * 1.3 : 0) - (x > 150 ? (x - 150) * 0.4 : 0);
        if (y < top + 4 || (x > 186 && y > 80)) continue;
        body += `<path d="M${f(x)} ${y} q1.6 2.4 0 4.8" stroke="${y > 92 ? line : shade}" stroke-width="1.1" fill="none" opacity="${y > 92 ? 0.2 : 0.45}" stroke-linecap="round"/>`;
      }
    }
    if (c.portrait) for (let i = 0; i < 26; i++) body += `<circle cx="${f(84 + c.r() * 100)}" cy="${f(62 + c.r() * 36)}" r="${f(0.5 + c.r() * 0.6)}" fill="${light}" opacity="0.6"/>`;
  }
  body += c.marks(BODY);
  body += `<path d="${BELLY}" fill="${p.belly}"/>`;
  body += `<path d="M92 114 C118 122 152 120 170 108 C176 118 150 132 110 126Z" fill="${dk(p.belly, 0.22)}"/>`;
  [106, 120, 134, 148, 160, 171, 180, 188, 195].forEach((x, i) => {
    const y = 123 - i * 1.6 - (i > 3 ? (i - 3) * 6.4 : 0);
    body += `<path d="M${x} ${f(y - 9)} q3.4 4 1 10" stroke="${dk(p.belly, 0.42)}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    if (c.portrait) body += `<path d="M${x + 3} ${f(y - 7)} q2 3 1 6" stroke="${lt(p.belly, 0.6)}" stroke-width="0.8" fill="none" opacity="0.8" stroke-linecap="round"/>`;
  });
  body += `<path d="M98 113 C120 119 146 117 162 108" stroke="${lt(p.belly, 0.6)}" stroke-width="1.3" fill="none" opacity="0.8" stroke-linecap="round"/>`;
  body += `</g>`;
  body += `<path d="${BODY}" fill="none" stroke="${rim}" stroke-width="3" opacity="0.85" clip-path="url(#${id}rim)"/>`;
  // Moss tuft on the shoulder, under the wing.
  body += tuft(140, 62, 1.5);

  // Legs: round haunch with a moss tuft, chunky foot, big forearm and paw.
  let legs = `<path d="${THIGH}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.95)}"/>`;
  legs += `<path d="M74 112 C84 124 106 124 122 108 L122 132 L70 132Z" fill="${shade}" clip-path="url(#${id}Th)"/><path d="M84 100 C92 93 106 92 112 97 C102 96 92 98 84 105Z" fill="${light}"/>`;
  if (c.fine) for (let i = 0; i < (c.portrait ? 8 : 4); i++) legs += `<path d="M${f(90 + (i % 4) * 6)} ${f(106 + Math.floor(i / 4) * 6)} q1.4 2 0 4" stroke="${shade}" stroke-width="1" fill="none" opacity="0.6" stroke-linecap="round"/>`;
  legs += tuft(94, 98, 1.3);
  legs += `<path d="${FOOT}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.9)}" stroke-linejoin="round"/><path d="M95 129 L117 129 C120 130 120 132 117 133 L95 133Z" fill="${shade}" opacity="0.7"/>`;
  legs += `<path d="${ARM}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.95)}" stroke-linejoin="round"/>`;
  legs += `<g clip-path="url(#${id}A)"><path d="M146 112 C156 124 170 130 196 124 L196 140 L146 140Z" fill="${shade}"/><path d="M154 96 C153 104 155 110 158 114" stroke="${light}" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>`;
  if (c.fine) legs += `<path d="M178 120 q3 2 2 6 M173 121 q2 3 0 6" stroke="${line}" stroke-width="1" fill="none" opacity="0.5" stroke-linecap="round"/>`;
  // The neck ruff: leaves lying back over the neck.
  RUFF.forEach(([x, y, L, a], i) => {
    const h = L * (0.5 + 0.5 * A.spine);
    legs += `<path d="${leaf(x - 1, y + 4, h * 0.8, h * 0.34, a - 16)}" fill="${dk(p.accent, 0.3)}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>`;
    legs += leafy(x, y, h, h * 0.44, a, i % 2 ? p.accent : lt(p.accent, 0.18), 1.3, c.portrait);
  });
  legs += tuft(161, 92, 1.1);
  legs += `<g fill="#fffdf5" stroke="${line}" stroke-width="0.9" stroke-linejoin="round">${CLAWS.map(([x, y]) => `<path d="M${x} ${y - 2.4} q5 0.4 6 4.4 q-3.4 0.6 -6 -0.4z"/>`).join('')}</g>`;
  if (c.portrait) legs += `<g fill="${dk(p.belly, 0.25)}">${CLAWS.map(([x, y]) => `<path d="M${x + 2} ${y - 0.6} q2.6 0.6 3.6 2.4 q-2 0.2 -3.6 -0.2z"/>`).join('')}</g>`;

  // Head: twig horns, cel shading, brow, smile, snout, eye.
  let head = '';
  if (c.stage === 'hatchling') {
    head += `<path d="M186 24 c-2 -6 2 -9 6 -6 c1 2 0 5 -2 7z M196 21 c0 -6 5 -8 8 -4 c0 3 -2 5 -4 6z" fill="${twig}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`;
  } else {
    const g = c.stage === 'adult' ? 1 : 0.6;
    const twigD = `M188 23 C186 ${f(16 - 4 * g)} ${f(182 - 3 * g)} ${f(12 - 6 * g)} ${f(178 - 4 * g)} ${f(10 - 8 * g)} M${f(185 - g)} ${f(16 - 3 * g)} C${f(186 + g)} ${f(12 - 3 * g)} ${f(189 + 2 * g)} ${f(10 - 4 * g)} ${f(192 + 3 * g)} ${f(10 - 5 * g)} M198 20 C199 ${f(14 - 3 * g)} ${f(198 + g)} ${f(10 - 5 * g)} ${f(200 + 2 * g)} ${f(6 - 7 * g)}`;
    const extra = c.stage === 'adult' ? ` M199.6 9 C202 7 205 7 207 8 M181 6 C178 4 176 3 173 3` : '';
    head += `<path d="${twigD}${extra}" stroke="${line}" stroke-width="5.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    head += `<path d="${twigD}${extra}" stroke="${twig}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (c.fine) head += `<path d="M187 21 C185 16 183 12 ${f(180 - 4 * g)} ${f(11 - 8 * g)} M197 19 C198 14 198 ${f(10 - 3 * g)} ${f(199 + g)} ${f(7 - 6 * g)}" stroke="${lt(twig, 0.35)}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    if (c.stage === 'adult') head += leafy(207, 8, 8, 3.2, 70, p.accent, 1, false);
  }
  head += `<path d="${HEAD}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  head += `<g clip-path="url(#${id}H)"><path d="M170 52 C190 50 214 54 240 46 L240 66 L170 66Z" fill="${shade}"/><path d="M178 38 C183 28 194 23 206 23 C197 26 188 31 182 42Z" fill="${light}"/><path d="M216 24 C222 27 228 32 231 38 L229 40 C225 34 221 30 214 27Z" fill="${light}"/>`;
  if (c.fine) for (let i = 0; i < (c.portrait ? 9 : 5); i++) head += `<path d="M${f(182 + i * (c.portrait ? 4 : 6))} ${f(54 - (i % 2) * 2)} q1.4 2 0 4" stroke="${shade}" stroke-width="1" fill="none" opacity="0.6" stroke-linecap="round"/>`;
  head += `</g>`;
  head += `<path d="M187 31 C193 25 204 24 212 29 L209 32 C201 28 193 29 188 35Z" fill="${dk(p.body, 0.3)}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
  head += `<path d="M196 56 C208 57 220 55 229 51 C225 57 213 61 201 61Z" fill="${p.belly}"/>`;
  head += `<path d="M204 52 C210 56 220 55 228 49" stroke="${line}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  head += `<path d="M203 50.6 q-1 1.8 1 3" stroke="${line}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  head += `<ellipse cx="227" cy="37" rx="2.2" ry="1.5" fill="${line}"/>`;
  if (c.fine) head += `<g class="cel-puff"><circle cx="236" cy="33" r="1.6" fill="${lt(p.belly, 0.4)}" opacity="0.8"/><circle cx="239" cy="30" r="1.1" fill="${lt(p.accent, 0.3)}" opacity="0.7"/></g>`;
  if (c.fine) head += `<path d="M222 30 q3 -1 5 1" stroke="${light}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  if (c.portrait) for (let i = 0; i < 6; i++) head += `<circle cx="${f(214 + (i % 3) * 3.4)}" cy="${f(43 + Math.floor(i / 3) * 3)}" r="0.6" fill="${dk(p.body, 0.35)}" opacity="0.6"/>`;
  head += `<ellipse cx="212" cy="48" rx="4.2" ry="2.4" fill="#ff8fab" opacity="0.45"/>`;
  head += celEye(c, 199, 39, mix(p.accent, '#8a5a12', 0.35));
  head += `<path d="M190 ${f(37 - A.eye)} C196 ${f(33 - A.eye)} 203 ${f(33 - A.eye)} 209 ${f(36 - A.eye)}" stroke="${line}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;

  return {
    defs,
    wing,
    farLeg: `<path d="${FARARM}" fill="${dk(p.body, 0.3)}" stroke="${line}" stroke-width="${f(SW * 0.8)}" stroke-linejoin="round"/>`,
    tail,
    back,
    body,
    legs,
    head,
  };
}

export const MOSSCLAW: TribeArt = { draw, crown: { hatchling: [2, -2], young: [2, -2], adult: [2, -2] } };
