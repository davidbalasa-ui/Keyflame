// Original dragon tribes and the procedural art for dragons and eggs.

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

/** Supporter skin: works on any tribe. */
export const STARFIRE: Palette = { name: 'Starfire', body: '#7048e8', belly: '#ffd43b', wing: '#f76707', accent: '#fff3bf' };

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

/** Rolls a color variant. Rare variants turn up about one egg in ten. */
export function rollPalette(tribe: TribeId, rand: () => number = Math.random): number {
  const palettes = TRIBES[tribe].palettes;
  if (rand() < 0.1) return palettes.findIndex((p) => p.rare);
  const common = palettes.map((p, i) => (p.rare ? -1 : i)).filter((i) => i >= 0);
  return common[Math.floor(rand() * common.length)];
}

function tribeFeature(tribe: TribeId, p: Palette, stage: Stage): string {
  const big = stage === 'adult';
  switch (tribe) {
    case 'emberback': {
      const spines = [70, 84, 98, 112, 126]
        .map((x, i) => `<path d="M${x} ${62 - (i === 2 ? 2 : 0)} l6 -${big ? 16 : 10} l6 ${big ? 16 : 10}z" fill="${p.accent}"/>`)
        .join('');
      return `<g class="glow">${spines}</g>`;
    }
    case 'tidefin':
      return `<path d="M150 40 q8 -16 20 -10 q-8 6 -10 16z" fill="${p.accent}"/><path d="M22 96 q-14 -14 -18 -2 q4 12 18 8z" fill="${p.accent}"/><path d="M90 58 q10 -${big ? 18 : 10} 26 -4z" fill="${p.accent}" opacity="0.9"/>`;
    case 'stormcrest':
      return `<path d="M156 40 l4 -${big ? 20 : 12} l4 10 l4 -${big ? 16 : 10} l3 14z" fill="${p.accent}" class="glow"/>`;
    case 'mossclaw':
      return `<g fill="${p.accent}"><ellipse cx="140" cy="62" rx="6" ry="3" transform="rotate(-40 140 62)"/><ellipse cx="132" cy="68" rx="6" ry="3" transform="rotate(-30 132 68)"/><ellipse cx="146" cy="54" rx="${big ? 7 : 5}" ry="3" transform="rotate(-50 146 54)"/></g>`;
    case 'frostspine': {
      const spikes = [72, 86, 100, 114]
        .map((x) => `<path d="M${x} 62 l3 -${big ? 18 : 11} l3 ${big ? 18 : 11}z" fill="${p.accent}"/>`)
        .join('');
      return `<g class="glow">${spikes}<path d="M60 76 l-10 -6 M66 72 l-8 -10" stroke="${p.accent}" stroke-width="2"/></g>`;
    }
    case 'duneskimmer':
      return `<path d="M152 46 Q136 30 120 36 Q136 40 148 52z" fill="${p.accent}"/><path d="M150 50 Q132 46 122 54 Q138 54 148 56z" fill="${p.accent}" opacity="0.8"/><path d="M70 74 Q94 68 118 74" stroke="${p.accent}" stroke-width="3" fill="none" opacity="0.7"/>`;
    case 'shadeglide':
      return `<g fill="${p.accent}"><circle cx="84" cy="30" r="1.8"/><circle cx="98" cy="42" r="1.4"/><circle cx="110" cy="30" r="1.6"/><circle cx="120" cy="50" r="1.2"/><circle cx="76" cy="78" r="1.5"/><circle cx="104" cy="72" r="1.3"/><circle cx="90" cy="84" r="1.1"/></g><circle cx="166" cy="49" r="5" fill="${p.accent}" opacity="0.25"/>`;
  }
}

/**
 * Side-view flying dragon facing right, as an SVG string.
 * The wing sits in its own group so CSS can flap it.
 */
export function dragonSvg(tribe: TribeId, paletteIndex: number, stage: Stage = 'adult', extraClass = '', skin?: 'starfire'): string {
  const p = skin === 'starfire' ? STARFIRE : TRIBES[tribe].palettes[paletteIndex] ?? TRIBES[tribe].palettes[0];
  const horns = stage === 'hatchling' ? '' : `<path d="M158 44 l-12 -${stage === 'adult' ? 16 : 9} l16 8z" fill="${p.belly}"/>`;
  const scale = stage === 'hatchling' ? 0.78 : stage === 'young' ? 0.9 : 1;
  return `<svg class="dragon ${extraClass}" viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g transform="translate(${(200 - 200 * scale) / 2} ${(140 - 140 * scale) / 2}) scale(${scale})">
    <g class="wing wing-back"><path d="M96 66 L70 16 Q92 26 104 22 Q114 30 128 26 L112 70z" fill="${p.wing}" opacity="0.7"/></g>
    <path d="M58 82 Q30 84 18 100 Q10 110 4 104 Q18 106 26 92 Q38 76 60 72z" fill="${p.body}"/>
    <ellipse cx="94" cy="80" rx="44" ry="21" fill="${p.body}"/>
    <ellipse cx="98" cy="88" rx="32" ry="11" fill="${p.belly}"/>
    <path d="M124 74 Q140 60 150 48 L164 56 Q150 72 134 86z" fill="${p.body}"/>
    <path d="M146 44 Q162 34 180 46 Q192 52 186 58 Q172 62 160 64 Q148 60 146 44z" fill="${p.body}"/>
    <path d="M168 58 Q180 58 186 58 Q178 64 166 64z" fill="${p.belly}"/>
    ${horns}
    <circle cx="166" cy="49" r="${stage === 'hatchling' ? 4.5 : 3.6}" fill="#fff"/>
    <circle cx="167.2" cy="49" r="${stage === 'hatchling' ? 2.6 : 2}" fill="#1a1a2e"/>
    <path d="M78 96 l-6 12 l8 -2z M108 96 l-4 13 l8 -3z" fill="${p.wing}"/>
    ${tribeFeature(tribe, p, stage)}
    <g class="wing wing-front"><path d="M92 70 L58 6 Q86 20 100 14 Q112 26 130 18 L118 74z" fill="${p.wing}"/><path d="M92 70 L58 6 M100 14 L104 70 M130 18 L114 72" stroke="${p.accent}" stroke-width="2" opacity="0.6"/></g>
  </g>
</svg>`;
}

/** An egg in the tribe's colors, cracking as warmth fills. */
export function eggSvg(tribe: TribeId, warmth: number, seed = 1): string {
  const p = TRIBES[tribe].palettes[0];
  const rand = seededRandom(seed);
  const spots = Array.from({ length: 7 }, () => {
    const x = 30 + rand() * 40;
    const y = 30 + rand() * 60;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(3 + rand() * 5).toFixed(1)}" ry="${(2 + rand() * 4).toFixed(1)}" fill="${p.accent}" opacity="0.75"/>`;
  }).join('');
  const cracks = [
    warmth >= 0.25 ? '<path d="M50 22 l-4 10 l6 4 l-3 8" />' : '',
    warmth >= 0.5 ? '<path d="M30 60 l8 2 l4 -6 l7 5 l5 -4" />' : '',
    warmth >= 0.75 ? '<path d="M62 74 l6 -6 l4 6 l6 -3 M40 88 l6 -4 l5 4" />' : '',
  ].join('');
  return `<svg class="egg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse cx="50" cy="112" rx="30" ry="5" fill="#000" opacity="0.15"/>
  <path d="M50 6 C78 6 90 52 90 74 C90 98 72 112 50 112 C28 112 10 98 10 74 C10 52 22 6 50 6z" fill="${p.body}"/>
  <path d="M50 6 C78 6 90 52 90 74 C90 98 72 112 50 112 C40 112 32 108 26 102 C58 104 76 80 70 40 C66 20 58 8 50 6z" fill="#000" opacity="0.12"/>
  ${spots}
  <ellipse cx="34" cy="38" rx="6" ry="12" fill="#fff" opacity="0.35" transform="rotate(20 34 38)"/>
  <g fill="none" stroke="#1a1a2e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${cracks}</g>
</svg>`;
}
