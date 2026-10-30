// Shadeglide, the night glider: slim smooth body, soft round head with long swept
// ear fins, huge rounded wings full of stars, low round back nubs, crescent-moon tail.

import { celEye, dk, f, lt, luma, mix, type Ctx, type Parts, type TribeArt } from './cel';

const BODY = 'M76 93 C79 81 97 73 120 71 C140 69 153 65 163 57 C169 52 173 47 177 42 C184 39 193 43 197 50 C191 58 185 68 177 80 C167 95 147 104 121 104 C98 104 77 103 76 93Z';
const BELLY = 'M86 101 C106 106 136 106 152 99 C164 93 173 80 182 64 Q186 62 189 67 C182 84 173 97 159 103 C140 111 106 111 86 101Z';
const TAIL = 'M6 -12 C-14 -17 -36 -13 -52 -4 C-64 2 -78 4 -94 1 C-86 15 -66 18 -51 11 C-34 4 -16 4 6 10Z';
const HEAD = 'M174 46 C172 32 184 24 198 25 C208 26 216 30 222 35 C228 40 229 47 225 52 C220 57 212 58 204 58 C196 59 188 60 182 58 C175 56 174 52 174 46Z';
const WING = 'M0 0 C6 -26 -8 -50 -28 -61 C-58 -73 -96 -64 -114 -48 C-122 -41 -126 -34 -122 -29 C-110 -31 -101 -25 -100 -15 C-90 -20 -78 -16 -74 -5 C-62 -10 -50 -6 -44 4 C-30 0 -14 4 0 0Z';
const ARMBONE = 'M0 0 C6 -26 -8 -50 -28 -61 C-58 -73 -96 -64 -114 -48';
const FINGERS = 'M-28 -61 Q-80 -50 -121 -30 M-28 -61 Q-66 -36 -100 -16 M-28 -61 Q-50 -28 -74 -6';
const EDGE = 'M-122 -29 C-110 -31 -101 -25 -100 -15 C-90 -20 -78 -16 -74 -5 C-62 -10 -50 -6 -44 4';
const THIGH = 'M95 92 C88 97 88 106 95 109 C104 112 113 106 113 98 C111 92 103 88 95 92Z';
const FOOT = 'M101 106 C96 112 89 115 80 115 L73 117 L77 113 L71 111 L79 110 C86 109 90 106 93 102Z';
const FARLEG = 'M104 100 C99 108 92 111 83 111 L76 113 L79 109 L74 107 L81 106 C88 104 92 101 95 97Z';
const ARM = 'M160 89 C161 97 165 101 171 101 L177 103 L174 99 L180 98 L173 95 C168 94 165 91 164 86Z';
const BACK: Array<[number, number]> = [[88, 81], [98, 76], [108, 73], [118, 71], [128, 70], [138, 69], [147, 66], [155, 62], [162, 57], [168, 52], [173, 47]];
const NUBS = [3.4, 4, 4.6, 5, 5, 5, 4.8, 4.4, 4, 3.6, 3];
const CLAWS: Array<[number, number, number]> = [[177, 103, 1], [180, 98, 1], [73, 117, -1], [71, 111, -1], [76, 113, -1], [74, 107, -1]];
// Two tiny constellations on the front wing.
const STARS: Array<Array<[number, number]>> = [
  [[-36, -54], [-46, -47], [-58, -52], [-66, -43], [-78, -47]],
  [[-58, -24], [-70, -30], [-82, -26], [-88, -36]],
];

function draw(c: Ctx): Parts {
  const { p, A, SW, id } = c;
  // Dark night palettes get a lifted base and a deep ink so outline and bands still read.
  const dark = luma(p.body) < 0.22;
  const skin = dark ? mix(p.body, p.belly, 0.24) : p.body;
  const line = dark ? dk(p.body, 0.78) : c.line;
  const shade = dark ? mix(dk(p.body, 0.25), '#2a1f6a', 0.25) : c.shade;
  const light = dark ? mix(skin, '#cfe0ff', 0.26) : c.light;
  const moon = mix('#f1f6ff', p.accent, 0.28);
  const wingInk = dk(p.wing, 0.6);
  const sky = luma(p.wing) < 0.2 ? mix(p.wing, '#3b4aa0', 0.22) : p.wing;
  const defs = `<clipPath id="${id}B"><path d="${BODY}"/></clipPath><clipPath id="${id}H"><path d="${HEAD}"/></clipPath><clipPath id="${id}T"><path d="${TAIL}"/></clipPath><clipPath id="${id}W"><path d="${WING}"/></clipPath><clipPath id="${id}L"><path d="${BELLY}"/></clipPath><clipPath id="${id}Th"><path d="${THIGH}"/></clipPath><clipPath id="${id}rim"><ellipse cx="128" cy="58" rx="66" ry="17"/></clipPath>
<linearGradient id="${id}w" x1="0" y1="1" x2="0.3" y2="0"><stop offset="0" stop-color="${p.wing}"/><stop offset="1" stop-color="${lt(sky, 0.2)}"/></linearGradient>`;

  // Wings: night-sky membrane, shadow band, moonlit leading panel, starfield, soft bones.
  const wing = (back: boolean): string => {
    const wr = c.r;
    let s = `<path d="${WING}" fill="${back ? dk(p.wing, 0.15) : `url(#${id}w)`}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${id}W)">`;
    s += `<path d="M-124 -30 Q-60 -26 12 -12 L12 12 L-124 12Z" fill="${dk(p.wing, 0.3)}" opacity="${back ? 0.3 : 0.55}"/>`;
    s += `<path d="M-28 -61 C-58 -73 -96 -64 -114 -48 L-108 -43 C-88 -57 -56 -65 -28 -55Z" fill="${lt(sky, 0.32)}" opacity="0.85"/>`;
    // Stars: plain dots on the back wing, the whole field glows softly on the front wing.
    let st = '';
    const n = back ? (c.portrait ? 26 : c.fine ? 14 : 0) : c.portrait ? 56 : c.fine ? 34 : 6;
    for (let i = 0; i < n; i++) {
      const x = -114 + wr() * 106;
      const y = -62 + wr() * 60;
      st += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + wr() * (back ? 0.7 : 1))}" fill="${i % 4 ? moon : p.accent}" opacity="${back ? 0.5 : 0.85}"/>`;
    }
    if (!back) {
      for (const k of STARS) {
        if (c.fine) st += `<path d="M${k.map(([x, y]) => `${x} ${y}`).join(' L')}" stroke="${moon}" stroke-width="0.6" fill="none" opacity="0.55" stroke-linecap="round" stroke-linejoin="round"/>`;
        k.forEach(([x, y], j) => (st += `<circle cx="${x}" cy="${y}" r="${j === 0 ? 1.7 : 1.2}" fill="${j === 0 ? p.accent : moon}"/>`));
      }
      if (c.portrait) for (const [x, y] of [[-36, -54], [-58, -24], [-90, -46]]) st += `<path d="M${x} ${y - 3.2} L${x + 0.6} ${y - 0.6} L${x + 3.2} ${y} L${x + 0.6} ${y + 0.6} L${x} ${y + 3.2} L${x - 0.6} ${y + 0.6} L${x - 3.2} ${y} L${x - 0.6} ${y - 0.6}Z" fill="${moon}" opacity="0.9"/>`;
      s += c.glow(st);
    } else s += st;
    if (c.portrait && !back) {
      // Close up, faint veins run along the membrane between the fingers.
      for (let i = 0; i < 10; i++) {
        const t = i / 9;
        s += `<path d="M${f(-14 - t * 30)} ${f(-54 + t * 40)} Q${f(-50 - t * 30)} ${f(-50 + t * 30)} ${f(-90 - t * 18)} ${f(-46 + t * 30)}" stroke="${lt(sky, 0.25)}" stroke-width="0.5" fill="none" opacity="0.4"/>`;
      }
    }
    s += `</g>`;
    s += `<path d="${EDGE}" stroke="${lt(sky, 0.5)}" stroke-width="1.3" fill="none" opacity="0.8" stroke-linecap="round"/>`;
    s += `<path d="${FINGERS}" stroke="${back ? line : wingInk}" stroke-width="${f(SW * 0.9)}" stroke-linecap="round" fill="none"/><path d="${FINGERS}" stroke="${mix(sky, p.belly, 0.4)}" stroke-width="${f(SW * 0.4)}" stroke-linecap="round" fill="none" opacity="${back ? 0.3 : 0.75}"/>`;
        s += `<path d="${ARMBONE}" stroke="${line}" stroke-width="${f(SW * 1.4)}" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M2 -6 C6 -26 -8 -46 -27 -57 C-56 -68 -92 -60 -109 -46" stroke="${back ? light : moon}" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="${back ? 0.5 : 0.85}"/>`;
    s += `<circle cx="-28" cy="-61" r="2.6" fill="${p.belly}" stroke="${line}" stroke-width="1"/>`;
    for (const [x, y] of [[-121, -30], [-100, -16], [-74, -6]]) s += `<circle cx="${x}" cy="${y}" r="1.7" fill="${p.belly}" stroke="${line}" stroke-width="0.7"/>`;
    return s;
  };

  // Back ridge: a low row of smooth round nubs, each with a soft highlight.
  let back = '';
  BACK.forEach(([x, y], i) => {
    const w = NUBS[i] * (0.8 + A.spine * 0.2);
    const h = NUBS[i] * (0.7 + A.spine * 0.6);
    back += `<path d="M${f(x - w)} ${y + 3} C${f(x - w)} ${f(y - h)} ${f(x + w)} ${f(y - h)} ${f(x + w)} ${y + 3}Z" fill="${p.accent}" stroke="${line}" stroke-width="1.3"/>`;
    back += `<path d="M${f(x + w * 0.1)} ${y + 3} C${f(x + w * 0.2)} ${f(y - h * 0.6)} ${f(x + w)} ${f(y - h * 0.4)} ${f(x + w)} ${y + 3}Z" fill="${dk(p.accent, 0.3)}"/>`;
    back += `<ellipse cx="${f(x - w * 0.35)}" cy="${f(y - h * 0.35)}" rx="${f(w * 0.28)}" ry="${f(h * 0.22)}" fill="${lt(p.accent, 0.6)}" opacity="0.9"/>`;
    if (c.portrait) back += `<path d="M${f(x - w * 0.7)} ${f(y + 1)} Q${f(x - w * 0.6)} ${f(y - h * 0.5)} ${f(x)} ${f(y - h * 0.62)}" stroke="${lt(p.accent, 0.75)}" stroke-width="0.6" fill="none" opacity="0.8"/>`;
  });

  // Tail: slim and smooth, cel bands, soft scales, belly stripe, tiny nubs, crescent-moon tip.
  let tail = `<path d="${TAIL}" fill="${skin}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  tail += `<g clip-path="url(#${id}T)"><path d="M8 3 C-18 0 -46 6 -70 12 L-70 30 L8 30Z" fill="${shade}"/><path d="M4 -9 C-16 -14 -36 -10 -52 -1 L-51 -5 C-36 -13 -16 -16 4 -12Z" fill="${light}"/>`;
  if (c.fine) {
    const n = c.portrait ? 26 : 18;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      tail += `<path d="M${f(-2 - t * 74)} ${f(-6 + t * 10 + (i % 2) * 4)} q2 1.6 4 0" stroke="${shade}" stroke-width="0.9" fill="none" opacity="0.7"/>`;
    }
  }
  tail += `</g>`;
  tail += `<path d="M-8 -15 C-28 -15 -44 -9 -58 -1" stroke="${moon}" stroke-width="1.4" fill="none" opacity="0.6" stroke-linecap="round"/>`;
  tail += `<path d="M4 6 C-18 3 -36 7 -52 14" stroke="${p.belly}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
  for (const [x, y, r] of [[-12, -14, 2.2], [-26, -13, 2], [-40, -8, 1.8], [-54, -2, 1.5], [-67, 1, 1.3]]) {
    const h = r * (0.9 + A.spine * 0.5);
    tail += `<path d="M${f(x - r)} ${y + 2} C${f(x - r)} ${f(y - h)} ${f(x + r)} ${f(y - h)} ${f(x + r)} ${y + 2}Z" fill="${p.accent}" stroke="${line}" stroke-width="1"/>`;
    if (c.fine) tail += `<ellipse cx="${f(x - r * 0.35)}" cy="${f(y - h * 0.3)}" rx="${f(r * 0.3)}" ry="${f(h * 0.2)}" fill="${lt(p.accent, 0.6)}"/>`;
  }
  // The crescent moon, horns pointing away from the tail.
  let crescent = `<path d="M3 -14 A14 14 0 0 1 3 14 A16.5 16.5 0 0 0 3 -14Z" transform="rotate(-24)" fill="${p.accent}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`;
  crescent += `<path d="M6 -10.5 A10.5 10.5 0 0 1 12 4 A13 13 0 0 0 6 -10.5Z" transform="rotate(-24)" fill="${lt(p.accent, 0.55)}"/>`;
  if (c.portrait) crescent += `<circle cx="9" cy="-8" r="0.9" fill="#fff"/><circle cx="14" cy="2" r="0.7" fill="${lt(p.accent, 0.7)}"/><circle cx="12" cy="8" r="0.6" fill="#fff" opacity="0.8"/>`;
  tail += `<g transform="translate(-110 8) scale(1.15)">${c.glow(crescent)}<circle cx="14" cy="-6" r="1.4" fill="#fff" opacity="0.9"/></g>`;

  // Body: base, shadow, light, soft scales, markings, rim light, belly band.
  let body = `<path d="${BODY}" fill="${skin}" stroke="${line}" stroke-width="${f(SW * 1.1)}" stroke-linejoin="round"/>`;
  body += `<g clip-path="url(#${id}B)">`;
  body += `<path d="M66 97 C96 93 128 98 150 90 C164 84 176 72 194 60 L204 120 L66 120Z" fill="${shade}"/>`;
  body += `<path d="M80 86 C88 77 104 74 122 74 C142 73 155 68 165 59 C169 55 172 51 175 46 L179 46 C174 56 165 67 148 72 C126 76 102 77 82 89Z" fill="${light}"/>`;
  if (c.fine) {
    const step = c.portrait ? 3.6 : 4.6;
    for (let y = 74; y < 96; y += step) {
      const row = Math.round(y / step);
      for (let x = 84 + (row % 2) * 3.5; x < 186; x += c.portrait ? 5.4 : 7) {
        const top = 72 + (x > 150 ? -(x - 150) * 0.9 : 0) + (x < 96 ? (96 - x) * 0.8 : 0);
        const bot = x > 160 ? 96 - (x - 160) * 0.9 : 98;
        if (y < top || y > bot) continue;
        body += `<path d="M${f(x)} ${f(y)} q3 2.4 6 0" stroke="${y > 86 ? line : shade}" stroke-width="0.9" fill="none" opacity="${y > 86 ? 0.25 : 0.55}"/>`;
      }
    }
  }
  body += c.marks(BODY);
  // Close up, faint starlight specks dust the flank.
  if (c.portrait) for (let i = 0; i < 34; i++) body += `<circle cx="${f(88 + c.r() * 90)}" cy="${f(76 + c.r() * 18)}" r="${f(0.4 + c.r() * 0.6)}" fill="${moon}" opacity="0.6"/>`;
  body += `</g>`;
  body += `<path d="${BODY}" fill="none" stroke="${moon}" stroke-width="2.6" opacity="0.8" clip-path="url(#${id}rim)"/>`;
  body += `<path d="${BELLY}" fill="${p.belly}"/><g clip-path="url(#${id}L)">`;
  body += `<path d="M86 101 C110 107 138 106 156 99 C160 106 140 113 108 110Z" fill="${dk(p.belly, 0.25)}"/>`;
  [98, 110, 122, 134, 146, 156, 165, 173, 180].forEach((x, i) => {
    const y = 106 - (i > 3 ? (i - 3) * 6 : 0) - i * 0.4;
    body += `<path d="M${x} ${f(y - 7)} q2.6 3.6 0.6 8" stroke="${dk(p.belly, 0.35)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    if (c.portrait) body += `<path d="M${x + 2.6} ${f(y - 5)} q1.6 2.4 0.6 5" stroke="${lt(p.belly, 0.6)}" stroke-width="0.7" fill="none" opacity="0.8" stroke-linecap="round"/>`;
  });
  body += `<path d="M92 101 C112 106 134 106 150 100" stroke="${lt(p.belly, 0.55)}" stroke-width="1.2" fill="none" opacity="0.8" stroke-linecap="round"/></g>`;
  body += `<path d="${BELLY}" fill="none" stroke="${line}" stroke-width="0.9" opacity="0.4"/>`;

  // Legs: slim, tucked back for gliding.
  let legs = `<path d="${THIGH}" fill="${skin}" stroke="${line}" stroke-width="${f(SW * 0.9)}"/>`;
  legs += `<path d="M89 104 C94 111 105 111 113 101 L113 116 L84 116Z" fill="${shade}" clip-path="url(#${id}Th)"/><path d="M95 95 C100 91 106 92 109 96 C103 95 99 96 95 99Z" fill="${light}"/>`;
  if (c.fine) legs += `<path d="M96 100 q3 2 6 0 M101 105 q3 2 6 0" stroke="${shade}" stroke-width="0.9" fill="none"/>`;
  if (c.portrait) for (let i = 0; i < 6; i++) legs += `<path d="M${f(91 + (i % 3) * 6)} ${f(98 + Math.floor(i / 3) * 5)} q2 1.6 4 0" stroke="${shade}" stroke-width="0.7" fill="none" opacity="0.7"/>`;
  legs += `<path d="${FOOT}" fill="${skin}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
  legs += `<path d="${ARM}" fill="${skin}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/><path d="M163 92 C165 97 168 99 172 99" stroke="${shade}" stroke-width="1.8" fill="none" opacity="0.7"/>`;
  legs += `<g fill="#f4f1ff" stroke="${line}" stroke-width="0.8" stroke-linejoin="round">${CLAWS.map(([x, y, k]) => `<path d="M${x} ${y} l${f(2.6 * k)} 0.6 l${f(-1.6 * k)} 2.2z"/>`).join('')}</g>`;

  // Head: long swept ear fins, forehead nubs, cel shading, soft smile, big kind eye.
  let head = '';
  const L = 16 + 28 * A.spine;
  const ear = (x: number, y: number, fill: string, deep: string): string => {
    const tx = x - L;
    const ty = y - L * 0.2;
    let s = `<path d="M${x} ${y} C${f(x - L * 0.3)} ${f(y - 9)} ${f(tx + 9)} ${f(ty - 5)} ${f(tx)} ${f(ty)} C${f(tx - 1)} ${f(ty + 2)} ${f(tx + 1)} ${f(ty + 4)} ${f(tx + 5)} ${f(ty + 5)} C${f(tx + L * 0.4)} ${f(ty + 9)} ${f(x - L * 0.25)} ${y + 15} ${x - 6} ${y + 13}Z" fill="${fill}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>`;
    s += `<path d="M${x - 4} ${y + 9} C${f(x - L * 0.3)} ${y + 8} ${f(tx + L * 0.3)} ${f(ty + 6)} ${f(tx + 4)} ${f(ty + 4)} C${f(tx + L * 0.4)} ${f(ty + 9)} ${f(x - L * 0.25)} ${y + 14} ${x - 6} ${y + 13}Z" fill="${deep}"/>`;
    if (c.fine) s += `<path d="M${x - 3} ${y + 3} Q${f(x - L * 0.5)} ${f(y - L * 0.06)} ${f(tx + 3)} ${f(ty + 1)}" stroke="${moon}" stroke-width="0.9" fill="none" opacity="0.7" stroke-linecap="round"/>`;
    if (c.portrait) for (let i = 1; i < 4; i++) s += `<path d="M${f(x - 4 - i * L * 0.18)} ${f(y + 9 - i * 1.6)} q${f(-L * 0.08)} -3 ${f(-L * 0.16)} -4" stroke="${dk(fill, 0.3)}" stroke-width="0.6" fill="none" opacity="0.7"/>`;
    return s;
  };
  head += ear(195, 27, dk(p.belly, 0.28), dk(p.belly, 0.45));
  head += ear(188, 32, p.belly, dk(p.belly, 0.22));
  if (c.stage !== 'hatchling') {
    // Small rounded forehead nubs: one when young, two when grown.
    const nubs: Array<[number, number, number]> = c.stage === 'adult' ? [[203, 27, 3], [210, 29, 2.4]] : [[204, 27, 2.4]];
    for (const [x, y, r] of nubs) head += `<path d="M${x - r} ${y + 2} C${x - r} ${y - r * 1.4} ${x + r} ${y - r * 1.4} ${x + r} ${y + 2}Z" fill="${p.accent}" stroke="${line}" stroke-width="1.2"/>`;
  }
  head += `<path d="${HEAD}" fill="${skin}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  head += `<g clip-path="url(#${id}H)"><path d="M170 52 C190 52 210 54 232 46 L232 64 L170 64Z" fill="${shade}"/><path d="M178 40 C184 31 194 28 206 29 C198 31 188 35 182 44Z" fill="${light}"/><path d="M212 32 C218 34 222 37 226 41 L225 43 C220 39 216 36 211 34Z" fill="${light}"/>`;
  if (c.fine) for (let i = 0; i < (c.portrait ? 8 : 4); i++) head += `<path d="M${f(180 + i * (c.portrait ? 4.5 : 7))} ${f(55 - (i % 2) * 2)} q2 1.6 4 0" stroke="${shade}" stroke-width="0.8" fill="none" opacity="0.7"/>`;
  head += `</g>`;
  head += `<path d="M180 36 C188 26 204 24 216 30" stroke="${moon}" stroke-width="1.8" fill="none" opacity="0.75" stroke-linecap="round"/>`;
  head += `<path d="M202 54 C210 55 218 53 224 50" stroke="${line}" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M224 50 q2 -0.4 2.6 -2" stroke="${line}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  head += `<ellipse cx="221" cy="41" rx="1.8" ry="1.2" fill="${line}"/>`;
  if (c.fine) head += `<g class="cel-puff"><circle cx="230" cy="38" r="1.6" fill="${moon}" opacity="0.7"/><circle cx="233" cy="35" r="1.1" fill="${moon}" opacity="0.5"/></g>`;
  head += `<ellipse cx="208" cy="49" rx="3.8" ry="2.2" fill="#ff9ec2" opacity="0.4"/>`;
  head += celEye(c, 197, 41, mix(p.accent, '#e8590c', 0.18), skin);
  head += `<path d="M190 ${f(38 - A.eye)} C195 ${f(35 - A.eye)} 201 ${f(35 - A.eye)} 205 ${f(37 - A.eye)}" stroke="${line}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  if (c.portrait) head += `<path d="M184 48 q3 2 6 0 M186 52 q3 2 6 0" stroke="${moon}" stroke-width="0.6" fill="none" opacity="0.5"/>`;

  return {
    defs,
    wing,
    farLeg: `<path d="${FARLEG}" fill="${dark ? p.body : dk(p.body, 0.25)}" stroke="${line}" stroke-width="${f(SW * 0.8)}" stroke-linejoin="round"/>`,
    tail,
    back,
    body,
    legs,
    head,
  };
}

// A night creature: slightly bigger, kinder eyes at every age.
export const SHADEGLIDE: TribeArt = { draw, age: { hatchling: { eye: 9.6 }, young: { eye: 8.6 }, adult: { eye: 7.9 } } };
