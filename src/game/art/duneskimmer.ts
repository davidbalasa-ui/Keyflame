// Duneskimmer: long, low and lean like a running desert lizard. Flat body, long
// whip tail with a fan frill, layered ribbed frills behind the eyes, a low sail
// ridge, very wide banded gliding wings and sand-dune ripples on the back.

import { celEye, dk, f, lt, luma, mix, type Ctx, type Parts, type TribeArt } from './cel';

const BODY = 'M76 92 C77 81 90 75 110 74 C130 73 147 71 159 63 C167 57 172 47 177 38 L198 52 C192 61 187 72 182 84 C178 94 170 100 158 101 C144 102 134 98 121 99 C105 100 91 104 83 101 C78 99 76 96 76 92Z';
const BELLY = 'M86 99 C99 97 111 95 122 95 C136 94 148 97 158 95 C168 92 175 83 180 71 L187 73 C184 86 178 97 166 100 C150 103 136 99 121 100 C105 101 94 103 86 99Z';
const TAIL = 'M10 -12 C-12 -15 -28 -10 -42 -3 C-54 3 -66 6 -79 5 C-84 5 -87 7 -86 9 C-85 11 -81 12 -77 11 C-64 11 -52 11 -40 7 C-24 3 -10 6 10 10Z';
const HEAD = 'M174 46 C172 34 184 27 198 28 C208 29 216 33 223 37 C230 40 235 44 235 49 C235 54 229 56 220 57 C210 58 196 61 186 60 C177 59 174 53 174 46Z';
const WING = 'M0 0 C4 -16 0 -34 -10 -46 L-36 -66 Q-50 -56 -74 -58 Q-78 -44 -102 -34 Q-82 -24 -80 -8 Q-54 -8 -34 6Z';
const WRIST: [number, number] = [-10, -46];
const TIPS: Array<[number, number]> = [[-36, -66], [-74, -58], [-102, -34], [-80, -8]];
const EDGE = 'M-36 -66 Q-50 -56 -74 -58 Q-78 -44 -102 -34 Q-82 -24 -80 -8 Q-54 -8 -34 6';
const THIGH = 'M86 90 C77 96 78 108 88 110 C98 112 106 104 104 94 C100 86 92 86 86 90Z';
const FOOT = 'M94 105 C88 112 80 116 70 117 L62 120 L66 115 L60 113 L68 112 C76 110 82 106 86 101Z';
const FARLEG = 'M100 98 C95 108 87 114 77 116 L69 119 L73 114 L67 112 L75 110 C83 108 87 102 91 96Z';
const ARM = 'M162 91 C168 101 174 107 182 109 L189 112 L186 107 L192 106 L184 103 C178 101 173 95 169 89Z';
const FARARM = 'M150 94 C156 103 162 108 170 110 L176 113 L173 108 L179 107 L171 104 C166 102 161 96 157 91Z';
const CLAWS: Array<[number, number, number]> = [[189, 112, 1], [192, 106, 1], [62, 120, -1], [60, 113, -1]];
// Points along the back where the sail ribs stand, hip to neck.
const SAIL: Array<[number, number]> = [[90, 77], [101, 75], [112, 74], [123, 73.5], [134, 73], [144, 71], [153, 67], [161, 61], [168, 53], [173, 45]];
const RIBS = [6, 9, 11, 12, 12.5, 12.5, 12, 11, 9, 6];
// Sand-dune ripples across the back.
const DUNES = ['M74 86 Q86 79 98 83 T122 81 T146 78 T170 64', 'M74 80 Q88 74 100 78 T124 76 T148 73 T168 58', 'M90 97 Q102 91 114 94 T138 92 T162 88 T182 74'];

/** A ribbed fan frill with rounded lobes: base point, radius, and the angle of each rib (degrees, 180 = back). */
function fan(bx: number, by: number, r: number, angles: number[]): { bx: number; by: number; d: string; edge: string; tips: Array<[number, number]>; inner: string } {
  const pt = (a: number, k: number): [number, number] => [bx + Math.cos((a * Math.PI) / 180) * r * k, by + Math.sin((a * Math.PI) / 180) * r * k];
  const arc = (k: number, lobe: number): string => {
    let s = '';
    for (let i = 0; i < angles.length - 1; i++) {
      const q = pt((angles[i] + angles[i + 1]) / 2, k * lobe);
      const b = pt(angles[i + 1], k);
      s += ` Q${f(q[0])} ${f(q[1])} ${f(b[0])} ${f(b[1])}`;
    }
    return s;
  };
  const tips = angles.map((a) => pt(a, 1));
  const at = (k: number): string => `${f(pt(angles[0], k)[0])} ${f(pt(angles[0], k)[1])}`;
  const edge = `M${at(1)}${arc(1, 1.1)}`;
  // Inner tone: the same fan partway out, for the two-tone look.
  const inner = `M${f(bx)} ${f(by)} L${at(0.7)}${arc(0.7, 1.06)}Z`;
  return { bx, by, d: `M${f(bx)} ${f(by)} L${edge.slice(1)}Z`, edge, tips, inner };
}

function draw(c: Ctx): Parts {
  const { p, A, line, shade, light, rim, SW, id } = c;
  // Frills: a strong base tone and a sun-bleached edge (pale accents take the wing color at the base).
  const pale = luma(p.accent) > 0.7;
  const frillIn = pale ? mix(p.wing, p.accent, 0.15) : p.accent;
  const frillOut = pale ? p.accent : mix(p.wing, '#ffe3a1', 0.4);
  const glint = mix(lt(p.accent, 0.6), '#ffe8a3', 0.5);
  const dune = mix(p.body, p.wing, 0.48);
  const grow = 0.55 + 0.45 * A.spine;
  const defs = `<clipPath id="${id}B"><path d="${BODY}"/></clipPath><clipPath id="${id}H"><path d="${HEAD}"/></clipPath><clipPath id="${id}T"><path d="${TAIL}"/></clipPath><clipPath id="${id}W"><path d="${WING}"/></clipPath><clipPath id="${id}L"><path d="${BELLY}"/></clipPath><clipPath id="${id}Th"><path d="${THIGH}"/></clipPath><clipPath id="${id}rim"><ellipse cx="124" cy="62" rx="70" ry="14"/></clipPath>
<linearGradient id="${id}w" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${p.wing}"/><stop offset="1" stop-color="${lt(p.wing, 0.26)}"/></linearGradient>`;

  // One frill layer: outer tone, inner tone, shaded panels, ribs and an edge line.
  let fanN = 0;
  const frillLayer = (fr: ReturnType<typeof fan>, outer: string, inner: string, rims: string[]): string => {
    const { bx, by } = fr;
    const cid = `${id}f${fanN++}`;
    let s = `<clipPath id="${cid}"><path d="${fr.d}"/></clipPath><path d="${fr.d}" fill="${outer}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${cid})"><path d="${fr.inner}" fill="${inner}"/>`;
    fr.tips.forEach(([x, y], i) => {
      const nx = fr.tips[i + 1];
      if (nx && i % 2) s += `<path d="M${bx} ${by} L${f(x)} ${f(y)} L${f(nx[0])} ${f(nx[1])}Z" fill="${dk(inner, 0.3)}" opacity="0.3"/>`;
      if (c.portrait && nx) s += `<path d="M${bx} ${by} L${f((x + nx[0]) / 2)} ${f((y + nx[1]) / 2)}" stroke="${dk(outer, 0.25)}" stroke-width="0.5" opacity="0.6"/>`;
    });
    s += `</g>`;
    s += fr.tips.map(([x, y]) => `<path d="M${bx} ${by} L${f(x)} ${f(y)}" stroke="${dk(inner, 0.4)}" stroke-width="1" stroke-linecap="round" opacity="0.85"/>`).join('');
    if (c.fine) s += fr.tips.map(([x, y]) => `<path d="M${bx} ${by} L${f(bx + (x - bx) * 0.9)} ${f(by + (y - by) * 0.9 - 0.8)}" stroke="${lt(outer, 0.45)}" stroke-width="0.5" opacity="0.7"/>`).join('');
    s += `<path d="${fr.edge}" stroke="${line}" stroke-width="1.5" fill="none" stroke-linejoin="round"/>`;
    rims.push(`<path d="${fr.edge}" stroke="${glint}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.9"/>`);
    return s;
  };

  // Wings: wide membrane, shadow band, sun-bleached bands, sand specks, bones, arm.
  const wing = (back: boolean): string => {
    const wr = c.r;
    let s = `<path d="${WING}" fill="${back ? dk(p.wing, 0.22) : `url(#${id}w)`}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${id}W)">`;
    for (const r of [26, 46, 66, 86]) s += `<circle cx="${WRIST[0]}" cy="${WRIST[1]}" r="${r}" fill="none" stroke="${lt(p.wing, 0.38)}" stroke-width="${f(5 + r * 0.06)}" opacity="${back ? 0.25 : 0.5}"/>`;
    if (c.fine) for (const r of [32, 52, 72]) s += `<circle cx="${WRIST[0]}" cy="${WRIST[1]}" r="${r}" fill="none" stroke="${dk(p.wing, 0.35)}" stroke-width="0.8" opacity="0.45"/>`;
    s += `<path d="M-110 -14 L10 -10 L10 12 L-110 12Z" fill="${dk(p.wing, 0.32)}" opacity="${back ? 0.25 : 0.45}"/>`;
    s += `<path d="M-10 -46 L-36 -66 L-32 -60 L-9 -41Z" fill="${lt(p.wing, 0.45)}"/>`;
    if (c.fine) for (let i = 0; i < 6; i++) s += `<circle cx="${f(-80 + wr() * 60)}" cy="${f(-46 + wr() * 40)}" r="${f(0.8 + wr() * 1.2)}" fill="${lt(p.wing, 0.5)}" opacity="0.5"/>`;
    if (c.portrait && !back) {
      // Fine veins along each panel and sand grains caught on the skin.
      TIPS.forEach(([x, y], i) => {
        const nx = TIPS[i + 1] ?? [-34, 6];
        for (const k of [0.33, 0.66]) s += `<path d="M${f(WRIST[0] + (x - WRIST[0]) * 0.2)} ${f(WRIST[1] + (y - WRIST[1]) * 0.2)} Q${f(x + (nx[0] - x) * k)} ${f(y + (nx[1] - y) * k - 6)} ${f(x + (nx[0] - x) * k)} ${f(y + (nx[1] - y) * k)}" stroke="${dk(p.wing, 0.4)}" stroke-width="0.6" fill="none" opacity="0.5"/>`;
      });
      for (let i = 0; i < 16; i++) s += `<circle cx="${f(-92 + wr() * 80)}" cy="${f(-56 + wr() * 56)}" r="${f(0.4 + wr() * 0.7)}" fill="${lt(p.belly, 0.2)}" opacity="0.7"/>`;
    }
    s += `</g>`;
    s += `<path d="${EDGE}" stroke="${lt(p.wing, 0.5)}" stroke-width="1.2" fill="none" opacity="0.85" stroke-linecap="round"/>`;
    const bones = TIPS.map(([x, y]) => `M${WRIST[0]} ${WRIST[1]} L${x} ${y}`).join(' ');
    s += `<path d="${bones}" stroke="${back ? line : dk(p.wing, 0.42)}" stroke-width="${SW}" stroke-linecap="round" fill="none"/>`;
    if (c.fine) s += `<path d="${TIPS.slice(0, 3).map(([x, y]) => `M${WRIST[0]} ${WRIST[1] - 1.2} L${x + 2} ${y - 0.8}`).join(' ')}" stroke="${lt(p.wing, 0.35)}" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    s += `<path d="M0 0 C4 -16 0 -34 -10 -46" stroke="${line}" stroke-width="${f(SW * 1.9)}" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M2 -6 C4 -18 2 -32 -7 -42" stroke="${light}" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    s += `<path d="M-10 -46 l1 -7 l4 6z" fill="${p.belly}" stroke="${line}" stroke-width="1"/>`;
    for (const [x, y] of TIPS) s += `<circle cx="${x}" cy="${y}" r="1.5" fill="${p.belly}" stroke="${line}" stroke-width="0.7"/>`;
    return s;
  };

  // Low sail ridge: a scalloped membrane on short ribs, two-toned, along the back.
  const ribTips = SAIL.map(([x, y], i): [number, number] => [x - 3, y - RIBS[i] * A.spine - 2]);
  let sail = `M${SAIL[0][0] - 4} ${SAIL[0][1] + 4}`;
  ribTips.forEach(([x, y], i) => {
    const prev = i ? ribTips[i - 1] : null;
    sail += prev ? ` Q${f((prev[0] + x) / 2)} ${f((prev[1] + y) / 2 + 1)} ${f(x)} ${f(y)}` : ` L${f(x)} ${f(y)}`;
  });
  sail += ` L${SAIL[9][0] + 6} ${SAIL[9][1] + 5}Z`;
  let back = `<clipPath id="${id}S"><path d="${sail}"/></clipPath><path d="${sail}" fill="${frillOut}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`;
  back += `<g clip-path="url(#${id}S)"><path d="M80 ${f(74 - 3 * A.spine)} C110 ${f(72 - 4 * A.spine)} 140 ${f(70 - 4 * A.spine)} 170 ${f(52 - 2 * A.spine)} L180 80 L80 80Z" fill="${frillIn}"/></g>`;
  back += `<path d="${SAIL.map(([x, y], i) => `M${x} ${y + 3} L${f(ribTips[i][0])} ${f(ribTips[i][1])}`).join(' ')}" stroke="${dk(frillIn, 0.4)}" stroke-width="1.3" stroke-linecap="round"/>`;
  if (c.portrait) back += `<path d="${SAIL.map(([x, y], i) => `M${x - 1.2} ${y + 1} L${f(ribTips[i][0] - 1)} ${f(ribTips[i][1] + 1.5)}`).join(' ')}" stroke="${lt(frillOut, 0.5)}" stroke-width="0.6" opacity="0.8"/>`;

  // Whip tail: cel bands, dune ripples, scales, belly stripe, low ridge and the fan frill.
  // The sail runs on down the tail as a low ribbed fin.
  const TFIN: Array<[number, number, number]> = [[4, -12.5, 6], [-8, -13.5, 6], [-20, -12, 5.4], [-32, -8, 4.6], [-44, -2.5, 3.6]];
  const finTip = ([x, y, h]: [number, number, number]): [number, number] => [x - 2, y - h * A.spine - 1.5];
  let fin = `M10 -10`;
  TFIN.forEach((t, i) => {
    const [x, y] = finTip(t);
    const pv = i ? finTip(TFIN[i - 1]) : null;
    fin += pv ? ` Q${f((pv[0] + x) / 2)} ${f((pv[1] + y) / 2 + 1)} ${f(x)} ${f(y)}` : ` L${f(x)} ${f(y)}`;
  });
  fin += ' L-52 4 L-30 -2 L-6 -8Z';
  let tail = `<path d="${fin}" fill="${frillOut}" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/><path d="${TFIN.map((t) => `M${t[0]} ${t[1] + 2} L${f(finTip(t)[0])} ${f(finTip(t)[1])}`).join(' ')}" stroke="${dk(frillIn, 0.4)}" stroke-width="1.1" stroke-linecap="round"/>`;
  tail += `<path d="${TAIL}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  tail += `<g clip-path="url(#${id}T)"><path d="M12 2 C-14 0 -40 6 -60 12 L-100 14 L-100 30 L12 30Z" fill="${shade}"/><path d="M8 -10 C-14 -13 -32 -8 -48 0 L-47 -3 C-32 -11 -14 -15 8 -12Z" fill="${light}"/>`;
  if (c.fine) {
    tail += `<path d="M10 -4 Q0 -9 -10 -6 T-30 -4 T-50 2" stroke="${dune}" stroke-width="2.6" fill="none" opacity="0.6"/>`;
    const n = c.portrait ? 22 : 12;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      tail += `<path d="M${f(4 - t * 72)} ${f(-6 + t * 11 + (i % 2) * 3.5)} l2.2 -1.7 l2.2 1.7 l-2.2 1.7z" fill="${shade}" opacity="0.4"/>`;
    }
  }
  tail += `</g>`;
  tail += `<path d="M6 8 C-14 5 -30 8 -44 10 C-56 11 -66 11 -76 10" stroke="${p.belly}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  const tailRims: string[] = [];
  const tf = fan(-83, 8, 23 * grow, [136, 152, 168, 184, 200, 216]);
  tail += frillLayer(tf, frillOut, frillIn, tailRims);
  tail += `<circle cx="-83" cy="8" r="2.6" fill="${p.body}" stroke="${line}" stroke-width="1"/>`;
  tail += c.glow(tailRims.join(''));

  // Body: base, shadow, light, dune ripples, scales, markings, rim light, belly plates.
  let body = `<path d="${BODY}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 1.1)}" stroke-linejoin="round"/>`;
  body += `<g clip-path="url(#${id}B)">`;
  body += `<path d="M70 93 C100 91 130 95 156 93 C170 89 180 76 196 62 L204 120 L70 120Z" fill="${shade}"/>`;
  body += `<path d="M82 83 C90 78 104 77 116 77 C134 76 150 73 162 65 C168 59 172 52 176 44 L180 46 C175 58 166 70 150 76 C132 80 106 80 84 87Z" fill="${light}"/>`;
  DUNES.forEach((d, i) => {
    body += `<path d="${d}" stroke="${i === 2 ? dk(dune, 0.15) : dune}" stroke-width="${i === 2 ? 3 : 3.6}" fill="none" stroke-linecap="round" opacity="${i === 2 ? 0.4 : 0.65}"/>`;
    if (c.fine && i < 2) body += `<path d="${d}" transform="translate(0 -2.4)" stroke="${lt(p.body, 0.45)}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  });
  if (c.fine) {
    const step = c.portrait ? 3.6 : 4.6;
    for (let y = 72; y < 98; y += step) {
      for (let x = 82 + (Math.round(y / step) % 2) * 3; x < 188; x += c.portrait ? 5.6 : 7) {
        const top = 72 + (x > 150 ? -(x - 150) * 1.0 : 0) + (x < 90 ? (90 - x) * 0.6 : 0);
        if (y < top || (x > 165 && y > 95 - (x - 165) * 0.8)) continue;
        body += `<path d="M${f(x)} ${f(y)} l2.6 -2 l2.6 2 l-2.6 2z" fill="${y > 88 ? line : shade}" opacity="${y > 88 ? 0.14 : 0.28}"/>`;
      }
    }
  }
  // Close up, sand grains catch the light.
  if (c.portrait) for (let i = 0; i < 26; i++) body += `<circle cx="${f(88 + c.r() * 90)}" cy="${f(76 + c.r() * 18)}" r="${f(0.4 + c.r() * 0.6)}" fill="${lt(p.belly, 0.3)}" opacity="0.75"/>`;
  body += c.marks(BODY);
  body += `</g>`;
  body += `<path d="${BODY}" fill="none" stroke="${rim}" stroke-width="2.6" opacity="0.85" clip-path="url(#${id}rim)"/>`;
  body += `<path d="${BELLY}" fill="${p.belly}"/><g clip-path="url(#${id}L)">`;
  body += `<path d="M86 100 C104 100 136 101 160 98 C164 104 140 108 100 106Z" fill="${dk(p.belly, 0.2)}"/>`;
  [94, 104, 114, 124, 134, 144, 154, 163, 171, 178].forEach((x, i) => {
    const y = 101 - (i > 6 ? (i - 6) * 6 : 0);
    if (c.fine) body += `<path d="M${x} ${f(y - 7)} q2 3 0.6 7" stroke="${p.accent}" stroke-width="2.2" fill="none" opacity="0.3" stroke-linecap="round"/>`;
    body += `<path d="M${x} ${f(y - 7)} q2 3 0.6 7" stroke="${dk(p.belly, 0.42)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    if (c.portrait) body += `<path d="M${x + 2.6} ${f(y - 6)} q1.4 2 0.6 5" stroke="${lt(p.belly, 0.6)}" stroke-width="0.7" fill="none" opacity="0.8" stroke-linecap="round"/>`;
  });
  body += `<path d="M90 98 C106 96 130 96 156 96" stroke="${lt(p.belly, 0.6)}" stroke-width="1.1" fill="none" opacity="0.8" stroke-linecap="round"/></g>`;

  // Legs: long and lean, hind leg kicked back, front leg reaching forward.
  let legs = `<path d="${THIGH}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.9)}"/>`;
  legs += `<path d="M84 104 C90 112 102 112 106 100 L106 116 L80 116Z" fill="${shade}" clip-path="url(#${id}Th)"/><path d="M88 93 C94 89 100 89 102 93 C96 92 92 94 88 97Z" fill="${light}"/>`;
  if (c.fine) legs += `<path d="M90 98 l3.6 -1.8 l3.6 1.8 l-3.6 1.8z M96 103 l3.6 -1.8 l3.6 1.8 l-3.6 1.8z" fill="${shade}" opacity="0.5"/>`;
  if (c.portrait) for (let i = 0; i < 6; i++) legs += `<path d="M${f(84 + (i % 3) * 5)} ${f(100 + Math.floor(i / 3) * 5)} l2.2 -1.6 l2.2 1.6 l-2.2 1.6z" fill="${shade}" opacity="0.45"/>`;
  legs += `<path d="${FOOT}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/><path d="M90 106 C84 112 78 114 70 115" stroke="${shade}" stroke-width="1.8" fill="none" opacity="0.6"/>`;
  legs += `<path d="${ARM}" fill="${p.body}" stroke="${line}" stroke-width="${f(SW * 0.85)}" stroke-linejoin="round"/><path d="M164 96 C168 102 172 106 180 107" stroke="${shade}" stroke-width="1.8" fill="none" opacity="0.6"/>`;
  legs += `<g fill="#fffdf5" stroke="${line}" stroke-width="0.8" stroke-linejoin="round">${CLAWS.map(([x, y, k]) => `<path d="M${x} ${y} l${f(3 * k)} 0.6 l${f(-1.8 * k)} 2.4z"/>`).join('')}</g>`;
  if (c.portrait) legs += `<g fill="${dk(p.belly, 0.25)}">${CLAWS.map(([x, y, k]) => `<path d="M${f(x + 1.3 * k)} ${f(y + 0.3)} l${f(1.7 * k)} 0.3 l${f(-1.5 * k)} 2.1z"/>`).join('')}</g>`;

  // Head: layered frills behind the eye, little brow horns, long snout, smile, eye.
  const headRims: string[] = [];
  let head = '';
  // A big collar sweeping back behind the eye, a smaller layer over it (not on hatchlings).
  head += frillLayer(fan(184, 44, 44 * grow, [138, 156, 174, 192, 210, 228]), dk(frillOut, 0.12), dk(frillIn, 0.15), headRims);
  if (c.stage !== 'hatchling') head += frillLayer(fan(186, 44, 31 * grow, [150, 169, 188, 207, 224]), frillOut, frillIn, headRims);
  head += c.glow(headRims.join(''));
  head += `<path d="${HEAD}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  head += `<g clip-path="url(#${id}H)"><path d="M170 53 C190 52 214 55 242 47 L242 64 L170 64Z" fill="${shade}"/><path d="M180 38 C186 31 196 29 207 30 C198 32 189 36 183 44Z" fill="${light}"/><path d="M213 34 C220 37 227 40 232 45 L231 47 C225 43 219 39 212 36Z" fill="${light}"/>`;
  if (c.fine) {
    head += `<path d="M206 33 Q214 31 222 36 T232 44" stroke="${dune}" stroke-width="2" fill="none" opacity="0.55"/>`;
    for (let i = 0; i < (c.portrait ? 10 : 5); i++) head += `<path d="M${f(184 + i * (c.portrait ? 4.2 : 7))} ${f(55 - (i % 2) * 2)} l2.2 -1.8 l2.2 1.8 l-2.2 1.8z" fill="${shade}" opacity="0.4"/>`;
  }
  head += `</g>`;
  if (c.stage !== 'hatchling') {
    const g = c.stage === 'adult' ? 1 : 0.6;
    head += `<path d="M196 30 C192 ${f(25 - 3 * g)} 187 ${f(23 - 5 * g)} ${f(181 - 4 * g)} ${f(23 - 5 * g)} C186 27 189 30 191 32Z" fill="${p.belly}" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/>`;
    if (c.fine) head += `<path d="M193 29 C190 27 187 26 184 ${f(25 - 3 * g)}" stroke="${dk(p.belly, 0.25)}" stroke-width="0.9" fill="none"/>`;
  }
  head += `<path d="M186 35 C192 30 203 30 211 34 L208 37 C201 33 193 34 188 39Z" fill="${dk(p.body, 0.3)}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
  head += `<path d="M200 57 C211 57 221 56 230 52 C225 58 214 60 205 60Z" fill="${p.belly}"/>`;
  head += `<path d="M203 55 C213 56 222 55 231 50" stroke="${line}" stroke-width="1.9" fill="none" stroke-linecap="round"/><path d="M203 55 q-2 -1 -3 -3" stroke="${line}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  head += `<path d="M219 55.8 l1.4 2.6 l1.4 -2.8z" fill="#fff" stroke="${line}" stroke-width="0.4"/>`;
  head += `<ellipse cx="229.5" cy="43.6" rx="2" ry="1.3" fill="${line}"/>`;
  if (c.fine) head += `<path d="M210 50 l5 -1 M211 52.4 l5 0" stroke="${dk(p.body, 0.25)}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>`;
  head += `<ellipse cx="210" cy="49" rx="3.8" ry="2.2" fill="#ff8fab" opacity="0.45"/>`;
  head += celEye(c, 197, 42, mix(p.accent, '#ff7a3d', 0.7));
  head += `<path d="M188 ${f(40 - A.eye)} C194 ${f(36 - A.eye)} 201 ${f(36 - A.eye)} 207 ${f(39 - A.eye)}" stroke="${line}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;

  return {
    defs,
    wing,
    farLeg: `<path d="${FARLEG}" fill="${dk(p.body, 0.3)}" stroke="${line}" stroke-width="${f(SW * 0.8)}" stroke-linejoin="round"/><path d="${FARARM}" fill="${dk(p.body, 0.3)}" stroke="${line}" stroke-width="${f(SW * 0.8)}" stroke-linejoin="round"/>`,
    tail,
    back,
    body,
    legs,
    head,
  };
}

export const DUNESKIMMER: TribeArt = { draw };
