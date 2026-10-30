// Tidefin, the reef swimmer: a slim streamlined body on a long curved neck, a
// ribbed see-through sail along the back, frilled fin ears, broad fin wings with a
// wave edge and a two-lobed fluke at the tail tip.

import { celEye, dk, f, lt, mix, type Ctx, type Parts, type TribeArt } from './cel';

const BODY = 'M66 94 C66 82 86 73 112 69 C130 66 145 65 155 58 C163 52 167 45 171 37 L195 45 C195 57 188 69 179 82 C168 98 150 105 120 105 C94 105 66 104 66 94Z';
const BELLY = 'M78 100 C98 106 132 106 150 100 C164 94 172 84 179 72 C183 64 186 58 188 52 L195 54 C193 66 186 80 178 90 C164 104 136 112 104 110 C92 109 84 106 78 100Z';
const TAIL = 'M8 -14 C-12 -17 -32 -11 -48 -2 C-58 4 -68 8 -80 8 C-70 17 -58 17 -47 11 C-32 4 -14 6 8 10Z';
const FLUKE = 'M-76 6 C-84 -1 -94 -8 -108 -11 C-102 -2 -98 6 -95 11 C-98 16 -102 24 -108 32 C-94 28 -84 22 -76 15Z';
const HEAD = 'M172 46 C170 32 184 24 200 25 C213 26 222 31 229 37 C235 42 236 49 231 53 C224 57 213 59 202 60 C191 61 181 60 176 55 C173 52 172 49 172 46Z';
// Wing: arm bone up to the tip, then a scalloped fin edge back down to the root.
const RAYS: Array<[number, number]> = [[-26, -66], [-46, -62], [-61, -48], [-69, -31], [-62, -14]];
const THIGH = 'M92 91 C84 97 84 108 92 111 C100 114 109 108 109 99 C107 91 99 87 92 91Z';
const FOOT = 'M97 108 C93 114 88 117 81 118 Q78 121 73 122 Q75 118.5 72 116.5 Q76 115.5 75 112.5 Q79 113.5 82 112 C87 110 90 107 91 103Z';
const FARLEG = 'M99 99 C96 109 90 114 82 116 Q78 119 74 119 Q76 116 73 114 Q77 113 77 110 C84 108 89 103 91 96Z';
const ARM = 'M150 95 C153 103 158 107 165 108 Q168 111 172 111 Q170 108 173 105.5 Q169 105 168 101.5 C162 100 157 96 155 90Z';
const SAIL: Array<[number, number, number]> = [[80, 82, 9], [92, 77, 13], [104, 73, 16], [116, 70, 18], [128, 68, 20], [140, 66, 22], [150, 62, 23], [159, 56, 20], [166, 49, 13]];
const WAVES = ['M92 88 q5 -5 10 0 t10 0 a3.4 3.4 0 1 0 -3.4 -4', 'M126 82 q5 -5 10 0 t10 0 t10 0 a3.4 3.4 0 1 0 -3.4 -4', 'M150 70 q4 -4 8 0 t8 -1'];
const PORTRAIT_WAVES = ['M108 95 q4 -4 8 0 t8 0 a2.6 2.6 0 1 0 -2.6 -3', 'M140 92 q4 -4 8 0 t8 -1'];
const GLINTS: Array<[number, number]> = [[90, 82], [100, 78], [118, 74], [134, 72], [148, 68], [160, 60], [110, 86], [126, 79], [142, 77], [156, 70]];

/** Webbing that sags in between the tips of the fin rays: the scalloped wave edge. */
const scallop = (pts: Array<[number, number]>, cx: number, cy: number, sag: number): string =>
  pts
    .slice(1)
    .map(([x, y], i) => {
      const [px, py] = pts[i];
      const mx = (x + px) / 2;
      const my = (y + py) / 2;
      return `Q${f(mx + (cx - mx) * sag)} ${f(my + (cy - my) * sag)} ${x} ${y}`;
    })
    .join(' ');

function draw(c: Ctx): Parts {
  const { p, A, line, shade, light, rim, SW, id } = c;
  const fin = mix(p.accent, p.belly, 0.3);
  const finDk = dk(p.accent, 0.3);
  const pearl = lt(p.belly, 0.7);
  const wingD = `M0 0 C10 -20 4 -48 ${RAYS[0][0]} ${RAYS[0][1]} ${scallop(RAYS, -6, -26, 0.22)} Q-30 -8 -8 2Z`;
  let defs = `<clipPath id="${id}B"><path d="${BODY}"/></clipPath><clipPath id="${id}H"><path d="${HEAD}"/></clipPath><clipPath id="${id}T"><path d="${TAIL}"/></clipPath><clipPath id="${id}W"><path d="${wingD}"/></clipPath><clipPath id="${id}L"><path d="${BELLY}"/></clipPath><clipPath id="${id}Th"><path d="${THIGH}"/></clipPath><clipPath id="${id}rim"><ellipse cx="120" cy="56" rx="70" ry="16"/></clipPath>
<linearGradient id="${id}w" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${p.wing}"/><stop offset="1" stop-color="${lt(p.wing, 0.3)}"/></linearGradient>`;

  // Wings: fin membrane, shadow band, lit panel, rays with sheen, wave edge, arm.
  const wing = (back: boolean): string => {
    const wr = c.r;
    let s = `<path d="${wingD}" fill="${back ? dk(p.wing, 0.22) : `url(#${id}w)`}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${id}W)">`;
    s += `<path d="M-84 -30 Q-40 -18 12 -10 L12 12 L-84 12Z" fill="${dk(p.wing, 0.32)}" opacity="${back ? 0.25 : 0.5}"/>`;
    s += `<path d="M2 -8 C6 -30 0 -50 -26 -66 L-34 -60 C-14 -48 -6 -30 -4 -6Z" fill="${lt(p.wing, 0.4)}" opacity="0.8"/>`;
    // A light band just inside the scalloped edge, like sun through thin skin.
    s += `<path d="M${RAYS[0][0]} ${RAYS[0][1]} ${scallop(RAYS, -6, -26, 0.22)}" stroke="${lt(p.wing, 0.45)}" stroke-width="5" fill="none" opacity="0.45"/>`;
    if (c.fine) for (let i = 0; i < 8; i++) s += `<ellipse cx="${f(-56 + wr() * 34)}" cy="${f(-46 + wr() * 40)}" rx="${f(1.2 + wr() * 1.6)}" ry="${f(0.9 + wr() * 1.1)}" fill="${lt(p.wing, 0.55)}" opacity="0.4"/>`;
    if (c.portrait && !back) {
      // Fine cross veins between the rays and pearly specks.
      RAYS.slice(0, -1).forEach(([x, y], i) => {
        const [nx, ny] = RAYS[i + 1];
        for (let k = 1; k < 4; k++) {
          const t = k / 4;
          s += `<path d="M${f(-4 + (x + 4) * t)} ${f(-6 + (y + 6) * t)} Q${f(-4 + ((x + nx) / 2 + 4) * t * 0.92)} ${f(-6 + ((y + ny) / 2 + 6) * t * 0.92)} ${f(-4 + (nx + 4) * t)} ${f(-6 + (ny + 6) * t)}" stroke="${dk(p.wing, 0.38)}" stroke-width="0.6" fill="none" opacity="0.5"/>`;
        }
      });
      for (let i = 0; i < 12; i++) s += `<circle cx="${f(-60 + wr() * 54)}" cy="${f(-54 + wr() * 50)}" r="${f(0.5 + wr() * 0.8)}" fill="${pearl}" opacity="0.75"/>`;
    }
    s += `</g>`;
    const rays = RAYS.slice(1).map(([x, y]) => `M-4 -6 L${x} ${y}`).join(' ');
    s += `<path d="${rays}" stroke="${back ? line : dk(p.wing, 0.42)}" stroke-width="${f(SW * 0.8)}" stroke-linecap="round" fill="none"/>`;
    if (c.fine) s += `<path d="${RAYS.slice(1).map(([x, y]) => `M-6 -8 L${f(x * 0.94 - 1)} ${f(y * 0.94 - 1)}`).join(' ')}" stroke="${lt(p.wing, 0.4)}" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    s += `<path d="M0 0 C10 -20 4 -48 -26 -66" stroke="${line}" stroke-width="${f(SW * 1.8)}" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M2 -6 C9 -22 4 -44 -22 -62" stroke="${light}" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    for (const [x, y] of RAYS.slice(1)) s += `<circle cx="${x}" cy="${y}" r="1.5" fill="${p.accent}" stroke="${line}" stroke-width="0.7"/>`;
    return s;
  };

  // Dorsal sail: see-through webbing on ribs, scalloped top, glowing spots.
  const tips: Array<[number, number]> = SAIL.map(([x, y, h]) => [f(x - h * A.spine * 0.4), f(y - h * A.spine)]);
  const sailD = `M${SAIL[0][0] - 6} ${SAIL[0][1] + 6} L${tips[0][0]} ${tips[0][1]} ${scallop(tips, 124, 90, 0.12)} L${SAIL[8][0] + 6} ${SAIL[8][1] + 8}Z`;
  defs += `<clipPath id="${id}S"><path d="${sailD}"/></clipPath>`;
  let back = `<path d="${sailD}" fill="${fin}" opacity="0.88" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`;
  back += `<g clip-path="url(#${id}S)"><path d="M80 78 C110 70 140 66 166 54 L166 80 L80 80Z" fill="${finDk}" opacity="0.4"/>`;
  back += `<path d="M${tips[0][0]} ${tips[0][1]} ${scallop(tips, 124, 90, 0.12)}" stroke="${lt(fin, 0.55)}" stroke-width="4" fill="none" opacity="0.6"/>`;
  if (c.fine) for (let i = 0; i < SAIL.length - 1; i++) {
    // Thin veins between the ribs (more close up).
    const n = c.portrait ? 4 : 2;
    const [x, y] = SAIL[i];
    const [tx, ty] = tips[i];
    const [nx, ny] = SAIL[i + 1];
    const [ntx, nty] = tips[i + 1];
    for (let k = 1; k < n; k++) {
      const t = k / n;
      back += `<path d="M${f(x + (nx - x) * t)} ${f(y + (ny - y) * t)} L${f(tx + (ntx - tx) * t)} ${f(ty + (nty - ty) * t + 2)}" stroke="${finDk}" stroke-width="0.5" opacity="0.45"/>`;
    }
  }
  // Pearly specks caught in the webbing.
  if (c.fine) for (let i = 0; i < (c.portrait ? 16 : 8); i++) back += `<circle cx="${f(86 + c.r() * 76)}" cy="${f(50 + c.r() * 20)}" r="${f(0.5 + c.r() * 0.6)}" fill="${pearl}" opacity="0.7"/>`;
  back += `</g>`;
  back += `<path d="${SAIL.map(([x, y], i) => `M${x} ${y + 2} L${tips[i][0]} ${tips[i][1]}`).join(' ')}" stroke="${finDk}" stroke-width="2" stroke-linecap="round"/>`;
  if (c.fine) back += `<path d="${SAIL.map(([x, y], i) => `M${x + 1.2} ${y} L${f(tips[i][0] + 1)} ${f(tips[i][1] + 2)}`).join(' ')}" stroke="${lt(p.accent, 0.5)}" stroke-width="0.8" stroke-linecap="round" opacity="0.8"/>`;
  back += tips.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${p.accent}" stroke="${line}" stroke-width="0.8"/>`).join('');
  let spots = '';
  for (let i = 0; i < SAIL.length - 1; i++) {
    const x = (SAIL[i][0] + tips[i][0] + SAIL[i + 1][0] + tips[i + 1][0]) / 4;
    const y = (SAIL[i][1] + tips[i][1] + SAIL[i + 1][1] + tips[i + 1][1]) / 4;
    spots += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.6 + A.spine)}" fill="${lt(p.accent, 0.65)}" opacity="0.9"/>`;
    if (c.fine) spots += `<circle cx="${f(x - 1.5)}" cy="${f(y - 4 * A.spine)}" r="1" fill="${lt(p.accent, 0.8)}"/>`;
  }
  back += c.glow(spots);

  // Tail: slim with cel shading, fish-scale arcs, belly stripe and the two-lobed fluke.
  let tail = `<path d="${TAIL}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  tail += `<g clip-path="url(#${id}T)"><path d="M10 3 C-16 1 -40 8 -60 18 L-60 40 L10 40Z" fill="${shade}"/><path d="M6 -11 C-14 -15 -32 -9 -46 -1 L-44 -5 C-30 -13 -14 -16 6 -13Z" fill="${light}"/>`;
  if (c.fine) {
    const n = c.portrait ? 26 : 16;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      tail += `<path d="M${f(-t * 70)} ${f(-6 + t * 12 + (i % 2) * 4)} a2.4 2.4 0 0 0 4.8 0" stroke="${shade}" stroke-width="0.9" fill="none" opacity="0.5"/>`;
    }
  }
  tail += `<path d="M10 9 C-14 5 -32 7 -48 13" stroke="${p.belly}" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>`;
  tail += `<path d="M-14 -16 C-26 ${f(-16 - 8 * A.spine)} -40 ${f(-10 - 8 * A.spine)} -50 -2 Q-34 -10 -14 -16Z" fill="${fin}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round" opacity="0.92"/>`;
  tail += `<path d="${FLUKE}" fill="${fin}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>`;
  tail += `<path d="M-78 12 C-86 18 -94 24 -104 30 C-94 27 -84 22 -76 15Z" fill="${finDk}" opacity="0.55"/>`;
  tail += `<path d="M-78 8 L-104 -9 M-78 9 L-98 1 M-78 13 L-98 20 M-78 14 L-104 30" stroke="${finDk}" stroke-width="1.3" stroke-linecap="round"/>`;
  tail += `<path d="M-80 5 C-88 0 -96 -5 -104 -8" stroke="${lt(fin, 0.6)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  if (c.portrait) tail += `<path d="M-84 6 L-100 -4 M-84 15 L-100 25 M-88 9 L-96 9" stroke="${finDk}" stroke-width="0.6" opacity="0.6"/><circle cx="-100" cy="-7" r="1" fill="${pearl}"/><circle cx="-100" cy="28" r="1" fill="${pearl}"/>`;

  // Body: base, shadow, light, fish scales, markings, wave curls, pearl glints, rim, belly.
  let body = `<path d="${BODY}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 1.1)}" stroke-linejoin="round"/>`;
  body += `<g clip-path="url(#${id}B)">`;
  body += `<path d="M60 96 C92 92 126 96 150 88 C164 82 176 72 196 60 L204 120 L60 120Z" fill="${shade}"/>`;
  body += `<path d="M74 84 C86 74 102 70 124 68 C142 67 152 64 160 56 C164 52 166 48 169 42 L174 43 C170 54 162 64 146 70 C124 74 100 74 78 88Z" fill="${light}"/>`;
  if (c.fine) {
    const step = c.portrait ? 3.4 : 4.2;
    const w = c.portrait ? 4.6 : 6;
    for (let y = 70; y < 94; y += step) {
      const row = Math.round(y / step);
      for (let x = 78 + (row % 2) * (w / 2); x < 186; x += w) {
        const top = x < 110 ? 70 + (110 - x) * 0.35 : x < 154 ? 68 - (x - 110) * 0.12 : 63 - (x - 154) * 1.1;
        const bot = x < 160 ? 96 : 96 - (x - 160) * 1.1;
        if (y < top + 2 || y > bot) continue;
        body += `<path d="M${f(x)} ${f(y)} a${f(w / 2)} ${f(w / 2)} 0 0 0 ${f(w)} 0" stroke="${y > 84 ? line : shade}" stroke-width="0.8" fill="none" opacity="${y > 84 ? 0.18 : 0.35}"/>`;
      }
    }
  }
  body += c.marks(BODY);
  const waves = c.portrait ? [...WAVES, ...PORTRAIT_WAVES] : WAVES;
  body += waves.map((d) => `<path d="${d}" stroke="${p.accent}" stroke-width="3.6" fill="none" opacity="0.28" stroke-linecap="round"/>`).join('');
  body += waves.map((d) => `<path d="${d}" stroke="${lt(p.accent, 0.4)}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.9"/>`).join('');
  // Gill stripes along the neck.
  for (let i = 0; i < 3; i++) {
    const x = 158 + i * 5;
    const y = 72 - i * 4;
    body += `<path d="M${x} ${y} q-3 6 -2 12" stroke="${dk(p.body, 0.38)}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    if (c.fine) body += `<path d="M${x + 1.6} ${y + 1} q-2.4 5 -1.6 9.6" stroke="${light}" stroke-width="0.8" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  }
  // Pearly scale glints.
  if (c.fine) for (const [x, y] of c.portrait ? [...GLINTS, ...Array.from({ length: 22 }, () => [f(80 + c.r() * 100), f(70 + c.r() * 22)] as [number, number])] : GLINTS) {
    body += `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.2" fill="${pearl}" opacity="0.7" transform="rotate(-20 ${x} ${y})"/>`;
  }
  body += `</g>`;
  body += `<path d="${BODY}" fill="none" stroke="${rim}" stroke-width="3" opacity="0.85" clip-path="url(#${id}rim)"/>`;
  body += `<path d="${BELLY}" fill="${p.belly}"/><g clip-path="url(#${id}L)">`;
  body += `<path d="M78 100 C104 108 140 106 160 98 C164 106 140 114 104 112Z" fill="${dk(p.belly, 0.2)}"/>`;
  [92, 104, 116, 128, 140, 151, 161, 170, 177, 183].forEach((x, i) => {
    const y = 109 - (i > 4 ? (i - 4) ** 1.35 * 6 : 0) - i * 0.4;
    if (c.fine) body += `<path d="M${x} ${f(y - 9)} q3 4 1 10" stroke="${p.accent}" stroke-width="2.4" fill="none" opacity="0.3" stroke-linecap="round"/>`;
    body += `<path d="M${x} ${f(y - 9)} q3 4 1 10" stroke="${dk(p.belly, 0.4)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    if (c.portrait) body += `<path d="M${x + 3} ${f(y - 7)} q2 3 1 6" stroke="${lt(p.belly, 0.6)}" stroke-width="0.8" fill="none" opacity="0.8" stroke-linecap="round"/>`;
  });
  body += `<path d="M86 101 C108 107 132 107 150 100" stroke="${lt(p.belly, 0.6)}" stroke-width="1.2" fill="none" opacity="0.8" stroke-linecap="round"/></g>`;

  // Legs: slim, with webbed paddle feet.
  const web = mix(p.belly, p.accent, 0.35);
  let legs = `<path d="${THIGH}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.9)}"/>`;
  legs += `<path d="M88 104 C92 112 104 112 110 102 L110 118 L82 118Z" fill="${shade}" clip-path="url(#${id}Th)"/><path d="M94 94 C99 90 105 91 107 95 C102 94 98 95 94 98Z" fill="${light}"/>`;
  if (c.fine) legs += `<path d="M95 99 a2.4 2.4 0 0 0 4.8 0 M100 104 a2.4 2.4 0 0 0 4.8 0" stroke="${shade}" stroke-width="0.8" fill="none" opacity="0.6"/>`;
  if (c.portrait) for (let i = 0; i < 6; i++) legs += `<path d="M${f(88 + (i % 3) * 5)} ${f(101 + Math.floor(i / 3) * 4)} a2 2 0 0 0 4 0" stroke="${shade}" stroke-width="0.7" fill="none" opacity="0.5"/>`;
  legs += `<path d="${FOOT}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
  legs += `<path d="M82 112 Q79 115 75 112.5 Q76 115.5 72 116.5 Q75 118.5 73 122 Q78 121 81 118Z" fill="${web}"/>`;
  legs += `<path d="${ARM}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
  legs += `<path d="M165 108 Q168 111 172 111 Q170 108 173 105.5 Q169 105 168 101.5Z" fill="${web}"/><path d="M157 98 C159 104 162 106 166 107" stroke="${shade}" stroke-width="2" fill="none" opacity="0.6"/>`;
  if (c.portrait) legs += `<path d="M75 115 l4 -1 M74 119 l5 -1.4 M169 107.5 l3 0.5 M168 105 l3 -1" stroke="${dk(web, 0.3)}" stroke-width="0.6" opacity="0.7"/>`;

  // Head: fin ears and cheek frills, smooth rounded snout, gentle smile, eye.
  const k = A.spine;
  const ear: Array<[number, number]> = [[f(176 - 14 * k), f(32 - 16 * k)], [f(170 - 18 * k), f(36 - 6 * k)], [f(170 - 14 * k), f(42 + 2 * k)]];
  const earD = `M190 30 L${ear[0][0]} ${ear[0][1]} ${scallop(ear, 186, 38, 0.22)} L180 46Z`;
  const cheek: Array<[number, number]> = [[f(178 - 8 * k), f(52 + k)], [f(176 - 9 * k), f(57 + 4 * k)], [f(182 - 4 * k), f(59 + 7 * k)]];
  const cheekD = `M182 50 L${cheek[0][0]} ${cheek[0][1]} ${scallop(cheek, 184, 56, 0.25)} L190 58Z`;
  let head = '';
  if (c.stage !== 'hatchling') {
    // Grown-ups get a small crest fin on top of the head (taller on adults).
    const g = c.stage === 'adult' ? 1 : 0.6;
    head += `<path d="M200 26 C196 ${f(18 - 6 * g)} ${f(190 - 4 * g)} ${f(14 - 8 * g)} ${f(182 - 6 * g)} ${f(14 - 8 * g)} C186 ${f(20 - 2 * g)} 188 26 188 30Z" fill="${fin}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`;
    head += `<path d="M196 27 L${f(186 - 4 * g)} ${f(17 - 6 * g)} M192 29 L${f(184 - 4 * g)} ${f(22 - 4 * g)}" stroke="${finDk}" stroke-width="1" stroke-linecap="round"/>`;
  }
  head += `<path d="${earD}" fill="${fin}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`;
  head += `<path d="M188 32 L${ear[0][0]} ${ear[0][1]} M186 36 L${ear[1][0]} ${ear[1][1]} M184 40 L${ear[2][0]} ${ear[2][1]}" stroke="${finDk}" stroke-width="1.3" stroke-linecap="round"/>`;
  if (c.fine) head += `<path d="M${ear[0][0]} ${ear[0][1]} ${scallop(ear, 186, 38, 0.22)}" stroke="${lt(fin, 0.6)}" stroke-width="1.6" fill="none" opacity="0.8"/>`;
  head += `<path d="${cheekD}" fill="${fin}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`;
  head += `<path d="M184 52 L${cheek[0][0]} ${cheek[0][1]} M185 55 L${cheek[1][0]} ${cheek[1][1]} M187 57 L${cheek[2][0]} ${cheek[2][1]}" stroke="${finDk}" stroke-width="1.1" stroke-linecap="round"/>`;
  head += `<path d="${HEAD}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  head += `<g clip-path="url(#${id}H)"><path d="M170 54 C190 52 214 55 242 46 L242 66 L170 66Z" fill="${shade}"/><path d="M178 40 C184 31 195 28 207 29 C198 31 189 35 182 44Z" fill="${light}"/><path d="M212 31 C219 33 225 37 230 42 L229 44 C224 39 218 35 211 33Z" fill="${light}"/>`;
  if (c.fine) for (let i = 0; i < (c.portrait ? 9 : 5); i++) head += `<path d="M${f(182 + i * (c.portrait ? 4 : 6))} ${f(51 - (i % 2) * 2)} a2 2 0 0 0 4 0" stroke="${shade}" stroke-width="0.8" fill="none" opacity="0.5"/>`;
  if (c.portrait) for (let i = 0; i < 6; i++) head += `<ellipse cx="${f(206 + c.r() * 22)}" cy="${f(33 + c.r() * 10)}" rx="1.4" ry="0.8" fill="${pearl}" opacity="0.6"/>`;
  head += `</g>`;
  head += `<path d="M200 56 C210 57 220 56 228 52 C223 57 213 60 204 60Z" fill="${p.belly}"/>`;
  head += `<path d="M206 54 C214 56 221 55 228 50" stroke="${line}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  head += `<path d="M206 54 q-2 -1.4 -3 -3.4" stroke="${line}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  head += `<path d="M224 39 q1.8 -1.6 3.6 0" stroke="${line}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  if (c.fine) head += `<g class="cel-puff"><circle cx="232" cy="31" r="1.8" fill="${pearl}" stroke="${lt(p.accent, 0.2)}" stroke-width="0.6" opacity="0.85"/><circle cx="235" cy="26" r="1.2" fill="${pearl}" stroke="${lt(p.accent, 0.2)}" stroke-width="0.5" opacity="0.75"/></g>`;
  if (c.fine) head += `<ellipse cx="219" cy="34" rx="3" ry="1.4" fill="${pearl}" opacity="0.55" transform="rotate(20 219 34)"/>`;
  head += `<ellipse cx="210" cy="49" rx="3.8" ry="2.2" fill="#ff8fab" opacity="0.45"/>`;
  head += celEye(c, 197, 42, mix(p.accent, '#1864ab', 0.35));
  head += `<path d="M189 ${f(40 - A.eye)} C194 ${f(36.5 - A.eye)} 201 ${f(36.5 - A.eye)} 206 ${f(39.5 - A.eye)}" stroke="${line}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;

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

export const TIDEFIN: TribeArt = { draw };
