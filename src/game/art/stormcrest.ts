// Stormcrest: lean raptor build with a deep keel chest and narrow waist, a big
// swept-back crest of layered plates, a jagged neck ridge, long pointed falcon
// wings with a storm-cloud trailing edge and a thin tail ending in a bolt tip.

import { celEye, dk, f, lt, luma, mix, type Ctx, type Parts, type TribeArt } from './cel';

const BODY = 'M76 92 C76 80 90 70 110 67 C126 64 140 62 152 56 C162 51 168 44 174 34 L198 50 C192 58 187 68 185 80 C183 96 177 112 161 118 C148 122 136 114 126 104 C118 98 110 100 102 106 C90 112 76 104 76 92Z';
const BELLY = 'M200 46 C192 60 188 72 186 86 C184 102 176 116 160 120 C146 122 132 112 124 104 L130 100 C138 108 150 112 160 110 C170 106 176 94 178 82 C180 68 184 58 190 48Z';
const TAIL = 'M6 -10 C-14 -14 -34 -8 -50 2 C-62 10 -74 13 -88 12 L-87 17 C-72 20 -58 18 -46 12 C-32 6 -14 6 6 9Z';
const HEAD = 'M176 46 C175 33 184 25 198 25 L212 27 L228 34 L237 41 C239 45 238 48 234 50 L220 55 L204 61 C196 63 186 63 180 59 C176 56 176 51 176 46Z';
const WING = 'M0 0 C6 -16 2 -34 -10 -46 C-36 -55 -66 -59 -102 -56 Q-96 -42 -84 -44 Q-86 -30 -68 -32 Q-70 -18 -52 -20 Q-54 -6 -36 -8 Q-36 6 -18 4 Q-8 6 0 0Z';
const EDGE = 'M-102 -56 Q-96 -42 -84 -44 Q-86 -30 -68 -32 Q-70 -18 -52 -20 Q-54 -6 -36 -8 Q-36 6 -18 4';
const BONES = 'M-10 -46 L-98 -55 M-10 -46 L-68 -32 M-10 -46 L-36 -8';
const BOLT = 'M2 -4 L-9 -12 L-8 -4 L-21 -10 L-14 1 L-28 3 L-10 8 L-11 3 L2 5Z';
const BOLT_CORE = 'M0 -2 L-8 -8 L-7 -1 L-17 -5 L-12 2 L-22 3.5 L-9 5.5 L-9 2 L0 3Z';
const THIGH = 'M94 95 C86 101 85 111 93 115 C101 118 110 112 110 102 C109 94 101 90 94 95Z';
const FOOT = 'M101 112 C99 118 95 123 89 125 L81 128 L85 124 L79 123 L87 120 C91 118 93 114 94 110Z';
const FARLEG = 'M106 102 C104 112 98 118 89 121 L81 124 L85 119 L79 118 L87 115 C93 112 96 106 98 99Z';
const ARM = 'M165 107 C167 114 171 118 177 118 L183 121 L180 116 L186 116 L179 112 C174 111 170 107 169 102Z';
const CLAWS: Array<[number, number, number]> = [[183, 121, 1], [186, 116, 1], [81, 128, -1], [79, 123, -1], [81, 124, -1], [79, 118, -1]];
/** Neck and back ridge: x, y on the top line and spike height. */
const RIDGE: Array<[number, number, number]> = [[170, 41, 9], [164, 48, 10], [157, 53, 10], [149, 58, 9], [139, 61, 8], [128, 64, 7], [117, 66, 6], [106, 68, 5], [95, 72, 4]];
/** Crest plates, top to bottom: the first and last points sit on the head, the rest sweep back. */
const PLATES: number[][] = [
  [208, 30, 184, 11, 141, -4, 165, 12, 159, 16, 190, 31],
  [201, 34, 176, 22, 136, 12, 157, 25, 151, 29, 184, 38],
  [193, 41, 170, 34, 138, 31, 157, 40, 151, 44, 182, 48],
  [186, 50, 170, 49, 148, 52, 163, 56, 159, 60, 180, 58],
];
/** The dark web the plates grow from, so they read as one crest. */
const WEB = [207, 31, 172, 15, 150, 15, 164, 27, 146, 30, 166, 40, 150, 47, 172, 54, 183, 52];
const ZIGS = ['M98 84 L108 77 L112 85 L123 78 L127 86 L138 79', 'M146 74 L154 68 L157 75 L166 69'];
const PORTRAIT_ZIGS = ['M104 96 L111 91 L114 97 L121 92'];

/** Shortens the snout (x past 205) for young dragons: absolute commands only. */
const snout = (d: string, k: number): string =>
  k === 1 ? d : d.replace(/([MLCQ])([^MLCQZmlcqz]+)/g, (_, cmd: string, nums: string) => {
    const n = nums.trim().split(/[\s,]+/).map(Number);
    return cmd + n.map((v, i) => (i % 2 || v <= 205 ? v : f(205 + (v - 205) * k))).join(' ') + ' ';
  });

/** Moves a plate's free points toward its base so young crests are short. */
const plate = (q: number[], s: number): string => {
  const n = q.length;
  const bx = (q[0] + q[n - 2]) / 2;
  const by = (q[1] + q[n - 1]) / 2;
  let d = '';
  for (let i = 0; i < n; i += 2) {
    const k = i === 0 || i === n - 2 ? 1 : s;
    d += `${i ? 'L' : 'M'}${f(bx + (q[i] - bx) * k)} ${f(by + (q[i + 1] - by) * k)} `;
  }
  return d + 'Z';
};

function draw(c: Ctx): Parts {
  const { p, A, line, shade, light, rim, SW, id } = c;
  const hot = lt(p.accent, 0.55);
  const crestDk = dk(p.accent, 0.3);
  const ridge = lt(p.wing, 0.12);
  const sk = c.stage === 'hatchling' ? 0.78 : c.stage === 'young' ? 0.9 : 1;
  const HD = snout(HEAD, sk);
  const defs = `<clipPath id="${id}B"><path d="${BODY}"/></clipPath><clipPath id="${id}H"><path d="${HD}"/></clipPath><clipPath id="${id}T"><path d="${TAIL}"/></clipPath><clipPath id="${id}W"><path d="${WING}"/></clipPath><clipPath id="${id}Th"><path d="${THIGH}"/></clipPath><clipPath id="${id}rim"><ellipse cx="128" cy="50" rx="66" ry="20"/></clipPath>
<linearGradient id="${id}w" x1="0" y1="1" x2="0.3" y2="0"><stop offset="0" stop-color="${p.wing}"/><stop offset="1" stop-color="${lt(p.wing, 0.3)}"/></linearGradient>`;

  // Wings: long pointed membrane, storm shadow along the cloud edge, lit leading
  // edge, covert streaks, bones, the arm and a wrist claw.
  const wing = (back: boolean): string => {
    const wr = c.r;
    let s = `<path d="${WING}" fill="${back ? dk(p.wing, 0.24) : `url(#${id}w)`}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${id}W)">`;
    s += `<path d="M-110 -52 Q-64 -36 -24 -8 L-4 4 L-4 14 L-110 14Z" fill="${dk(p.wing, 0.34)}" opacity="${back ? 0.25 : 0.5}"/>`;
    s += `<path d="M-10 -46 C-36 -55 -66 -59 -102 -56 L-92 -53 C-62 -54 -36 -51 -10 -41Z" fill="${lt(p.wing, 0.42)}"/>`;
    if (c.fine) for (let i = 0; i < 8; i++) {
      const x = -22 - i * 9.5;
      const y = -48 - i * 0.9;
      s += `<path d="M${f(x)} ${f(y + 2)} l${f(-6 - wr() * 3)} ${f(3 + wr() * 2)}" stroke="${dk(p.wing, 0.4)}" stroke-width="0.9" stroke-linecap="round" opacity="0.55"/>`;
    }
    if (c.portrait && !back) {
      // Close up: fine veins fanning to the cloud edge, and a few static specks.
      for (let i = 0; i < 10; i++) {
        const t = i / 9;
        s += `<path d="M${f(-14 - t * 6)} ${f(-42 + t * 30)} Q${f(-40 - t * 20)} ${f(-42 + t * 26)} ${f(-90 + t * 68)} ${f(-46 + t * 46)}" stroke="${dk(p.wing, 0.42)}" stroke-width="0.6" fill="none" opacity="0.5"/>`;
      }
      for (let i = 0; i < 16; i++) s += `<circle cx="${f(-80 + wr() * 66)}" cy="${f(-46 + wr() * 34)}" r="${f(0.5 + wr() * 0.7)}" fill="${lt(p.wing, 0.5)}" opacity="0.55"/>`;
    }
    s += `</g>`;
    s += `<path d="${EDGE}" stroke="${lt(p.wing, 0.5)}" stroke-width="1.2" fill="none" opacity="0.85" stroke-linecap="round"/>`;
    s += `<path d="${BONES}" stroke="${back ? line : dk(p.wing, 0.45)}" stroke-width="${f(SW * 0.9)}" stroke-linecap="round" fill="none"/>`;
    if (c.fine) s += `<path d="M-10 -47 L-96 -56 M-10 -46 L-66 -33" stroke="${lt(p.wing, 0.38)}" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    s += `<path d="M0 0 C6 -16 2 -34 -10 -46" stroke="${line}" stroke-width="${f(SW * 1.9)}" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M2.4 -6 C6 -18 3 -32 -7 -43" stroke="${light}" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    s += `<path d="M-10 -46 l3 -8 l3 7z" fill="${p.accent}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
    s += `<path d="M-102 -56 l-5 -2 l5 -1z" fill="${p.belly}" stroke="${line}" stroke-width="0.7"/>`;
    for (const [x, y] of [[-68, -32], [-36, -8]]) s += `<circle cx="${x}" cy="${y}" r="1.5" fill="${p.belly}" stroke="${line}" stroke-width="0.7"/>`;
    return s;
  };

  // Jagged ridge down the neck and back: angular two-tone spikes with lit tips.
  let back = '';
  RIDGE.forEach(([x, y, h0], i) => {
    const h = h0 * (0.4 + A.spine * 0.6);
    const tx = x - h * 0.55;
    back += `<path d="M${f(x - 4.4)} ${f(y + 3)} L${f(tx)} ${f(y - h)} L${f(x + 4.4)} ${f(y + 3)}Z" fill="${ridge}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`;
    back += `<path d="M${f(x + 0.2)} ${f(y + 3)} L${f(tx)} ${f(y - h)} L${f(x + 4.4)} ${f(y + 3)}Z" fill="${dk(p.wing, 0.25)}"/>`;
    if (c.fine) back += `<path d="M${f(tx + h * 0.2)} ${f(y - h * 0.62)} L${f(tx)} ${f(y - h)} L${f(tx + h * 0.36)} ${f(y - h * 0.7)}Z" fill="${lt(p.accent, 0.2)}" opacity="0.9"/>`;
    const next = RIDGE[i + 1];
    if (c.portrait && next) {
      const mx = (x + next[0]) / 2;
      const my = (y + next[1]) / 2 + 1;
      back += `<path d="M${f(mx - 2.4)} ${f(my + 3)} L${f(mx - h * 0.3)} ${f(my - h * 0.45)} L${f(mx + 2.4)} ${f(my + 3)}Z" fill="${dk(p.wing, 0.1)}" stroke="${line}" stroke-width="0.9" stroke-linejoin="round"/>`;
    }
  });

  // Thin tail: cel bands, scale row, belly stripe, small saw spikes, glowing bolt tip.
  let tail = `<path d="${TAIL}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  tail += `<g clip-path="url(#${id}T)"><path d="M8 3 C-16 0 -40 8 -60 17 L-92 20 L-92 40 L8 40Z" fill="${shade}"/><path d="M4 -8 C-14 -12 -32 -7 -48 2 L-46 -3 C-32 -10 -14 -12 4 -10Z" fill="${light}"/>`;
  if (c.fine) {
    const n = c.portrait ? 24 : 14;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      tail += `<path d="M${f(2 - t * 76)} ${f(-6 + t * 18 + (i % 2) * 3)} l2.2 -1.6 l2.2 1.6 l-2.2 1.6z" fill="${shade}" opacity="0.4"/>`;
    }
  }
  tail += `</g>`;
  tail += `<path d="M4 7 C-16 5 -32 8 -46 14 C-58 18 -70 19 -80 17" stroke="${p.belly}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  for (const [x, y, h] of [[-8, -12, 6], [-22, -11, 5], [-36, -5, 4.4], [-49, 2, 3.6], [-62, 9, 3]]) {
    const hh = h * A.spine + 1.6;
    tail += `<path d="M${f(x - 3)} ${f(y + 2)} L${f(x - 1.4 - hh * 0.6)} ${f(y - hh)} L${f(x + 3)} ${f(y + 2)}Z" fill="${ridge}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>`;
  }
  const bolt = `<path d="${BOLT}" fill="${p.accent}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/><path d="M-11 3 L-10 8 L-28 3 L-14 1Z" fill="${crestDk}" opacity="0.5"/><path d="${BOLT_CORE}" fill="${hot}"/>` +
    (c.portrait ? `<path d="M-2 -1 L-7 -5 M-10 -2 L-15 -4 M-14 3 L-20 3.4" stroke="#fffbe6" stroke-width="0.8" stroke-linecap="round"/>` : '');
  tail += `<g transform="translate(-86 14.5) scale(${f(0.75 + A.spine * 0.25)})">${c.glow(bolt)}</g>`;

  // Body: base, shadow, light, scales, markings, zigzag flank stripes, rim, keel plates.
  let body = `<path d="${BODY}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 1.1)}" stroke-linejoin="round"/>`;
  body += `<g clip-path="url(#${id}B)">`;
  body += `<path d="M60 97 C88 93 112 99 136 96 C158 93 172 82 192 66 L206 130 L60 130Z" fill="${shade}"/>`;
  body += `<path d="M82 82 C90 74 104 70 120 69 C138 67 150 64 160 56 C166 51 170 46 173 40 L177 42 C172 52 164 62 150 67 C132 72 108 72 84 86Z" fill="${light}"/>`;
  if (c.fine) {
    const step = c.portrait ? 4 : 5;
    for (let y = 61; y < 100; y += step) {
      for (let x = 82 + ((y / step) % 2) * 3.5; x < 192; x += c.portrait ? 5.5 : 7) {
        const top = 66 - (x > 120 ? (x - 120) * 0.25 : 0) - (x > 150 ? (x - 150) * 0.7 : 0) + (x < 92 ? (92 - x) * 0.8 : 0);
        if (y < top || (x < 120 && y > 98) || (x > 186 - (y - 60) * 0.1 && y > 70)) continue;
        body += `<path d="M${f(x)} ${y} l2.6 -2.6 l2.6 2.6 l-2.6 1.4z" fill="${y > 86 ? line : shade}" opacity="${y > 86 ? 0.16 : 0.32}"/>`;
      }
    }
  }
  body += c.marks(BODY);
  const zigs = c.portrait ? [...ZIGS, ...PORTRAIT_ZIGS] : ZIGS;
  body += zigs.map((d) => `<path d="${d}" stroke="${dk(p.body, 0.4)}" stroke-width="5" fill="none" opacity="0.5" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${p.accent}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  if (c.fine) body += zigs.map((d) => `<path d="${d}" stroke="${hot}" stroke-width="0.8" fill="none" opacity="0.8" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -0.8)"/>`).join('');
  if (c.portrait) for (let i = 0; i < 26; i++) body += `<circle cx="${f(88 + c.r() * 96)}" cy="${f(66 + c.r() * 28)}" r="${f(0.4 + c.r() * 0.6)}" fill="${c.light}" opacity="0.7"/>`;
  // Keel chest: belly plates follow the deep chest.
  body += `<path d="${BELLY}" fill="${p.belly}"/>`;
  body += `<path d="M124 104 L130 100 C138 108 150 112 160 110 C170 106 176 96 178 86 L183 90 C180 104 172 116 160 120 C146 122 132 112 124 104Z" fill="${dk(p.belly, 0.2)}"/>`;
  const plates: Array<[number, number, number, number]> = [[193, 52, 186, 50], [190, 61, 183, 58], [188, 70, 181, 67], [186, 79, 179, 77], [185, 88, 178, 86], [183, 97, 176, 94], [179, 106, 172, 102], [172, 114, 165, 108], [162, 119, 158, 111], [151, 118, 148, 110], [140, 113, 138, 106]];
  plates.forEach(([x1, y1, x2, y2]) => {
    if (c.fine) body += `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${p.accent}" stroke-width="2.4" opacity="0.3" stroke-linecap="round"/>`;
    body += `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${dk(p.belly, 0.45)}" stroke-width="1.1" stroke-linecap="round"/>`;
    if (c.portrait) body += `<path d="M${f(x1 - 1.5)} ${f(y1 - 2.6)} L${f(x2 - 0.5)} ${f(y2 - 2.4)}" stroke="${lt(p.belly, 0.6)}" stroke-width="0.7" opacity="0.8" stroke-linecap="round"/>`;
  });
  body += `<path d="M189 54 C185 68 183 82 181 94" stroke="${lt(p.belly, 0.6)}" stroke-width="1.2" fill="none" opacity="0.8" stroke-linecap="round"/>`;
  body += `<path d="M150 80 C160 88 164 100 160 112" stroke="${shade}" stroke-width="1.6" fill="none" opacity="0.6" stroke-linecap="round"/>`;
  body += `</g>`;
  body += `<path d="${BODY}" fill="none" stroke="${rim}" stroke-width="3" opacity="0.85" clip-path="url(#${id}rim)"/>`;

  // Legs: slim raptor shins with white talons.
  let legs = `<path d="${THIGH}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.9)}"/>`;
  legs += `<path d="M88 108 C94 116 106 116 112 104 L112 120 L84 120Z" fill="${shade}" clip-path="url(#${id}Th)"/><path d="M95 96 C100 92 106 93 108 97 C102 96 99 97 95 100Z" fill="${light}"/>`;
  if (c.fine) legs += `<path d="M96 101 l3.6 -2 l3.6 2 l-3.6 2z M101 107 l3.6 -2 l3.6 2 l-3.6 2z" fill="${shade}" opacity="0.5"/>`;
  if (c.portrait) for (let i = 0; i < 8; i++) legs += `<path d="M${f(89 + (i % 4) * 5)} ${f(104 + Math.floor(i / 4) * 5)} l2.2 -1.6 l2.2 1.6 l-2.2 1.6z" fill="${shade}" opacity="0.45"/>`;
  legs += `<path d="${FOOT}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
  legs += `<path d="${ARM}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/><path d="M169 108 C171 113 174 116 178 117" stroke="${shade}" stroke-width="1.8" fill="none" opacity="0.6"/>`;
  legs += `<g fill="#fffdf5" stroke="${line}" stroke-width="0.8" stroke-linejoin="round">${CLAWS.map(([x, y, k]) => `<path d="M${x} ${y} l${f(3.4 * k)} 0.4 l${f(-2 * k)} 2.8z"/>`).join('')}</g>`;
  if (c.portrait) legs += `<g fill="${dk(p.belly, 0.25)}">${CLAWS.map(([x, y, k]) => `<path d="M${f(x + 1.4 * k)} ${f(y + 0.3)} l${f(1.8 * k)} 0.2 l${f(-1.6 * k)} 2.4z"/>`).join('')}</g>`;

  // Head: the swept-back crest (layered plates with glowing cores), angular head,
  // cel bands, brow plate, beak-like snout, smile, eye.
  let head = '';
  const s = 0.3 + 0.7 * A.spine;
  let cores = '';
  head += `<path d="${plate(WEB, s)}" fill="${dk(p.accent, 0.42)}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`;
  PLATES.forEach((q, i) => {
    const d = plate(q, s);
    head += `<path d="${d}" fill="${i ? dk(p.accent, 0.08 * i) : p.accent}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>`;
    // Lower half in shadow: from the back base point to the tip.
    const lo = [q[0], q[1], q[4], q[5], ...q.slice(6)];
    head += `<path d="${plate(lo, s)}" fill="${crestDk}" opacity="0.75"/>`;
    // A bright core along the upper edge.
    const core = [q[0] - 3, q[1] + 1, q[2], q[3] + 2, q[4] + 6, q[5] + 2.4, q[2] + 2, q[3] + 4.6, q[0] - 6, q[1] + 3];
    cores += `<path d="${plate(core, s)}" fill="${hot}"/>`;
    if (c.portrait) cores += `<path d="M${f(q[0] - 8)} ${f(q[1] + 1.6)} L${f(q[0] - 8 + (q[2] - q[0] + 8) * s)} ${f(q[1] + 1.6 + (q[3] + 3 - q[1] - 1.6) * s)}" stroke="#fffbe6" stroke-width="0.7" stroke-linecap="round" opacity="0.9"/>`;
  });
  head += c.glow(cores);
  if (c.portrait) for (let i = 0; i < 6; i++) head += `<path d="M${f(184 - i * 5)} ${f(30 - i * 2.2 * s)} l2 3.4" stroke="${line}" stroke-width="0.7" opacity="0.5"/>`;
  head += `<path d="${HD}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  head += `<g clip-path="url(#${id}H)"><path d="M172 55 C190 55 212 56 240 45 L240 70 L172 70Z" fill="${shade}"/><path d="M180 40 C185 31 194 27 206 28 C198 31 190 35 184 44Z" fill="${light}"/><path d="${snout('M214 30 L228 35.5 L236 41 L233 42.5 L226 38 L213 33Z', sk)}" fill="${light}"/>`;
  if (c.fine) for (let i = 0; i < (c.portrait ? 9 : 5); i++) head += `<path d="M${f(182 + i * (c.portrait ? 4 : 6))} ${f(55 - (i % 2) * 2)} l2.2 -2 l2.2 2 l-2.2 1.6z" fill="${shade}" opacity="0.4"/>`;
  if (c.portrait) for (let i = 0; i < 6; i++) head += `<circle cx="${f(212 + c.r() * 18)}" cy="${f(38 + c.r() * 8)}" r="0.6" fill="${line}" opacity="0.35"/>`;
  head += `</g>`;
  // Angular brow plate, arched (friendly, not frowning).
  head += `<path d="M189 ${f(38.4 - A.eye)} C194 ${f(35 - A.eye)} 201 ${f(34.6 - A.eye)} 207 ${f(37.2 - A.eye)}" stroke="${line}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  head += `<path d="${snout('M202 60 L220 55 L234 50 C229 56 217 61 205 63Z', sk)}" fill="${p.belly}"/>`;
  head += `<path d="${snout('M205 57.5 C214 56.5 223 53.5 231 49 Q233.5 47.6 234.5 49', sk)}" stroke="${line}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  head += `<path d="M${f(205 + 14 * sk)} ${f(55.2 + (1 - sk) * 3)} l1.6 3 l1.6 -3.4z" fill="#fff" stroke="${line}" stroke-width="0.4"/>`;
  head += `<path d="M${f(205 + 22.5 * sk)} ${f(38.6 + (1 - sk) * 4)} l4.4 1 l-3.2 2.2z" fill="${line}"/>`;
  const tx = 199 + (141 - 199) * s;
  const ty = 30.5 + (-4 - 30.5) * s;
  if (c.fine) head += `<g class="cel-puff"><path d="M${f(tx + 4)} ${f(ty + 1)} l2 -3 l-0.6 2.4 l2 -0.6 l-2 3 l0.6 -2.4z" fill="${hot}"/><circle cx="${f(tx + 11)}" cy="${f(ty + 5)}" r="1" fill="${p.accent}" opacity="0.8"/></g>`;
  if (c.fine) head += `<path d="M208 50.5 l5 -1.2 M209 52.6 l5 -0.4" stroke="${dk(p.body, 0.25)}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>`;
  head += `<ellipse cx="208" cy="50" rx="3.8" ry="2.2" fill="#ff8fab" opacity="0.45"/>`;
  const iris = luma(p.accent) > 0.92 ? lt(p.wing, 0.2) : mix(dk(p.accent, 0.12), '#f08c00', 0.12);
  head += celEye(c, 197, 42, iris);

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

export const STORMCREST: TribeArt = { draw };
