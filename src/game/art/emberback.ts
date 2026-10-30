// Emberback, the approved cel-shaded pilot: deep chest, short strong neck, heavy
// spined tail, lava cracks along the flank and an ember flame at the tail tip.

import { celEye, dk, f, lt, mix, spike, spikeHalf, type Ctx, type Parts, type TribeArt } from './cel';

const BODY = 'M74 95 C74 74 98 59 128 61 C147 61 158 57 166 49 C171 44 174 39 177 35 L199 52 C193 58 187 69 181 83 C173 102 152 114 124 114 C96 114 74 109 74 95Z';
const BELLY = 'M84 104 C104 112 136 112 154 103 C167 95 175 82 182 69 L190 72 C183 88 175 102 160 109 C138 119 104 118 84 104Z';
const TAIL = 'M6 -15 C-16 -20 -38 -12 -52 3 C-62 14 -74 20 -88 17 C-78 30 -60 31 -47 21 C-34 10 -16 7 6 11Z';
const HEAD = 'M172 44 C171 30 185 21 202 24 C212 26 221 31 228 36 C235 40 237 47 234 52 C231 57 223 60 214 60 C204 62 194 64 186 63 C176 62 170 55 172 44Z';
const WING = 'M0 0 C10 -22 6 -46 -6 -60 L-48 -67 Q-46 -48 -68 -42 Q-54 -30 -72 -15 Q-44 -12 -36 5Z';
const BONES = 'M-6 -60 L-48 -67 M-6 -60 L-68 -42 M-6 -60 L-72 -15';
const EDGE = 'M-48 -67 Q-46 -48 -68 -42 Q-54 -30 -72 -15 Q-44 -12 -36 5';
const THIGH = 'M92 94 C82 102 82 114 92 117 C102 120 112 113 112 101 C110 92 100 88 92 94Z';
const FOOT = 'M98 114 C94 120 88 123 80 124 L74 127 L78 122 L72 121 L80 118 C86 116 90 114 92 110Z';
const FARLEG = 'M100 101 C96 112 90 118 80 120 L72 123 L76 118 L70 117 L78 114 C86 110 90 104 92 98Z';
const ARM = 'M154 99 C158 108 163 112 170 112 L176 115 L173 110 L179 110 L172 106 C166 104 161 99 159 94Z';
const BACK: Array<[number, number]> = [[84, 77], [97, 68], [110, 64], [123, 62], [136, 61], [148, 59], [158, 54], [166, 47], [172, 40]];
const SPINES = [13, 18, 22, 24, 23, 20, 16, 13, 10];
const CLAWS: Array<[number, number, number]> = [[176, 115, 1], [179, 110, 1], [74, 127, -1], [72, 121, -1], [72, 123, -1], [70, 117, -1]];
const CRACKS = ['M98 86 l6 4 l-2 5 l7 3', 'M122 80 l5 5 l-3 4 l6 4 l-1 4', 'M150 74 l4 5 l-3 3 l5 4'];
const PORTRAIT_CRACKS = ['M108 96 l4 3 l-1 4', 'M136 90 l5 2 l-1 5 l4 3', 'M164 66 l3 4 l-2 3'];

function draw(c: Ctx): Parts {
  const { p, A, line, shade, light, rim, SW, id } = c;
  const hot = lt(p.accent, 0.6);
  const defs = `<clipPath id="${id}B"><path d="${BODY}"/></clipPath><clipPath id="${id}H"><path d="${HEAD}"/></clipPath><clipPath id="${id}T"><path d="${TAIL}"/></clipPath><clipPath id="${id}W"><path d="${WING}"/></clipPath><clipPath id="${id}L"><path d="${BELLY}"/></clipPath><clipPath id="${id}Th"><path d="${THIGH}"/></clipPath><clipPath id="${id}rim"><ellipse cx="116" cy="54" rx="72" ry="18"/></clipPath>
<linearGradient id="${id}w" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${p.wing}"/><stop offset="1" stop-color="${lt(p.wing, 0.28)}"/></linearGradient>`;

  // Wings: membrane, shadow band, lit leading panel, scorch spots, bones, arm.
  const wing = (back: boolean): string => {
    const wr = c.r;
    let s = `<path d="${WING}" fill="${back ? dk(p.wing, 0.22) : `url(#${id}w)`}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${id}W)">`;
    s += `<path d="M-84 -26 L12 -6 L12 12 L-84 12Z" fill="${dk(p.wing, 0.32)}" opacity="${back ? 0.25 : 0.5}"/>`;
    s += `<path d="M-6 -60 L-48 -67 L-42 -62 L-8 -55Z" fill="${lt(p.wing, 0.42)}"/>`;
    if (c.fine) for (let i = 0; i < 7; i++) s += `<ellipse cx="${f(-58 + wr() * 34)}" cy="${f(-50 + wr() * 50)}" rx="${f(1.4 + wr() * 2)}" ry="${f(1 + wr() * 1.4)}" fill="${dk(p.wing, 0.45)}" opacity="0.45"/>`;
    if (c.portrait && !back) {
      // Fine veins between the fingers and glowing embers caught on the skin.
      for (let i = 0; i < 9; i++) {
        const a = -64 + i * 7;
        s += `<path d="M${f(-10 - i * 2)} ${f(-56 + i * 5)} Q${f(-30 - i * 3)} ${f(a + 6)} ${f(-46 - i * 2.4)} ${f(a + 10)}" stroke="${dk(p.wing, 0.4)}" stroke-width="0.6" fill="none" opacity="0.5"/>`;
      }
      for (let i = 0; i < 14; i++) s += `<circle cx="${f(-64 + wr() * 60)}" cy="${f(-56 + wr() * 54)}" r="${f(0.5 + wr() * 0.8)}" fill="${lt(p.accent, 0.3)}" opacity="0.7"/>`;
    }
    s += `</g>`;
    s += `<path d="${EDGE}" stroke="${lt(p.wing, 0.5)}" stroke-width="1.2" fill="none" opacity="0.85" stroke-linecap="round"/>`;
    s += `<path d="${BONES}" stroke="${back ? line : dk(p.wing, 0.42)}" stroke-width="${SW}" stroke-linecap="round" fill="none"/>`;
    if (c.fine) s += `<path d="M-6 -60 L-46 -66 M-6 -60 L-66 -42" stroke="${lt(p.wing, 0.35)}" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    s += `<path d="M0 0 C10 -22 6 -46 -6 -60" stroke="${line}" stroke-width="${f(SW * 1.9)}" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M2 -6 C9 -24 6 -42 -4 -56" stroke="${light}" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    s += `<path d="M-6 -60 l2 -8 l3 8z" fill="${p.belly}" stroke="${line}" stroke-width="1"/>`;
    for (const [x, y] of [[-48, -67], [-68, -42], [-72, -15]]) s += `<circle cx="${x}" cy="${y}" r="1.6" fill="${p.belly}" stroke="${line}" stroke-width="0.7"/>`;
    return s;
  };

  // Back spines: base, shadowed half, hot core.
  let back = '';
  BACK.forEach(([x, y], i) => {
    const h = SPINES[i] * A.spine;
    back += `<path d="${spike(x, y + 3, h, 5.2)}" fill="${p.accent}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`;
    back += `<path d="${spikeHalf(x, y + 3, h, 5.2)}" fill="${dk(p.accent, 0.28)}"/>`;
    back += `<path d="${spike(x - 1, y + 2, h * 0.55, 2)}" fill="${hot}" opacity="0.9"/>`;
    if (c.portrait) back += `<path d="M${f(x - 3)} ${f(y + 1)} q-1 ${f(-h * 0.4)} -3 ${f(-h * 0.7)}" stroke="${lt(p.accent, 0.7)}" stroke-width="0.7" fill="none" opacity="0.8"/>`;
    // Close up, small spines sit between the big ones.
    const next = BACK[i + 1];
    if (c.portrait && next) {
      const mx = (x + next[0]) / 2;
      const my = (y + next[1]) / 2;
      back += `<path d="${spike(mx, my + 3, h * 0.45, 2.6)}" fill="${dk(p.accent, 0.12)}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/><path d="${spikeHalf(mx, my + 3, h * 0.45, 2.6)}" fill="${dk(p.accent, 0.35)}"/>`;
    }
  });

  // Tail with cel shading, scale row, belly stripe, small spines and the ember tip.
  let tail = `<path d="${TAIL}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  tail += `<g clip-path="url(#${id}T)"><path d="M8 3 C-18 1 -42 9 -60 24 L-60 44 L8 44Z" fill="${shade}"/><path d="M4 -12 C-16 -16 -36 -9 -48 3 L-46 -2 C-34 -12 -16 -15 4 -10Z" fill="${light}"/>`;
  if (c.fine) for (let i = 0; i < (c.portrait ? 26 : 16); i++) {
    const n = c.portrait ? 26 : 16;
    const t = i / n;
    tail += `<path d="M${f(-t * 70)} ${f(-9 + t * 16 + (i % 2) * 4)} l2.6 -2 l2.6 2 l-2.6 2z" fill="${shade}" opacity="0.4"/>`;
  }
  tail += `</g>`;
  tail += `<path d="M4 9 C-18 6 -34 10 -46 19" stroke="${p.belly}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  for (const [x, y, h] of [[-10, -16, 7], [-24, -15, 6], [-38, -9, 5], [-50, 2, 4], [-61, 13, 3]]) {
    tail += `<path d="${spike(x, y + 2, h * A.spine + 2, 3.4)}" fill="${p.accent}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>`;
  }
  const flame =
    `<path d="M2 -2 C-4 -10 -9 -18 -4 -26 C-2 -16 -11 -16 -13 -9 C-17 -16 -24 -12 -24 -2 C-26 7 -15 13 2 4Z" fill="${dk(p.accent, 0.1)}" stroke="${line}" stroke-width="1.4"/>` +
    `<path d="M0 -1 C-4 -7 -7 -12 -4 -17 C-3 -10 -9 -10 -10 -5 C-13 -9 -17 -6 -17 -1 C-18 5 -10 8 0 2Z" fill="${lt(p.accent, 0.3)}"/>`;
  const tongues = c.portrait ? `<path d="M-6 -10 C-8 -16 -6 -20 -2 -24 C-5 -18 -3 -14 -6 -10Z M-16 -6 C-20 -10 -22 -14 -20 -18 C-19 -13 -16 -10 -16 -6Z" fill="${lt(p.accent, 0.55)}"/>` : '';
  tail += `<g transform="translate(-88 18)">${c.glow(flame + tongues)}<path d="M-2 -0.5 C-4 -4 -6 -6 -5 -9 C-8 -5 -12 -3 -10 1 C-8 4 -4 3 -2 -0.5Z" fill="#fffbe6"/></g>`;

  // Body: base, shadow, light, scales, markings, lava cracks, rim light, belly plates.
  let body = `<path d="${BODY}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 1.1)}" stroke-linejoin="round"/>`;
  body += `<g clip-path="url(#${id}B)">`;
  body += `<path d="M66 99 C94 94 128 99 152 90 C166 84 178 72 194 60 L204 124 L66 124Z" fill="${shade}"/>`;
  body += `<path d="M80 84 C88 72 104 66 128 66 C146 66 157 62 165 54 C169 50 172 46 175 41 L179 43 C173 54 163 66 146 70 C124 72 102 72 82 88Z" fill="${light}"/>`;
  if (c.fine) {
    const step = c.portrait ? 4 : 5;
    for (let y = 60; y < 96; y += step) {
      for (let x = 80 + ((y / step) % 2) * 3.5; x < 190; x += c.portrait ? 6 : 7) {
        const top = 60 + (x > 150 ? -(x - 150) * 0.7 : 0) + (x < 92 ? (92 - x) * 0.8 : 0);
        if (y < top) continue;
        body += `<path d="M${f(x)} ${y} l3 -2.4 l3 2.4 l-3 2.4z" fill="${y > 82 ? line : shade}" opacity="${y > 82 ? 0.15 : 0.3}"/>`;
      }
    }
  }
  body += c.marks(BODY);
  const cracks = c.portrait ? [...CRACKS, ...PORTRAIT_CRACKS] : CRACKS;
  body += cracks.map((d) => `<path d="${d}" stroke="${p.accent}" stroke-width="4" fill="none" opacity="0.25" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  let heat = cracks.map((d) => `<path d="${d}" stroke="${lt(p.accent, 0.35)}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  // Close up, warm specks glow between the scales.
  if (c.portrait) for (let i = 0; i < 30; i++) heat += `<circle cx="${f(86 + c.r() * 100)}" cy="${f(66 + c.r() * 30)}" r="${f(0.5 + c.r() * 0.7)}" fill="${lt(p.accent, 0.4)}" opacity="0.75"/>`;
  body += c.glow(heat);
  body += `</g>`;
  body += `<path d="${BODY}" fill="none" stroke="${rim}" stroke-width="3" opacity="0.85" clip-path="url(#${id}rim)"/>`;
  body += `<path d="${BELLY}" fill="${p.belly}"/><g clip-path="url(#${id}L)">`;
  body += `<path d="M84 104 C110 112 138 112 156 104 C160 112 140 120 108 117Z" fill="${dk(p.belly, 0.22)}"/>`;
  [96, 108, 120, 132, 144, 155, 165, 174].forEach((x, i) => {
    const y = 112 - (i > 3 ? (i - 3) * 5 : 0) - i * 0.5;
    if (c.fine) body += `<path d="M${x} ${f(y - 9)} q3 4 1 10" stroke="${p.accent}" stroke-width="2.6" fill="none" opacity="0.35" stroke-linecap="round"/>`;
    body += `<path d="M${x} ${f(y - 9)} q3 4 1 10" stroke="${dk(p.belly, 0.45)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    if (c.portrait) body += `<path d="M${x + 3} ${f(y - 7)} q2 3 1 6" stroke="${lt(p.belly, 0.6)}" stroke-width="0.8" fill="none" opacity="0.8" stroke-linecap="round"/>`;
  });
  body += `<path d="M90 103 C110 110 134 110 150 103" stroke="${lt(p.belly, 0.6)}" stroke-width="1.2" fill="none" opacity="0.8" stroke-linecap="round"/></g>`;

  // Legs.
  let legs = `<path d="${THIGH}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.9)}"/>`;
  legs += `<path d="M90 108 C94 116 106 116 112 104 L112 120 L84 120Z" fill="${shade}" clip-path="url(#${id}Th)"/><path d="M94 96 C100 92 106 93 108 97 C102 96 98 97 94 100Z" fill="${light}"/>`;
  if (c.fine) legs += `<path d="M96 100 l4 -2 l4 2 l-4 2z M102 106 l4 -2 l4 2 l-4 2z" fill="${shade}" opacity="0.5"/>`;
  if (c.portrait) for (let i = 0; i < 8; i++) legs += `<path d="M${f(88 + (i % 4) * 5)} ${f(104 + Math.floor(i / 4) * 5)} l2.4 -1.8 l2.4 1.8 l-2.4 1.8z" fill="${shade}" opacity="0.45"/>`;
  legs += `<path d="${FOOT}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
  legs += `<path d="${ARM}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/><path d="M158 100 C160 106 164 109 169 110" stroke="${shade}" stroke-width="2" fill="none" opacity="0.6"/>`;
  legs += `<g fill="#fffdf5" stroke="${line}" stroke-width="0.8" stroke-linejoin="round">${CLAWS.map(([x, y, k]) => `<path d="M${x} ${y} l${f(3.2 * k)} 0.6 l${f(-1.8 * k)} 2.6z"/>`).join('')}</g>`;
  if (c.portrait) legs += `<g fill="${dk(p.belly, 0.25)}">${CLAWS.map(([x, y, k]) => `<path d="M${f(x + 1.4 * k)} ${f(y + 0.3)} l${f(1.8 * k)} 0.3 l${f(-1.6 * k)} 2.3z"/>`).join('')}</g>`;

  // Head: horns, cheek spikes, cel shading, brow, jaw, teeth, nostril puff, eye.
  let head = '';
  if (c.stage === 'hatchling') {
    head += `<path d="M184 32 l-8 -7 l11 1z M192 28 l-4 -8 l8 5z" fill="${p.belly}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`;
  } else {
    const g = c.stage === 'adult' ? 1 : 0.7;
    const hc = p.belly;
    head += `<path d="M184 34 C176 ${f(24 - 6 * g)} ${f(166 - 4 * g)} ${f(20 - 8 * g)} ${f(152 - 4 * g)} ${f(22 - 8 * g)} C162 26 170 32 176 40Z" fill="${hc}" stroke="${line}" stroke-width="1.7" stroke-linejoin="round"/>`;
    head += `<path d="M184 34 C178 28 172 25 164 24 C170 28 174 33 178 39Z" fill="${dk(hc, 0.22)}"/>`;
    head += `<path d="M193 29 C190 ${f(20 - 4 * g)} 184 ${f(14 - 6 * g)} ${f(175 - 2 * g)} ${f(11 - 6 * g)} C181 18 185 24 186 32Z" fill="${lt(hc, 0.15)}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`;
    if (c.fine) for (let i = 0; i < (c.portrait ? 5 : 3); i++) head += `<path d="M${f(176 - i * 5)} ${f(31 - i * 3.4 - g * i)} l3.6 2" stroke="${line}" stroke-width="0.8" opacity="0.6"/>`;
  }
  head += `<path d="M176 54 l-12 2 l8 3 l-10 6 l14 -2z" fill="${p.accent}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/><path d="M174 58 l-8 4 l10 -1z" fill="${dk(p.accent, 0.28)}"/>`;
  head += `<path d="${HEAD}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  head += `<g clip-path="url(#${id}H)"><path d="M170 55 C190 53 212 56 238 49 L238 66 L170 66Z" fill="${shade}"/><path d="M178 40 C184 31 194 28 206 29 C198 31 188 35 182 44Z" fill="${light}"/><path d="M214 34 C220 36 226 39 231 43 L230 45 C224 41 219 38 213 36Z" fill="${light}"/>`;
  if (c.fine) for (let i = 0; i < (c.portrait ? 9 : 5); i++) head += `<path d="M${f(184 + i * (c.portrait ? 4 : 6))} ${f(54 - (i % 2) * 2)} l2.4 -2 l2.4 2 l-2.4 2z" fill="${shade}" opacity="0.4"/>`;
  head += `</g>`;
  head += `<path d="M186 36 C192 30 204 29 212 34 L209 37 C201 33 193 34 188 39Z" fill="${dk(p.body, 0.3)}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
  head += `<path d="M198 58 C208 58 219 57 228 54 C223 59 213 62 203 62Z" fill="${p.belly}"/>`;
  head += `<path d="M202 56 C212 57 221 56 230 52" stroke="${line}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  head += `<path d="M212 56.4 l1.8 3.4 l1.8 -3.6z M220 55.6 l1.4 2.6 l1.4 -2.8z" fill="#fff" stroke="${line}" stroke-width="0.4"/>`;
  head += `<ellipse cx="228" cy="44" rx="2.2" ry="1.4" fill="${line}"/>`;
  if (c.fine) head += `<g class="cel-puff"><circle cx="236" cy="40" r="1.8" fill="${lt(p.accent, 0.3)}" opacity="0.8"/><circle cx="239" cy="37" r="1.2" fill="${p.accent}" opacity="0.7"/></g>`;
  if (c.fine) head += `<path d="M206 51 l5 -1 M207 53 l5 0" stroke="${dk(p.body, 0.25)}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>`;
  head += `<ellipse cx="208" cy="50" rx="3.8" ry="2.2" fill="#ff8fab" opacity="0.45"/>`;
  head += celEye(c, 197, 42, mix(p.accent, '#c2410c', 0.35));
  head += `<path d="M188 ${f(40 - A.eye)} C194 ${f(36 - A.eye)} 201 ${f(36 - A.eye)} 207 ${f(39 - A.eye)}" stroke="${line}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;

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

export const EMBERBACK: TribeArt = { draw };
