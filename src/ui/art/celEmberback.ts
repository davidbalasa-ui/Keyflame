// @ts-nocheck -- ported as-is from the approved art brief pilot (art-brief/cel-emberback-starfire.js).
// The cel-shaded Emberback David approved as the final dragon look, used here as accent art on the
// grown-up classroom screens while the in-game art upgrade is on hold.

const hex = (n) => '#' + n.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
const rgb = (h) => { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((c, i) => c + (y[i] - c) * t)); };
const dk = (h, t) => mix(h, '#000000', t);
const lt = (h, t) => mix(h, '#ffffff', t);
const f = (n) => +n.toFixed(1);
function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const star4 = (x, y, r, fill, cls = '') => `<path${cls ? ` class="${cls}"` : ''} d="M${f(x)} ${f(y - r)} Q${f(x + r * 0.16)} ${f(y - r * 0.16)} ${f(x + r)} ${f(y)} Q${f(x + r * 0.16)} ${f(y + r * 0.16)} ${f(x)} ${f(y + r)} Q${f(x - r * 0.16)} ${f(y + r * 0.16)} ${f(x - r)} ${f(y)} Q${f(x - r * 0.16)} ${f(y - r * 0.16)} ${f(x)} ${f(y - r)}Z" fill="${fill}"/>`;

// Emberback anatomy: deep chest, short strong neck, heavy tail.
const BODY = 'M74 95 C74 74 98 59 128 61 C147 61 158 57 166 49 C171 44 174 39 177 35 L199 52 C193 58 187 69 181 83 C173 102 152 114 124 114 C96 114 74 109 74 95Z';
const BELLY = 'M84 104 C104 112 136 112 154 103 C167 95 175 82 182 69 L190 72 C183 88 175 102 160 109 C138 119 104 118 84 104Z';
const TAIL = 'M6 -15 C-16 -20 -38 -12 -52 3 C-62 14 -74 20 -88 17 C-78 30 -60 31 -47 21 C-34 10 -16 7 6 11Z';
const HEAD = 'M172 44 C171 30 185 21 202 24 C212 26 221 31 228 36 C235 40 237 47 234 52 C231 57 223 60 214 60 C204 62 194 64 186 63 C176 62 170 55 172 44Z';
const WING = 'M0 0 C10 -22 6 -46 -6 -60 L-48 -67 Q-46 -48 -68 -42 Q-54 -30 -72 -15 Q-44 -12 -36 5Z';
const BONES = 'M-6 -60 L-48 -67 M-6 -60 L-68 -42 M-6 -60 L-72 -15';
const THIGH = 'M92 94 C82 102 82 114 92 117 C102 120 112 113 112 101 C110 92 100 88 92 94Z';
const FOOT = 'M98 114 C94 120 88 123 80 124 L74 127 L78 122 L72 121 L80 118 C86 116 90 114 92 110Z';
const FARLEG = 'M100 101 C96 112 90 118 80 120 L72 123 L76 118 L70 117 L78 114 C86 110 90 104 92 98Z';
const ARM = 'M154 99 C158 108 163 112 170 112 L176 115 L173 110 L179 110 L172 106 C166 104 161 99 159 94Z';
const BACK = [[84, 77], [97, 68], [110, 64], [123, 62], [136, 61], [148, 59], [158, 54], [166, 47], [172, 40]];
const CLAWS = [[176, 115, 1], [179, 110, 1], [74, 127, -1], [72, 121, -1], [72, 123, -1], [70, 117, -1]];

const spike = (x, y, h, w) => `M${f(x - w)} ${f(y)} Q${f(x - w * 0.2)} ${f(y - h * 0.55)} ${f(x - w * 1.3)} ${f(y - h)} Q${f(x + w * 0.6)} ${f(y - h * 0.45)} ${f(x + w)} ${f(y)}Z`;
const spikeHalf = (x, y, h, w) => `M${f(x - w * 0.15)} ${f(y)} Q${f(x - w * 0.1)} ${f(y - h * 0.5)} ${f(x - w * 1.3)} ${f(y - h)} Q${f(x + w * 0.6)} ${f(y - h * 0.45)} ${f(x + w)} ${f(y)}Z`;

const AGE = {
  hatchling: { scale: 0.8, head: 1.36, wing: 0.74, spine: 0.45, eye: 8.8 },
  young: { scale: 0.9, head: 1.2, wing: 1.0, spine: 0.72, eye: 7.9 },
  adult: { scale: 1, head: 1.1, wing: 1.2, spine: 1, eye: 7.2 },
};

let uid = 0;

const VARIANT = {
  lightning: { pal: { body: '#1d2a6b', belly: '#9ad7ff', wing: '#0f1a4a', accent: '#ffe14d' }, glow: '#ffe95c', glow2: '#7fd8ff' },
  plasma: { pal: { body: '#6a1fb0', belly: '#ff9be6', wing: '#2a0a5c', accent: '#ff4fd8' }, glow: '#ff5cf0', glow2: '#5ef2ff' },
  neon: { pal: { body: '#16132a', belly: '#2b2745', wing: '#0d0b1c', accent: '#00f0ff' }, glow: '#00f0ff', glow2: '#ff3df2' },
};
// A bright line with a soft halo: wide faint stroke, colored core, white center.
const glowLine = (d, c, w, cls = '') => `<g${cls ? ` class="${cls}"` : ''} fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="${c}" stroke-width="${f(w * 3.2)}" opacity="0.22"/><path d="${d}" stroke="${c}" stroke-width="${w}"/><path d="${d}" stroke="#fff" stroke-width="${f(w * 0.38)}" opacity="0.9"/></g>`;
// A jagged bolt from a to b, with optional side forks.
function bolt(r, x0, y0, x1, y1, n, jit) {
  let d = `M${f(x0)} ${f(y0)}`;
  const pts = [];
  for (let i = 1; i < n; i++) { const t = i / n; const x = x0 + (x1 - x0) * t + (r() - 0.5) * jit, y = y0 + (y1 - y0) * t + (r() - 0.5) * jit; pts.push([x, y]); d += ` L${f(x)} ${f(y)}`; }
  return { d: d + ` L${f(x1)} ${f(y1)}`, pts };
}

function emberback(p, stage = 'adult', sf = false) {
  const id = `e${++uid}`;
  const starfire = !!sf;
  const V = sf ? VARIANT[sf] : null;
  if (V) p = V.pal;
  const A = AGE[stage];
  const r = rnd(11);
  const line = sf === 'neon' ? '#00d5e6' : dk(p.body, 0.7);
  const shade = mix(dk(p.body, 0.3), '#3a1f7a', 0.28);
  const light = lt(p.body, 0.32);
  const rim = lt(p.accent, 0.55);
  const hot = starfire ? '#ffffff' : lt(p.accent, 0.6);
  const spineCol = starfire ? V.glow : p.accent;
  const SW = 2.4;
  let defs = `<clipPath id="${id}B"><path d="${BODY}"/></clipPath><clipPath id="${id}H"><path d="${HEAD}"/></clipPath><clipPath id="${id}T"><path d="${TAIL}"/></clipPath><clipPath id="${id}W"><path d="${WING}"/></clipPath><clipPath id="${id}L"><path d="${BELLY}"/></clipPath><clipPath id="${id}rim"><ellipse cx="116" cy="54" rx="72" ry="18"/></clipPath>
  <linearGradient id="${id}w" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${p.wing}"/><stop offset="1" stop-color="${lt(p.wing, starfire ? 0.15 : 0.28)}"/></linearGradient>`;
  if (starfire) defs += `<radialGradient id="${id}a" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${V.glow}" stop-opacity="0.45"/><stop offset="0.5" stop-color="${V.glow2}" stop-opacity="0.2"/><stop offset="1" stop-color="${V.glow2}" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id}sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="${id}all"><path d="${BODY}"/><path d="${HEAD}" transform="translate(184 52) scale(${A.head}) translate(-184 -52)"/></clipPath>`;

  // ---- Wings ----
  function wing(back) {
    const fill = back ? dk(p.wing, 0.22) : `url(#${id}w)`;
    let s = `<path d="${WING}" fill="${fill}" stroke="${line}" stroke-width="${SW * 0.85}" stroke-linejoin="round"/>`;
    s += `<g clip-path="url(#${id}W)">`;
    s += `<path d="M-84 -26 L12 -6 L12 12 L-84 12Z" fill="${dk(p.wing, 0.32)}" opacity="${back ? 0.25 : 0.5}"/>`;
    s += `<path d="M-6 -60 L-48 -67 L-42 -62 L-8 -55Z" fill="${lt(p.wing, 0.42)}"/>`;
    // Scorch spots near the trailing edge.
    if (!starfire) for (let i = 0; i < 7; i++) s += `<ellipse cx="${f(-58 + r() * 34)}" cy="${f(-50 + r() * 50)}" rx="${f(1.4 + r() * 2)}" ry="${f(1 + r() * 1.4)}" fill="${dk(p.wing, 0.45)}" opacity="0.45"/>`;
    if (sf === 'lightning') {
      const b1 = bolt(r, -6, -60, -66, -40, 6, 8), b2 = bolt(r, -6, -60, -70, -16, 6, 8), b3 = bolt(r, -30, -64, -40, -30, 4, 8);
      s += glowLine(b1.d, V.glow, back ? 0.9 : 1.4, 'flick') + glowLine(b2.d, V.glow2, back ? 0.9 : 1.3, 'flick f2') + glowLine(b3.d, V.glow, 0.9, 'flick f3');
      for (let i = 0; i < (back ? 16 : 36); i++) s += `<circle cx="${f(-70 + r() * 76)}" cy="${f(-64 + r() * 66)}" r="${f(0.5 + r() * 0.8)}" fill="${i % 2 ? V.glow : '#fff'}"${i % 4 ? '' : ' class="tw"'}/>`;
    } else if (sf === 'plasma') {
      for (let i = 0; i < 5; i++) { const y = -58 + i * 13; s += glowLine(`M-4 ${f(-56 + i * 11)} Q${f(-30 - i * 4)} ${f(y - 8)} ${f(-62 - i * 2)} ${f(y + 6)}`, i % 2 ? V.glow2 : V.glow, back ? 0.7 : 1.1, i % 2 ? 'pulse' : 'pulse p2'); }
      for (let i = 0; i < (back ? 12 : 26); i++) { const x = -66 + r() * 66, y = -60 + r() * 60, rr = 1 + r() * 2.4; s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${V.glow}" opacity="0.35"/><circle cx="${f(x - rr * 0.3)}" cy="${f(y - rr * 0.3)}" r="${f(rr * 0.35)}" fill="#fff" opacity="0.8"/>`; }
    } else if (sf === 'neon') {
      for (let i = 1; i < 13; i++) s += `<path d="M${f(-6 - i * 6.5)} -70 L${f(10 - i * 12)} 10" stroke="${V.glow2}" stroke-width="0.6" opacity="0.35"/>`;
      for (let i = 1; i < 13; i++) s += `<path d="M-84 ${f(-66 + i * 6)} L12 ${f(-60 + i * 13)}" stroke="${V.glow2}" stroke-width="0.6" opacity="0.35"/>`;
      s += glowLine('M-48 -67 Q-46 -48 -68 -42 Q-54 -30 -72 -15 Q-44 -12 -36 5', V.glow2, back ? 0.9 : 1.4, 'pulse');
    }
    s += `</g>`;
    // Scalloped trailing edge, bones, arm.
    s += `<path d="M-48 -67 Q-46 -48 -68 -42 Q-54 -30 -72 -15 Q-44 -12 -36 5" stroke="${starfire ? V.glow : lt(p.wing, 0.5)}" stroke-width="${starfire ? 1.6 : 1.2}" fill="none" opacity="0.85" stroke-linecap="round"/>`;
    s += `<path d="${BONES}" stroke="${back ? line : dk(p.wing, 0.42)}" stroke-width="${SW}" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M-6 -60 L-46 -66 M-6 -60 L-66 -42" stroke="${lt(p.wing, 0.35)}" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    s += `<path d="M0 0 C10 -22 6 -46 -6 -60" stroke="${line}" stroke-width="${SW * 1.9}" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M2 -6 C9 -24 6 -42 -4 -56" stroke="${light}" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.7"/>`;
    s += `<path d="M-6 -60 l2 -8 l3 8z" fill="${p.belly}" stroke="${line}" stroke-width="1"/>`;
    [[-48, -67], [-68, -42], [-72, -15]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="1.6" fill="${starfire ? V.glow : p.belly}" stroke="${line}" stroke-width="0.7"/>`; });
    return s;
  }

  // ---- Back spines: base, shadow half, hot core ----
  let spines = '';
  const H = [13, 18, 22, 24, 23, 20, 16, 13, 10];
  BACK.forEach(([x, y], i) => {
    const h = H[i] * A.spine * (starfire ? 1.08 : 1), w = 5.2;
    spines += `<path d="${spike(x, y + 3, h, w)}" fill="${spineCol}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`;
    spines += `<path d="${spikeHalf(x, y + 3, h, w)}" fill="${dk(spineCol, 0.28)}"/>`;
    spines += `<path d="${spike(x - 1, y + 2, h * 0.55, w * 0.38)}" fill="${hot}" opacity="0.9"/>`;
  });

  // ---- Tail ----
  let tail = `<path d="${TAIL}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  tail += `<g clip-path="url(#${id}T)"><path d="M8 3 C-18 1 -42 9 -60 24 L-60 44 L8 44Z" fill="${shade}"/><path d="M4 -12 C-16 -16 -36 -9 -48 3 L-46 -2 C-34 -12 -16 -15 4 -10Z" fill="${light}"/>`;
  for (let i = 0; i < 16; i++) { const t = i / 16, x = 0 - t * 70, y = -9 + t * 16 + (i % 2) * 4; tail += `<path d="M${f(x)} ${f(y)} l2.6 -2 l2.6 2 l-2.6 2z" fill="${shade}" opacity="0.4"/>`; }
  if (sf === 'lightning') { const b = bolt(r, 4, -2, -80, 18, 9, 7); tail += glowLine(b.d, V.glow, 1.3, 'flick f2'); }
  if (sf === 'plasma') for (let i = 0; i < 9; i++) { const x = -6 - i * 8.5, y = -4 + i * 2.6, rr = 2.4 - i * 0.15; tail += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 1.8)}" fill="${V.glow}" opacity="0.3"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${i % 2 ? V.glow : V.glow2}"/><circle cx="${f(x - 0.6)}" cy="${f(y - 0.6)}" r="${f(rr * 0.35)}" fill="#fff"/>`; }
  if (sf === 'neon') { tail += glowLine('M6 -4 C-16 -8 -38 -1 -52 12 C-62 20 -72 23 -84 21', V.glow2, 1.2, 'pulse'); for (let i = 0; i < 20; i++) tail += `<path d="M${f(-2 - i * 3.8)} ${f(-12 + i * 1.3)} l0 6" stroke="${V.glow}" stroke-width="1" opacity="0.6"/>`; }
  tail += `</g>`;
  tail += `<path d="M4 9 C-18 6 -34 10 -46 19" stroke="${p.belly}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  // Small spines along the tail top.
  [[-10, -16, 7], [-24, -15, 6], [-38, -9, 5], [-50, 2, 4], [-61, 13, 3]].forEach(([x, y, h]) => {
    tail += `<path d="${spike(x, y + 2, h * A.spine + 2, 3.4)}" fill="${spineCol}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>`;
  });
  // Tail tip: layered ember flame, or a big star with a comet trail.
  let tip = '';
  if (!starfire) {
    tip += `<path class="ember" d="M2 -2 C-4 -10 -9 -18 -4 -26 C-2 -16 -11 -16 -13 -9 C-17 -16 -24 -12 -24 -2 C-26 7 -15 13 2 4Z" fill="${dk(p.accent, 0.1)}" stroke="${line}" stroke-width="1.4"/>`;
    tip += `<path class="ember" d="M0 -1 C-4 -7 -7 -12 -4 -17 C-3 -10 -9 -10 -10 -5 C-13 -9 -17 -6 -17 -1 C-18 5 -10 8 0 2Z" fill="${lt(p.accent, 0.3)}"/>`;
    tip += `<path d="M-2 -0.5 C-4 -4 -6 -6 -5 -9 C-8 -5 -12 -3 -10 1 C-8 4 -4 3 -2 -0.5Z" fill="#fffbe6"/>`;
  } else {
    if (sf === 'lightning') {
      tip += glowLine('M2 0 L-10 -6 L-6 -1 L-22 -10 L-12 2 L-18 1 L-28 12', V.glow, 2.4, 'flick');
      for (let i = 0; i < 10; i++) { const a = r() * Math.PI * 2, d = 10 + r() * 14; tip += glowLine(`M-14 0 L${f(-14 + Math.cos(a) * d)} ${f(Math.sin(a) * d)}`, i % 2 ? V.glow : V.glow2, 0.6, `flick f${(i % 3) + 1}`); }
    } else if (sf === 'plasma') {
      tip += `<circle cx="-12" cy="0" r="16" fill="${V.glow}" opacity="0.18" class="pulse"/><circle cx="-12" cy="0" r="10" fill="${V.glow}" opacity="0.5"/><circle cx="-12" cy="0" r="6.5" fill="#ffd6fb"/><circle cx="-14" cy="-2" r="2.4" fill="#fff"/>`;
      tip += `<g class="spin" style="transform-origin:-12px 0px"><ellipse cx="-12" cy="0" rx="17" ry="5" fill="none" stroke="${V.glow2}" stroke-width="1.4"/><circle cx="5" cy="0" r="1.8" fill="#fff"/></g><g class="spin rev" style="transform-origin:-12px 0px"><ellipse cx="-12" cy="0" rx="5" ry="15" fill="none" stroke="${V.glow}" stroke-width="1.1" transform="rotate(30 -12 0)"/></g>`;
    } else {
      tip += glowLine('M2 0 L-12 -10 L-28 0 L-12 10Z', V.glow, 1.6, 'pulse') + glowLine('M-6 0 L-12 -5 L-20 0 L-12 5Z', V.glow2, 1.1, 'pulse p2');
    }
  }
  tail += `<g transform="translate(-88 18)">${tip}</g>`;

  // ---- Body ----
  let body = `<path d="${BODY}" fill="${p.body}" stroke="${line}" stroke-width="${SW * 1.1}" stroke-linejoin="round"/>`;
  body += `<g clip-path="url(#${id}B)">`;
  if (sf === 'plasma') {
    [[104, 92, 14, 9], [140, 80, 12, 8], [168, 64, 8, 6], [124, 104, 10, 5], [96, 80, 7, 5], [152, 98, 9, 5]].forEach(([x, y, a, b], i) => {
      body += `<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="${i % 2 ? V.glow2 : V.glow}" opacity="0.28"/><ellipse cx="${x - a * 0.15}" cy="${y - b * 0.15}" rx="${f(a * 0.6)}" ry="${f(b * 0.6)}" fill="${i % 2 ? V.glow2 : V.glow}" opacity="0.45"/><ellipse cx="${x - a * 0.3}" cy="${y - b * 0.3}" rx="${f(a * 0.25)}" ry="${f(b * 0.25)}" fill="#fff" opacity="0.7"/>`;
    });
  }
  body += `<path d="M66 99 C94 94 128 99 152 90 C166 84 178 72 194 60 L204 124 L66 124Z" fill="${shade}"/>`;
  body += `<path d="M80 84 C88 72 104 66 128 66 C146 66 157 62 165 54 C169 50 172 46 175 41 L179 43 C173 54 163 66 146 70 C124 72 102 72 82 88Z" fill="${light}"/>`;
  // Diamond scales over the upper body.
  for (let y = 60; y < 96; y += 5) {
    for (let x = 80 + ((y / 5) % 2) * 3.5; x < 190; x += 7) {
      const top = 60 + (x > 150 ? -(x - 150) * 0.7 : 0) + (x < 92 ? (92 - x) * 0.8 : 0);
      if (y < top) continue;
      body += `<path d="M${f(x)} ${y} l3 -2.4 l3 2.4 l-3 2.4z" fill="${y > 82 ? line : shade}" opacity="${y > 82 ? 0.15 : 0.3}"/>`;
    }
  }
  if (starfire) {
    if (sf === 'lightning') {
      [[82, 96, 190, 58], [96, 108, 170, 70], [110, 70, 150, 104]].forEach(([a, b, c2, d2], i) => {
        const bl = bolt(r, a, b, c2, d2, 8, 9);
        body += glowLine(bl.d, i === 1 ? V.glow2 : V.glow, 1.5, `flick f${i + 1}`);
        bl.pts.filter((_, k) => k % 3 === 1).forEach(([x, y]) => { const fk = bolt(r, x, y, x + (r() - 0.3) * 16, y + 10 + r() * 6, 3, 5); body += glowLine(fk.d, V.glow, 0.7, `flick f${((i + 1) % 3) + 1}`); });
      });
      for (let i = 0; i < 90; i++) body += `<circle cx="${f(78 + r() * 118)}" cy="${f(52 + r() * 60)}" r="${f(0.4 + r() * 0.8)}" fill="${i % 3 ? '#fff' : V.glow}"${i % 5 ? '' : ' class="tw"'}/>`;
    } else if (sf === 'plasma') {
      for (let i = 0; i < 70; i++) body += `<circle cx="${f(78 + r() * 118)}" cy="${f(52 + r() * 60)}" r="${f(0.5 + r() * 1.2)}" fill="${i % 2 ? V.glow : V.glow2}" opacity="0.8"${i % 4 ? '' : ' class="tw"'}/>`;
      body += glowLine('M84 98 C100 86 118 96 132 86 C146 76 160 84 176 64', V.glow, 1.2, 'pulse') + glowLine('M90 106 C108 98 126 106 142 96 C156 88 166 92 182 74', V.glow2, 1, 'pulse p2');
    } else {
      // Circuit lines with nodes.
      for (let i = 0; i < 9; i++) {
        const x = 86 + i * 11, y = 74 + (i % 3) * 8;
        const d = `M${x} ${y} l6 0 l4 ${i % 2 ? 6 : -6} l8 0`;
        body += glowLine(d, i % 2 ? V.glow : V.glow2, 0.9, i % 2 ? 'pulse' : 'pulse p2');
        body += `<circle cx="${x + 18}" cy="${y + (i % 2 ? 6 : -6)}" r="1.6" fill="#fff"/><circle cx="${x + 18}" cy="${y + (i % 2 ? 6 : -6)}" r="3.4" fill="${V.glow}" opacity="0.3"/>`;
      }
      for (let i = 0; i < 90; i++) body += `<rect x="${f(80 + r() * 112)}" y="${f(56 + r() * 52)}" width="1.4" height="1.4" fill="${i % 2 ? V.glow : V.glow2}" opacity="0.8"/>`;
    }
    body += `<rect class="shimmer" x="40" y="30" width="34" height="100" fill="url(#${id}sh)" transform="skewX(-20)"/>`;
  } else {
    // Glowing lava cracks across the flank.
    ['M98 86 l6 4 l-2 5 l7 3', 'M122 80 l5 5 l-3 4 l6 4 l-1 4', 'M150 74 l4 5 l-3 3 l5 4'].forEach((d) => {
      body += `<path d="${d}" stroke="${p.accent}" stroke-width="4" fill="none" opacity="0.25" stroke-linecap="round" stroke-linejoin="round"/><path class="ember" d="${d}" stroke="${lt(p.accent, 0.35)}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    });
  }
  body += `</g>`;
  body += `<path d="${BODY}" fill="none" stroke="${starfire ? V.glow : rim}" stroke-width="3" opacity="0.85" clip-path="url(#${id}rim)"/>`;
  if (starfire) body += glowLine('M84 82 C92 72 106 67 128 67 C146 67 157 63 165 55', V.glow, 1.2, 'pulse');
  // Belly plates with glowing seams.
  body += `<path d="${BELLY}" fill="${p.belly}"/><g clip-path="url(#${id}L)">`;
  body += `<path d="M84 104 C110 112 138 112 156 104 C160 112 140 120 108 117Z" fill="${dk(p.belly, 0.22)}"/>`;
  const seams = [96, 108, 120, 132, 144, 155, 165, 174];
  seams.forEach((x, i) => {
    const y = 112 - (i > 3 ? (i - 3) * 5 : 0) - i * 0.5;
    body += `<path d="M${x} ${f(y - 9)} q3 4 1 10" stroke="${starfire ? V.glow2 : p.accent}" stroke-width="2.6" fill="none" opacity="0.35" stroke-linecap="round"/><path d="M${x} ${f(y - 9)} q3 4 1 10" stroke="${dk(p.belly, 0.45)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  });
  body += `<path d="M90 103 C110 110 134 110 150 103" stroke="${lt(p.belly, 0.6)}" stroke-width="1.2" fill="none" opacity="0.8" stroke-linecap="round"/></g>`;

  // ---- Legs ----
  let legs = `<path d="${THIGH}" fill="${p.body}" stroke="${line}" stroke-width="${SW * 0.9}"/>`;
  legs += `<path d="M90 108 C94 116 106 116 112 104 L112 120 L84 120Z" fill="${shade}" clip-path="url(#${id}Th)"/><path d="M94 96 C100 92 106 93 108 97 C102 96 98 97 94 100Z" fill="${light}"/>`;
  legs += `<path d="M96 100 l4 -2 l4 2 l-4 2z M102 106 l4 -2 l4 2 l-4 2z" fill="${shade}" opacity="0.5"/>`;
  legs += `<path d="${FOOT}" fill="${p.body}" stroke="${line}" stroke-width="${SW * 0.85}" stroke-linejoin="round"/>`;
  legs += `<path d="${ARM}" fill="${p.body}" stroke="${line}" stroke-width="${SW * 0.85}" stroke-linejoin="round"/><path d="M158 100 C160 106 164 109 169 110" stroke="${shade}" stroke-width="2" fill="none" opacity="0.6"/>`;
  legs += `<g fill="#fffdf5" stroke="${line}" stroke-width="0.8" stroke-linejoin="round">${CLAWS.map(([x, y, k]) => `<path d="M${x} ${y} l${3.2 * k} 0.6 l${-1.8 * k} 2.6z"/>`).join('')}</g>`;
  defs += `<clipPath id="${id}Th"><path d="${THIGH}"/></clipPath>`;

  // ---- Head ----
  const eyeR = A.eye;
  const iris = starfire ? V.glow : mix(p.accent, '#c2410c', 0.35);
  let head = '';
  if (stage === 'hatchling') {
    head += `<path d="M184 32 l-8 -7 l11 1z M192 28 l-4 -8 l8 5z" fill="${p.belly}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`;
  } else {
    const g = stage === 'adult' ? 1 : 0.7;
    const hc = starfire ? lt(V.glow, 0.2) : p.belly;
    head += `<path d="M184 34 C176 ${f(24 - 6 * g)} ${f(166 - 4 * g)} ${f(20 - 8 * g)} ${f(152 - 4 * g)} ${f(22 - 8 * g)} C162 26 170 32 176 40Z" fill="${hc}" stroke="${line}" stroke-width="1.7" stroke-linejoin="round"/>`;
    head += `<path d="M184 34 C178 28 172 25 164 24 C170 28 174 33 178 39Z" fill="${dk(hc, 0.22)}"/>`;
    head += `<path d="M193 29 C190 ${f(20 - 4 * g)} 184 ${f(14 - 6 * g)} ${f(175 - 2 * g)} ${f(11 - 6 * g)} C181 18 185 24 186 32Z" fill="${lt(hc, 0.15)}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`;
    for (let i = 0; i < 3; i++) head += `<path d="M${f(176 - i * 6)} ${f(31 - i * 4 - g * i)} l3.6 2" stroke="${line}" stroke-width="0.8" opacity="0.6"/>`;
  }
  // Cheek spikes behind the jaw.
  head += `<path d="M176 54 l-12 2 l8 3 l-10 6 l14 -2z" fill="${spineCol}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/><path d="M174 58 l-8 4 l10 -1z" fill="${dk(spineCol, 0.28)}"/>`;
  head += `<path d="${HEAD}" fill="${p.body}" stroke="${line}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  head += `<g clip-path="url(#${id}H)"><path d="M170 55 C190 53 212 56 238 49 L238 66 L170 66Z" fill="${shade}"/><path d="M178 40 C184 31 194 28 206 29 C198 31 188 35 182 44Z" fill="${light}"/><path d="M214 34 C220 36 226 39 231 43 L230 45 C224 41 219 38 213 36Z" fill="${light}"/>`;
  for (let i = 0; i < 5; i++) head += `<path d="M${f(184 + i * 6)} ${f(54 - (i % 2) * 2)} l2.4 -2 l2.4 2 l-2.4 2z" fill="${shade}" opacity="0.4"/>`;
  if (sf === 'neon') head += glowLine('M176 48 C186 46 198 50 214 50 C222 50 228 48 234 46', V.glow2, 1, 'pulse');
  if (sf === 'lightning') for (let i = 0; i < 10; i++) head += `<circle cx="${f(174 + r() * 56)}" cy="${f(28 + r() * 30)}" r="${f(0.35 + r() * 0.7)}" fill="#fff" opacity="0.8"/>`;
  if (sf === 'plasma') head += `<ellipse cx="200" cy="36" rx="10" ry="4" fill="${V.glow2}" opacity="0.3"/>`;
  head += `</g>`;
  // Brow plate, jaw, mouth, teeth, nostril with ember puff.
  head += `<path d="M186 36 C192 30 204 29 212 34 L209 37 C201 33 193 34 188 39Z" fill="${dk(p.body, 0.3)}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
  head += `<path d="M198 58 C208 58 219 57 228 54 C223 59 213 62 203 62Z" fill="${p.belly}"/>`;
  head += `<path d="M202 56 C212 57 221 56 230 52" stroke="${line}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  head += `<path d="M212 56.4 l1.8 3.4 l1.8 -3.6z M220 55.6 l1.4 2.6 l1.4 -2.8z" fill="#fff" stroke="${line}" stroke-width="0.4"/>`;
  head += `<ellipse cx="228" cy="44" rx="2.2" ry="1.4" fill="${line}"/>`;
  if (!starfire) head += `<circle class="puff" cx="236" cy="40" r="1.8" fill="${lt(p.accent, 0.3)}" opacity="0.8"/><circle class="puff p2" cx="239" cy="37" r="1.2" fill="${p.accent}" opacity="0.7"/>`;
  head += `<path d="M206 51 l5 -1 M207 53 l5 0" stroke="${dk(p.body, 0.25)}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>`;
  head += `<ellipse cx="208" cy="50" rx="3.8" ry="2.2" fill="${starfire ? V.glow : '#ff8fab'}" opacity="0.45"/>`;
  // Eye.
  head += `<ellipse cx="197" cy="42" rx="${eyeR}" ry="${f(eyeR + 0.6)}" fill="#fffdf6" stroke="${line}" stroke-width="1.6"/>`;
  head += `<circle cx="198.6" cy="42.8" r="${f(eyeR * 0.76)}" fill="${iris}"/><path d="M${f(198.6 - eyeR * 0.76)} 44 a${f(eyeR * 0.76)} ${f(eyeR * 0.76)} 0 0 0 ${f(eyeR * 1.52)} 0z" fill="${dk(iris, 0.35)}"/>`;
  head += `<circle cx="198.6" cy="42.8" r="${f(eyeR * 0.76)}" fill="none" stroke="${dk(iris, 0.5)}" stroke-width="0.7"/>`;
  head += `<ellipse cx="199.4" cy="43" rx="${f(eyeR * 0.3)}" ry="${f(eyeR * 0.56)}" fill="#120c22"/>`;
  head += starfire ? star4(201, 39.4, eyeR * 0.4, '#fff') : `<path d="M200 ${f(43 - eyeR * 0.75)} l${f(eyeR * 0.42)} ${f(eyeR * 0.3)} l${f(-eyeR * 0.42)} ${f(eyeR * 0.3)} l${f(-eyeR * 0.2)} ${f(-eyeR * 0.3)}z" fill="#fff"/>`;
  head += `<circle cx="196.4" cy="${f(43 + eyeR * 0.45)}" r="${f(eyeR * 0.12)}" fill="#fff" opacity="0.9"/>`;
  head += `<ellipse class="lid" cx="197" cy="42" rx="${f(eyeR + 1)}" ry="${f(eyeR + 1.5)}" fill="${p.body}" stroke="${line}" stroke-width="1.2"/>`;
  head += `<path d="M188 ${f(40 - eyeR)} C194 ${f(36 - eyeR)} 201 ${f(36 - eyeR)} 207 ${f(39 - eyeR)}" stroke="${line}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  if (sf === 'lightning') head += glowLine('M184 26 L188 20 L186 18 L192 12 L190 10 L196 4', V.glow, 1.1, 'flick') + glowLine('M192 28 L198 24 L196 22 L202 18', V.glow2, 0.8, 'flick f2');
  if (sf === 'plasma') head += `<circle cx="200" cy="${f(28 - eyeR)}" r="3.6" fill="${V.glow}" opacity="0.4" class="pulse"/><path d="M200 ${f(24.6 - eyeR)} l2.6 3.4 l-2.6 3.4 l-2.6 -3.4z" fill="#ffd6fb" stroke="${dk(V.glow, 0.4)}" stroke-width="0.6"/>`;
  if (sf === 'neon') head += glowLine(`M188 ${f(47 + eyeR * 0.3)} L206 ${f(47 + eyeR * 0.3)}`, V.glow, 0.8, 'pulse p2');

  // ---- Starfire aura and orbiting stars ----
  let aura = '', orbit = '';
  if (starfire) {
    aura = `<ellipse class="aura" cx="128" cy="74" rx="124" ry="76" fill="url(#${id}a)"/>`;
    if (sf === 'lightning') {
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, x = 128 + Math.cos(a) * 112, y = 74 + Math.sin(a) * 66; const b = bolt(r, x, y, x + Math.cos(a + 1.4) * 14, y + Math.sin(a + 1.4) * 10, 3, 6); orbit += glowLine(b.d, i % 2 ? V.glow : V.glow2, 0.9, `flick f${(i % 3) + 1}`); }
    } else if (sf === 'plasma') {
      orbit = `<g class="orbit" style="transform-origin:128px 74px">${Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2, x = 128 + Math.cos(a) * 112, y = 74 + Math.sin(a) * 64, rr = i % 2 ? 3 : 4.4; return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 1.9)}" fill="${i % 2 ? V.glow2 : V.glow}" opacity="0.25"/><circle cx="${f(x)}" cy="${f(y)}" r="${rr}" fill="${i % 2 ? V.glow2 : V.glow}"/><circle cx="${f(x - 1)}" cy="${f(y - 1)}" r="${f(rr * 0.35)}" fill="#fff"/>`; }).join('')}</g>`;
    } else {
      orbit = `<g class="pulse">${glowLine('M18 74 A110 64 0 0 1 238 74', V.glow, 0.9)}${glowLine('M238 80 A110 64 0 0 1 18 80', V.glow2, 0.9)}</g>`;
    }
    for (let i = 0; i < 40; i++) orbit += `<circle class="tw" cx="${f(-10 + r() * 250)}" cy="${f(-8 + r() * 156)}" r="${f(0.6 + r() * 1)}" fill="${i % 3 ? '#fff' : V.glow}" opacity="0.85"/>`;
  }
  const ground = `<ellipse cx="128" cy="150" rx="66" ry="5" fill="#000" opacity="0.18"/>`;
  const sc = A.scale;
  return `<svg class="dragon flap" viewBox="-48 -20 300 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${starfire ? 'Starglint' : 'Emberback'} ${stage}">
<defs>${defs}</defs>${aura}${ground}
<g transform="translate(${f(120 - 120 * sc)} ${f(78 - 78 * sc)}) scale(${sc})"><g class="rig">
<g transform="translate(122 68) scale(${f(A.wing * 0.86)})"><g class="wing wing-back">${wing(true)}</g></g>
<path d="${FARLEG}" fill="${dk(p.body, 0.3)}" stroke="${line}" stroke-width="${SW * 0.8}" stroke-linejoin="round"/>
<g transform="translate(84 92)"><g class="tail">${tail}</g></g>
${spines}
${body}
${legs}
<g transform="translate(184 52) scale(${A.head})"><g class="head"><g transform="translate(-184 -52)">${head}</g></g></g>
<g transform="translate(132 70) scale(${A.wing})"><g class="wing wing-front">${wing(false)}</g></g>
</g></g>${orbit}</svg>`;
}


/** The approved cel-shaded Emberback in its Cinder colors. */
export function celEmberback(stage: 'hatchling' | 'young' | 'adult' = 'adult'): string {
return emberback({ body: '#d9480f', belly: '#ffc078', wing: '#a61e4d', accent: '#ffd43b' }, stage);
}
