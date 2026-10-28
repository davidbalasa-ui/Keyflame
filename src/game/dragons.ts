// Original dragon tribes and the procedural art for dragons and eggs.

import { SEASONS } from '../content/seasons';
import { STARGLINT_LOOK, starglintSvg } from './starglintArt';

export type TribeId = 'emberback' | 'tidefin' | 'stormcrest' | 'mossclaw' | 'frostspine' | 'duneskimmer' | 'shadeglide';

export interface Palette {
  name: string;
  body: string;
  belly: string;
  wing: string;
  accent: string;
  rare?: boolean;
}

export interface Tribe {
  id: TribeId;
  name: string;
  home: string;
  perk: string;
  lore: string;
  /** Correct keystrokes needed to hatch this tribe's egg. */
  hatchKeys: number;
  palettes: Palette[];
}

export const TRIBES: Record<TribeId, Tribe> = {
  emberback: {
    id: 'emberback',
    name: 'Emberback',
    home: 'Volcano Ridges',
    perk: 'Flame meter fills faster',
    lore: 'Emberbacks sleep on warm lava rock and wake up ready to race. The spines on their backs glow when they are happy.',
    hatchKeys: 300,
    palettes: [
      { name: 'Cinder', body: '#d9480f', belly: '#ffc078', wing: '#a61e4d', accent: '#ffd43b' },
      { name: 'Coal', body: '#495057', belly: '#ff922b', wing: '#212529', accent: '#ff6b6b' },
      { name: 'Sunset', body: '#f76707', belly: '#ffe066', wing: '#e8590c', accent: '#fa5252' },
      { name: 'Molten Gold', body: '#f59f00', belly: '#fff3bf', wing: '#e67700', accent: '#ff4d4f', rare: true },
    ],
  },
  tidefin: {
    id: 'tidefin',
    name: 'Tidefin',
    home: 'Reef Coasts',
    perk: 'Typos cost less speed',
    lore: 'Tidefins glide over the waves and can hold their breath for an hour. Their fins help them turn in a flash.',
    hatchKeys: 1500,
    palettes: [
      { name: 'Lagoon', body: '#1098ad', belly: '#99e9f2', wing: '#0b7285', accent: '#3bc9db' },
      { name: 'Deep Sea', body: '#364fc7', belly: '#91a7ff', wing: '#1c3a8a', accent: '#4dabf7' },
      { name: 'Coral', body: '#f06595', belly: '#ffdeeb', wing: '#c2255c', accent: '#63e6be' },
      { name: 'Pearl', body: '#e9ecef', belly: '#ffffff', wing: '#a5d8ff', accent: '#74c0fc', rare: true },
    ],
  },
  stormcrest: {
    id: 'stormcrest',
    name: 'Stormcrest',
    home: 'Cliff Peaks',
    perk: 'Longer flame dash',
    lore: 'Stormcrests nest on the highest peaks and love thunder. Their crests crackle before a big race.',
    hatchKeys: 2000,
    palettes: [
      { name: 'Thunder', body: '#5f3dc4', belly: '#d0bfff', wing: '#3b2a8a', accent: '#ffe066' },
      { name: 'Slate', body: '#5c7080', belly: '#c5d3dc', wing: '#34444f', accent: '#74c0fc' },
      { name: 'Twilight', body: '#862e9c', belly: '#eebefa', wing: '#5f1f70', accent: '#ffa8a8' },
      { name: 'Lightning', body: '#fcc419', belly: '#fff9db', wing: '#5f3dc4', accent: '#ffffff', rare: true },
    ],
  },
  mossclaw: {
    id: 'mossclaw',
    name: 'Mossclaw',
    home: 'Deep Forest',
    perk: 'Steadier speed on long words',
    lore: 'Mossclaws blend into the forest. Leafy frills grow along their necks, and they never forget a trail.',
    hatchKeys: 2500,
    palettes: [
      { name: 'Fern', body: '#2f9e44', belly: '#c0eb75', wing: '#2b8a3e', accent: '#ffd43b' },
      { name: 'Bark', body: '#8d5b3a', belly: '#e9c79f', wing: '#5c3b23', accent: '#94d82d' },
      { name: 'Spring', body: '#66a80f', belly: '#ffec99', wing: '#5c940d', accent: '#f783ac' },
      { name: 'Ancient Oak', body: '#2b2b2b', belly: '#a9e34b', wing: '#1e3a1e', accent: '#d8f5a2', rare: true },
    ],
  },
  frostspine: {
    id: 'frostspine',
    name: 'Frostspine',
    home: 'Ice Fields',
    perk: 'Bonus for words with no mistakes',
    lore: 'Frostspines are patient and precise. Their breath leaves sparkling frost, and they never rush a turn.',
    hatchKeys: 2500,
    palettes: [
      { name: 'Glacier', body: '#a5d8ff', belly: '#f1f8ff', wing: '#4dabf7', accent: '#e7f5ff' },
      { name: 'Snowdrift', body: '#f1f3f5', belly: '#ffffff', wing: '#adb5bd', accent: '#74c0fc' },
      { name: 'Midwinter', body: '#3b5bdb', belly: '#bac8ff', wing: '#283b9c', accent: '#d0ebff' },
      { name: 'Aurora', body: '#20c997', belly: '#e6fcf5', wing: '#7950f2', accent: '#c3fae8', rare: true },
    ],
  },
  duneskimmer: {
    id: 'duneskimmer',
    name: 'Duneskimmer',
    home: 'Golden Desert',
    perk: 'Faster sprint finish',
    lore: 'Duneskimmers race the desert wind at sunrise. Long frills keep the sand out of their eyes.',
    hatchKeys: 3000,
    palettes: [
      { name: 'Sandstone', body: '#e8b86d', belly: '#fff3d6', wing: '#c47f2c', accent: '#8d5b3a' },
      { name: 'Red Mesa', body: '#c0532b', belly: '#ffd8a8', wing: '#8a3417', accent: '#ffe066' },
      { name: 'Oasis', body: '#d4a373', belly: '#fefae0', wing: '#2a9d8f', accent: '#e9c46a' },
      { name: 'Sun Gold', body: '#ffd43b', belly: '#fff9db', wing: '#f08c00', accent: '#ffffff', rare: true },
    ],
  },
  shadeglide: {
    id: 'shadeglide',
    name: 'Shadeglide',
    home: 'Night Caves',
    perk: 'Typos only half-empty the flame meter',
    lore: 'Shadeglides fly at night with starlight on their wings. They love old stories and quiet caves.',
    hatchKeys: 3000,
    palettes: [
      { name: 'Midnight', body: '#25235a', belly: '#6c63b5', wing: '#14123a', accent: '#ffe066' },
      { name: 'Dusk', body: '#5f3dc4', belly: '#b197fc', wing: '#3b1f8a', accent: '#fcc2d7' },
      { name: 'Moonlit', body: '#495057', belly: '#dee2e6', wing: '#212529', accent: '#a5d8ff' },
      { name: 'Comet', body: '#0b0b1f', belly: '#3d3d7a', wing: '#1c1c4a', accent: '#ff922b', rare: true },
    ],
  },
};

/** The supporter's own Starglint dragon. */
export const STARGLINT: Palette = { name: 'Starglint', body: '#1d2a6b', belly: '#9ad7ff', wing: '#0f1a4a', accent: '#ffe95c' };

/**
 * Season colors work on any tribe. A dragon's palette number at or above this
 * points into SEASONS instead of the tribe's own colors.
 */
export const SEASON_PALETTE = 100;

export const isSeasonPalette = (palette: number): boolean => palette >= SEASON_PALETTE;

/** The colors a palette number stands for, falling back to the tribe's first color. */
export function paletteFor(tribe: TribeId, palette: number): Palette {
  if (isSeasonPalette(palette)) {
    const s = SEASONS[palette - SEASON_PALETTE];
    if (s) return { ...s.color };
  }
  return TRIBES[tribe].palettes[palette] ?? TRIBES[tribe].palettes[0];
}

export type Stage = 'hatchling' | 'young' | 'adult';

/** Correct keystrokes raced with a dragon before it grows. */
export const GROWTH = { young: 2000, adult: 6000 };

export function stageFor(xp: number): Stage {
  if (xp >= GROWTH.adult) return 'adult';
  if (xp >= GROWTH.young) return 'young';
  return 'hatchling';
}

export const NAME_STARTS = ['Ash', 'Brook', 'Cinder', 'Dusk', 'Ember', 'Fern', 'Glim', 'Hollow', 'Ivy', 'Jade', 'Kestrel', 'Lumen', 'Moss', 'Nova', 'Onyx', 'Pebble', 'Quill', 'Rune', 'Sable', 'Thistle', 'Umber', 'Vale', 'Wren', 'Zephyr'];
export const NAME_ENDS = ['claw', 'tail', 'spark', 'flare', 'scale', 'heart', 'song', 'fang', 'gleam', 'drift', 'storm', 'shine'];

/** Small seeded random generator so a dragon always looks the same. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Body patterns. Each color comes in every pattern, so each tribe has 12 looks. */
export const MARKINGS = ['Plain', 'Spotted', 'Striped'] as const;

/** Half of eggs are plain; the rest are spotted or striped. */
export function rollMarking(rand: () => number = Math.random): number {
  const r = rand();
  return r < 0.5 ? 0 : r < 0.75 ? 1 : 2;
}

/** The name of a look, such as "Spotted Cinder". Plain looks use just the color. */
export function lookName(tribe: TribeId, palette: number, marking = 0): string {
  const color = isSeasonPalette(palette) ? paletteFor(tribe, palette).name : TRIBES[tribe].palettes[palette]?.name ?? '';
  return marking ? `${MARKINGS[marking]} ${color}` : color;
}

/** Rolls a color variant. Rare variants turn up about one egg in ten. */
export function rollPalette(tribe: TribeId, rand: () => number = Math.random): number {
  const palettes = TRIBES[tribe].palettes;
  if (rand() < 0.1) return palettes.findIndex((p) => p.rare);
  const common = palettes.map((p, i) => (p.rare ? -1 : i)).filter((i) => i >= 0);
  return common[Math.floor(rand() * common.length)];
}

/** Mixes a #rrggbb color toward black (0) or white (255). */
function mix(hex: string, target: number, amount: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((c) => Math.round(c + (target - c) * amount).toString(16).padStart(2, '0'))
    .join('')}`;
}
const darken = (hex: string, a: number): string => mix(hex, 0, a);
const lighten = (hex: string, a: number): string => mix(hex, 255, a);

/** A curved spike sweeping back from a point on the dragon's back. */
function spike(x: number, y: number, h: number, w: number): string {
  return `M${x - w} ${y} Q${x - w * 0.2} ${y - h * 0.55} ${x - w * 1.2} ${y - h} Q${x + w * 0.6} ${y - h * 0.45} ${x + w} ${y}Z`;
}

// Points along the back and neck, from hip to head.
const BACK: Array<[number, number]> = [[90, 75], [103, 69], [116, 66], [129, 65], [142, 64], [153, 60], [162, 54], [170, 46]];

interface TribeParts {
  /** Drawn behind the body (spines, fins). */
  back: string;
  /** Drawn over the body. */
  front: string;
  /** Head extras, in head space. */
  head: string;
  /** Tail tip, drawn at the end of the tail (pointing left). */
  tip: string;
  /** Extras that ride on the front wing, in wing space. */
  wing: string;
}

function tribeParts(tribe: TribeId, p: Palette, stage: Stage, line: string): TribeParts {
  const k = stage === 'adult' ? 1 : stage === 'young' ? 0.7 : 0.45;
  const a = p.accent;
  const spineRow = (hs: number[], w = 5): string => BACK.slice(0, hs.length).map(([x, y], i) => spike(x, y + 3, hs[i] * k, w)).join(' ');
  switch (tribe) {
    case 'emberback':
      return {
        back: `<path class="glow" d="${spineRow([10, 13, 15, 15, 14, 12, 10, 8])}" fill="${a}" stroke="${line}" stroke-width="1.4"/>`,
        front: '',
        head: '',
        tip: `<path class="glow" d="M2 -2 C-4 -8 -8 -16 -4 -22 C-2 -14 -10 -14 -12 -8 C-16 -14 -22 -10 -22 -2 C-24 6 -14 12 2 4Z" fill="${a}" stroke="${line}" stroke-width="1.4"/>`,
        wing: '',
      };
    case 'tidefin':
      return {
        back: `<path d="M94 76 C100 ${66 - 16 * k} 120 ${58 - 14 * k} 146 64 Z" fill="${a}" stroke="${line}" stroke-width="1.5"/><path d="M108 70 L112 ${64 - 12 * k} M122 66 L126 ${60 - 12 * k} M136 64 L138 ${60 - 8 * k}" stroke="${line}" stroke-width="1.2" opacity="0.5"/>`,
        front: '',
        head: `<path d="M182 44 C176 ${34 - 6 * k} 166 ${30 - 6 * k} 156 ${34 - 4 * k} C164 38 170 44 178 50Z" fill="${a}" stroke="${line}" stroke-width="1.5"/>`,
        tip: `<path d="M2 0 L-16 -14 Q-10 0 -16 14Z" fill="${a}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`,
        wing: '',
      };
    case 'stormcrest':
      return {
        back: `<path class="glow" d="${spineRow([6, 9, 11, 11, 10, 9, 8, 7], 4)}" fill="${a}" stroke="${line}" stroke-width="1.3"/>`,
        front: `<path d="M104 78 l8 6 l-3 4 l8 6 M128 76 l7 6 l-3 4 l7 6" stroke="${a}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>`,
        head: `<path class="glow" d="M188 32 L184 ${20 - 8 * k} L192 26 L192 ${14 - 8 * k} L198 28Z" fill="${a}" stroke="${line}" stroke-width="1.3"/>`,
        tip: `<path class="glow" d="M2 -1 L-8 -12 L-7 -3 L-20 -8 L-9 6 L-11 0Z" fill="${a}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`,
        wing: '',
      };
    case 'mossclaw':
      return {
        back: BACK.slice(0, 7)
          .map(([x, y], i) => `<ellipse cx="${x - 2}" cy="${y - 2}" rx="${(4 + (i % 2) * 2) * (0.6 + k * 0.4)}" ry="${2.6 + k}" transform="rotate(${-30 - i * 4} ${x - 2} ${y - 2})" fill="${i % 2 ? a : lighten(a, 0.25)}" stroke="${line}" stroke-width="1.2"/>`)
          .join(''),
        front: '',
        head: `<path d="M186 32 C182 ${24 - 6 * k} 176 ${22 - 6 * k} 172 ${24 - 4 * k} C176 28 180 30 184 34Z" fill="${a}" stroke="${line}" stroke-width="1.3"/>`,
        tip: `<path d="M2 0 C-4 -10 -16 -10 -24 0 C-16 10 -4 10 2 0Z M2 0 L-20 0" fill="${a}" stroke="${line}" stroke-width="1.4"/>`,
        wing: '',
      };
    case 'frostspine':
      return {
        back: `<path class="glow" d="${spineRow([12, 16, 19, 19, 17, 14, 12, 9], 3.4)}" fill="${a}" stroke="${line}" stroke-width="1.2"/>`,
        front: `<path d="M98 84 l5 3 M118 82 l5 3 M138 80 l5 3" stroke="${a}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`,
        head: '',
        tip: `<path class="glow" d="M2 0 L-8 -9 L-24 0 L-8 9Z M-8 -9 L-8 9" fill="${a}" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/>`,
        wing: '',
      };
    case 'duneskimmer':
      return {
        back: `<path d="M96 76 C110 ${68 - 8 * k} 130 ${62 - 8 * k} 150 62 L146 66 C128 66 112 70 98 78Z" fill="${a}" stroke="${line}" stroke-width="1.3"/>`,
        front: `<path d="M96 88 Q112 82 130 86 Q144 88 156 82" stroke="${a}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.75"/>`,
        head: `<path d="M180 38 C168 ${30 - 6 * k} 156 ${30 - 4 * k} 148 36 C160 36 170 40 178 46Z" fill="${a}" stroke="${line}" stroke-width="1.4"/><path d="M178 46 C166 44 156 48 150 54 C162 52 170 52 178 52Z" fill="${lighten(a, 0.2)}" stroke="${line}" stroke-width="1.3"/>`,
        tip: `<path d="M2 0 C-8 -6 -18 -10 -26 -8 C-20 -2 -20 2 -26 8 C-18 10 -8 6 2 0Z" fill="${a}" stroke="${line}" stroke-width="1.4"/>`,
        wing: '',
      };
    case 'shadeglide':
      return {
        back: `<path d="${spineRow([5, 7, 8, 8, 8, 7, 6, 5], 4)}" fill="${darken(p.body, 0.3)}" stroke="${line}" stroke-width="1.2"/>`,
        front: `<g fill="${a}"><circle cx="100" cy="82" r="1.6"/><circle cx="118" cy="76" r="1.2"/><circle cx="136" cy="80" r="1.5"/><circle cx="150" cy="72" r="1.1"/></g>`,
        head: `<circle cx="196" cy="42" r="10" fill="${a}" opacity="0.18"/>`,
        tip: `<path d="M2 0 C-6 -10 -18 -14 -26 -8 C-16 -8 -12 -2 -14 4 C-8 2 -4 2 2 0Z" fill="${a}" stroke="${line}" stroke-width="1.3" opacity="0.9"/>`,
        wing: `<g fill="${a}"><circle cx="-30" cy="-44" r="1.6"/><circle cx="-48" cy="-30" r="1.3"/><circle cx="-22" cy="-24" r="1.1"/><circle cx="-54" cy="-50" r="1"/><circle cx="-40" cy="-14" r="1.4"/></g>`,
      };
  }
}

// The wing membrane with the shoulder at 0,0: a leading arm up to the wrist,
// three fingers fanning back, and scalloped skin between them.
const WING_SKIN = 'M0 0 C9 -20 5 -44 -6 -58 L-46 -64 Q-44 -46 -66 -40 Q-52 -28 -70 -14 Q-42 -12 -34 4Z';
const WING_BONES = 'M-6 -58 L-46 -64 M-6 -58 L-66 -40 M-6 -58 L-70 -14';

const BODY = 'M78 92 C80 74 104 64 130 66 C146 66 156 64 164 56 C170 50 174 44 178 40 L196 54 C190 60 184 70 176 82 C168 96 150 108 124 109 C100 110 80 106 78 92Z';

/** Spots or stripes in a darker shade, clipped to the body so they wrap around it. */
function markingArt(marking: number, p: Palette, clip: string): string {
  if (!marking) return '';
  // Dark dragons get lighter marks so the pattern always shows.
  const n = parseInt(p.body.slice(1, 7), 16);
  const light = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  const ink = light < 0.35 ? lighten(p.body, 0.4) : darken(p.body, 0.3);
  const shine = lighten(p.accent, 0.1);
  if (marking === 1) {
    const spots: Array<[number, number, number]> = [[96, 80, 5], [110, 73, 4], [124, 78, 6], [138, 71, 4.5], [150, 77, 5], [162, 64, 4], [172, 56, 3.5], [116, 88, 3], [142, 86, 3.4], [104, 90, 2.6]];
    return `<g clip-path="url(#${clip})">${spots.map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r * 0.8).toFixed(1)}" fill="${ink}" opacity="0.7"/><ellipse cx="${x - r * 0.25}" cy="${y - r * 0.3}" rx="${(r * 0.35).toFixed(1)}" ry="${(r * 0.25).toFixed(1)}" fill="${shine}" opacity="0.35"/>`).join('')}</g>`;
  }
  const bands = [92, 106, 120, 134, 148, 160, 171]
    .map((x, i) => `<path d="M${x - 4} ${58 - i} Q${x + 4} ${76 - i} ${x - 2} ${96 - i * 2}" stroke="${ink}" stroke-width="${5 - i * 0.35}" fill="none" stroke-linecap="round" opacity="0.65"/>`)
    .join('');
  return `<g clip-path="url(#${clip})">${bands}</g>`;
}

/** Four-point sparkle centered on x, y. */
const sparkle = (x: number, y: number, r: number, fill: string, cls = ''): string =>
  `<path class="${cls}" d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${fill}"/>`;

/**
 * Evolved dragons glow in their own colors. Each star adds a little more: an aura,
 * then sparkles, gold wing glints, and at full stars a small gold circlet.
 */
function evolvedArt(id: string, p: Palette, stars: number): { aura: string; head: string; sparkles: string } {
  const spots: Array<[number, number, number]> = [[40, 20, 4.5], [222, 8, 4], [12, 96, 3.5], [236, 98, 3.5]];
  return {
    aura: `<defs><radialGradient id="${id}v" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${p.accent}" stop-opacity="${(0.16 + stars * 0.08).toFixed(2)}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient></defs>
    <ellipse class="evo-aura" cx="130" cy="74" rx="${120 + stars * 6}" ry="${66 + stars * 4}" fill="url(#${id}v)"/>`,
    head: stars >= MAX_EVOLVE ? '<path d="M184 30 l3 -7 l4 5 l4 -7 l4 7 l4 -5 l2 8 q-10 -3 -21 -1z" fill="#ffd43b" stroke="#b07800" stroke-width="1"/>' : '',
    sparkles: `<g class="evo-sparkles">${spots.slice(0, stars).map(([x, y, r]) => sparkle(x, y, r, stars >= 3 ? '#ffd43b' : p.accent, 'sf-twinkle')).join('')}</g>`,
  };
}

const MAX_EVOLVE = 4;

let artId = 0;

/**
 * Side-view flying dragon facing right, as an SVG string.
 * Wings, tail and head sit in their own groups, pivoting at the shoulder,
 * tail base and neck, so CSS can animate them (see .flap in styles.css).
 */
export function dragonSvg(tribe: TribeId, paletteIndex: number, stage: Stage = 'adult', extraClass = '', skin?: 'starglint', marking = 0, stars = 0, raceSize = false): string {
  if (skin === 'starglint') {
    // The supporter's Starglint dragon has its own body and art.
    const evo = stars > 0 ? evolvedArt(`kf${++artId}`, STARGLINT, stars) : null;
    return starglintSvg(stage, extraClass, STARGLINT_LOOK, { behind: evo?.aura, front: evo?.sparkles, head: evo?.head, lite: raceSize });
  }
  const p = paletteFor(tribe, paletteIndex);
  const id = `kf${++artId}`;
  const line = darken(p.body, 0.55);
  const wingDark = darken(p.wing, 0.28);
  const bellyLine = darken(p.belly, 0.22);
  const parts = tribeParts(tribe, p, stage, line);
  const evo = stars > 0 ? evolvedArt(id, p, stars) : null;
  const scale = stage === 'hatchling' ? 0.8 : stage === 'young' ? 0.9 : 1;
  const headScale = stage === 'hatchling' ? 1.36 : stage === 'young' ? 1.2 : 1.1;
  const wingScale = stage === 'hatchling' ? 0.76 : stage === 'young' ? 1.02 : 1.22;
  const eyeR = stage === 'hatchling' ? 8.6 : stage === 'young' ? 7.8 : 7.2;
  const shine = lighten(p.body, 0.5);
  // Eye color comes from the accent, kept away from white so the iris always reads.
  const iris = mix(p.accent, 0, 0.12);
  const horns =
    stage === 'hatchling'
      ? `<path d="M186 32 l-7 -6 l10 1z" fill="${p.belly}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`
      : `<path d="M186 34 C180 ${24 - (stage === 'adult' ? 6 : 0)} 170 ${18 - (stage === 'adult' ? 6 : 0)} 158 ${16 - (stage === 'adult' ? 6 : 0)} C166 22 172 30 178 40Z" fill="${p.belly}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M194 30 C192 22 188 ${16 - (stage === 'adult' ? 4 : 0)} 180 ${12 - (stage === 'adult' ? 4 : 0)} C186 18 188 24 188 32Z" fill="${lighten(p.belly, 0.2)}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`;
  const plates = [100, 112, 124, 136, 148, 160]
    .map((x, i) => `M${x} ${104 - i * 0.6 - (i > 3 ? (i - 3) * 4 : 0)} q2 3 1 6`)
    .join(' ');
  const wing = (cls: string, fill: string, extra: string, s: number): string =>
    `<g transform="translate(${cls === 'wing-back' ? '122 68' : '132 70'}) scale(${(wingScale * s).toFixed(2)})"><g class="wing ${cls}">
      <path d="${WING_SKIN}" fill="${fill}" stroke="${line}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M-6 -58 L-46 -64 Q-44 -46 -66 -40Z M-6 -58 L-70 -14 Q-42 -12 -34 4 L0 0 C6 -16 4 -40 -6 -58Z" fill="${darken(p.wing, 0.35)}" opacity="0.3"/>
      <path d="M-46 -64 Q-44 -46 -66 -40 Q-52 -28 -70 -14 Q-42 -12 -34 4" stroke="${lighten(p.wing, 0.45)}" stroke-width="1.6" fill="none" opacity="0.5" stroke-linecap="round"/>
      <path d="${WING_BONES}" stroke="${cls === 'wing-back' ? line : wingDark}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <path d="M0 0 C9 -20 5 -44 -6 -58" stroke="${line}" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M-6 -58 l3 -7 l2 7z" fill="${p.belly}" stroke="${line}" stroke-width="1"/>
      ${extra}
    </g></g>`;
  return `<svg class="dragon ${extraClass}" viewBox="-26 -12 266 162" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighten(p.body, 0.22)}"/><stop offset="0.55" stop-color="${p.body}"/><stop offset="1" stop-color="${darken(p.body, 0.22)}"/></linearGradient>
    <linearGradient id="${id}w" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${p.wing}"/><stop offset="1" stop-color="${lighten(p.wing, 0.35)}"/></linearGradient>
    <radialGradient id="${id}i" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="${lighten(iris, 0.45)}"/><stop offset="0.6" stop-color="${iris}"/><stop offset="1" stop-color="${darken(iris, 0.5)}"/></radialGradient>
    <radialGradient id="${id}h" cx="0.55" cy="0.3" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    ${marking ? `<clipPath id="${id}c"><path d="${BODY}"/></clipPath>` : ''}
  </defs>
  ${evo?.aura ?? ''}
  <g transform="translate(${(120 - 120 * scale).toFixed(1)} ${(78 - 78 * scale).toFixed(1)}) scale(${scale})"><g class="rig">
    ${wing('wing-back', darken(p.wing, 0.18), '', 0.86)}
    <path d="M100 100 C96 110 90 116 80 118 L72 121 L76 116 L70 115 L78 112 C86 108 90 102 92 96Z" fill="${darken(p.body, 0.25)}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
    <g transform="translate(84 92)"><g class="tail">
      <path d="M4 -13 C-18 -17 -38 -9 -50 5 C-60 16 -72 22 -84 18 C-74 29 -58 29 -46 19 C-34 9 -18 6 4 10Z" fill="url(#${id}b)" stroke="${line}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M2 8 C-18 5 -32 9 -44 18" stroke="${p.belly}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.9"/>
      <g transform="translate(-84 19)">${parts.tip}</g>
    </g></g>
    ${parts.back}
    <path d="${BODY}" fill="url(#${id}b)" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>
    ${markingArt(marking, p, `${id}c`)}
    <ellipse cx="140" cy="76" rx="22" ry="10" fill="url(#${id}h)"/>
    <path d="M84 84 C90 74 106 69 130 69 C146 69 157 66 165 58 C169 54 172 50 175 46" stroke="${shine}" stroke-width="2.4" fill="none" opacity="0.45" stroke-linecap="round"/>
    <path d="M88 101 C104 108 134 108 152 100 C164 92 172 80 180 68 L187 71 C180 84 172 98 158 105 C136 114 104 112 88 101Z" fill="${p.belly}"/>
    <path d="${plates}" stroke="${bellyLine}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    ${parts.front}
    <path d="M96 96 C88 104 88 112 96 114 C104 116 112 110 112 100 C110 92 102 90 96 96Z" fill="url(#${id}b)" stroke="${line}" stroke-width="1.6"/>
    <path d="M100 112 C96 118 90 120 82 121 L76 124 L80 119 L74 118 L82 116 C88 114 92 112 94 108Z" fill="${p.body}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M154 98 C158 106 162 110 168 110 L174 113 L171 108 L177 108 L170 104 C164 102 160 98 158 94Z" fill="${p.body}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
    <g fill="#fffdf5" stroke="${line}" stroke-width="0.7" stroke-linejoin="round">${[[174, 113, 1], [177, 108, 1], [76, 124, -1], [74, 118, -1], [72, 121, -1], [70, 115, -1]].map(([x, y, d]) => `<path d="M${x} ${y} l${2.8 * d} 0.6 l${-1.6 * d} 2.2z"/>`).join('')}</g>
    <g transform="translate(184 52) scale(${headScale})"><g class="head"><g transform="translate(-184 -52)">
      ${horns}
      ${parts.head}
      ${evo?.head ?? ''}
      <path d="M176 52 l-10 3 l8 2 l-9 6 l13 -3z" fill="${p.wing}" stroke="${line}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M174 44 C176 30 192 24 205 29 C213 32 219 36 225 40 C231 43 233 47 231 51 C229 55 223 57 216 57 C207 59 199 61 190 61 C180 61 172 54 174 44Z" fill="url(#${id}b)" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M200 57 C209 57 218 56 225 54 C221 58 212 60 204 60Z" fill="${p.belly}"/>
      <path d="M204 55 C212 56 220 55 227 52" stroke="${line}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M214 54.6 l1.6 3.2 l1.6 -3.4z" fill="#fff"/>
      <ellipse cx="225.5" cy="45" rx="1.8" ry="1.3" fill="${line}"/>
      <path d="M180 41 C184 33 194 29 206 31" stroke="${shine}" stroke-width="2.2" fill="none" opacity="0.5" stroke-linecap="round"/>
      <path d="M212 37 C217 38 223 40 228 43" stroke="${shine}" stroke-width="1.8" fill="none" opacity="0.4" stroke-linecap="round"/>
      <ellipse cx="210" cy="51" rx="3.6" ry="2.2" fill="#ff8fab" opacity="0.35"/>
      <ellipse cx="197" cy="42" rx="${eyeR}" ry="${eyeR + 0.6}" fill="#fff" stroke="${line}" stroke-width="1.3"/>
      <circle cx="198.6" cy="42.8" r="${eyeR * 0.74}" fill="url(#${id}i)"/>
      <ellipse cx="199.2" cy="43" rx="${eyeR * 0.34}" ry="${eyeR * 0.5}" fill="#120c22"/>
      <circle cx="201.2" cy="40.2" r="${eyeR * 0.27}" fill="#fff"/>
      <circle cx="196.8" cy="45.6" r="${eyeR * 0.12}" fill="#fff" opacity="0.85"/>
      <ellipse class="lid" cx="197" cy="42" rx="${eyeR + 1}" ry="${eyeR + 1.5}" fill="${p.body}" stroke="${line}" stroke-width="1.2"/>
      <path d="M189 ${36 - eyeR + 6} C195 ${32 - eyeR + 6} 201 ${32 - eyeR + 6} 206 ${35 - eyeR + 6}" stroke="${line}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    </g></g></g>
    ${wing('wing-front', `url(#${id}w)`, parts.wing, 1)}
  </g></g>
  ${evo?.sparkles ?? ''}
</svg>`;
}

/** An egg in the tribe's colors, cracking as warmth fills. */
export function eggSvg(tribe: TribeId, warmth: number, seed = 1, warmCracks = true): string {
  const p = TRIBES[tribe].palettes[0];
  const rand = seededRandom(seed);
  const spots = Array.from({ length: 7 }, () => {
    const x = 30 + rand() * 40;
    const y = 30 + rand() * 60;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(3 + rand() * 5).toFixed(1)}" ry="${(2 + rand() * 4).toFixed(1)}" fill="${p.accent}" opacity="0.75"/>`;
  }).join('');
  const cracks = !warmCracks ? '' : [
    warmth >= 0.25 ? '<path d="M50 22 l-4 10 l6 4 l-3 8" />' : '',
    warmth >= 0.5 ? '<path d="M30 60 l8 2 l4 -6 l7 5 l5 -4" />' : '',
    warmth >= 0.75 ? '<path d="M62 74 l6 -6 l4 6 l6 -3 M40 88 l6 -4 l5 4" />' : '',
  ].join('');
  const id = `kf${++artId}`;
  const line = darken(p.body, 0.5);
  return `<svg class="egg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="${id}e" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="${lighten(p.body, 0.35)}"/><stop offset="0.5" stop-color="${p.body}"/><stop offset="1" stop-color="${darken(p.body, 0.35)}"/></radialGradient>
    <radialGradient id="${id}g" cx="0.5" cy="0.6" r="0.5"><stop offset="0" stop-color="${p.accent}" stop-opacity="${(0.15 + warmth * 0.55).toFixed(2)}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="50" cy="66" rx="48" ry="56" fill="url(#${id}g)"/>
  <ellipse cx="50" cy="113" rx="28" ry="4.5" fill="#000" opacity="0.22"/>
  <path d="M50 6 C78 6 90 52 90 74 C90 98 72 112 50 112 C28 112 10 98 10 74 C10 52 22 6 50 6z" fill="url(#${id}e)" stroke="${line}" stroke-width="2"/>
  <g opacity="0.9">${spots}</g>
  <path d="M50 6 C78 6 90 52 90 74 C90 98 72 112 50 112 C40 112 32 108 26 102 C58 104 76 80 70 40 C66 20 58 8 50 6z" fill="#000" opacity="0.1"/>
  <ellipse cx="33" cy="36" rx="6" ry="13" fill="#fff" opacity="0.45" transform="rotate(22 33 36)"/>
  <circle cx="40" cy="22" r="2.4" fill="#fff" opacity="0.6"/>
  <g fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${cracks}</g>
</svg>`;
}

/** Taps it takes to open a ready egg. */
export const HATCH_TAPS = 6;

// Each tap adds one crack. The cracks join up into one zigzag around the middle,
// which is where the shell splits when the egg opens.
const TAP_CRACKS = [
  'M50 6 l-3 9 l5 5 l-4 8',
  'M48 28 l6 5 l-2 8 M52 20 l7 3',
  'M50 41 l-8 6 l-6 -3 l-6 7 M50 41 l9 5',
  'M30 51 l-9 4 l-8 -2 M59 46 l8 -4 l7 5 l9 -2',
  'M21 55 l-4 -6 M74 47 l2 -7 M44 44 l-2 -7',
  'M13 53 l-3 2 M83 46 l4 3',
];

/** The seam the shell splits along: left edge to right edge, through the cracks. */
export const EGG_SEAM = [[8, 54], [13, 53], [21, 55], [30, 51], [36, 54], [42, 47], [50, 41], [59, 46], [67, 42], [74, 47], [83, 46], [92, 49]];

/** Cracks drawn over an egg after `taps` taps, with light shining through the deeper ones. */
export function eggCracksSvg(tribe: TribeId, taps: number): string {
  const line = darken(TRIBES[tribe].palettes[0].body, 0.55);
  const shown = TAP_CRACKS.slice(0, Math.max(0, Math.min(taps, TAP_CRACKS.length)));
  const glow = taps >= 3 ? `<g fill="none" stroke="#fff6c8" stroke-width="${2 + taps}" stroke-linecap="round" stroke-linejoin="round" opacity="${(0.15 + taps * 0.1).toFixed(2)}">${shown.map((d) => `<path d="${d}"/>`).join('')}</g>` : '';
  return `<svg class="egg-cracks" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${glow}<g fill="none" stroke="${line}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${shown.map((d) => `<path d="${d}"/>`).join('')}</g></svg>`;
}
