// The aerie: a home cave decorated with items bought with embers.

import type { Profile } from '../../save/store';
import { h } from '../dom';
import { activeDragon } from '../../game/progress';
import { TRAIL_COLORS, attachField } from '../particles';

export interface Decor {
  id: string;
  name: string;
  cost: number;
  /** Markup inside the 400 x 240 aerie scene. */
  art: string;
  /** The part of the scene the shop card shows as its picture. */
  thumb: string;
}

export const DECOR: Decor[] = [
  {
    id: 'moss',
    thumb: '44 198 312 42',
    name: 'Moss rug',
    cost: 40,
    art: '<ellipse cx="200" cy="222" rx="150" ry="16" fill="#2f9e44"/><ellipse cx="200" cy="219" rx="120" ry="10" fill="#51cf66"/>',
  },
  {
    id: 'torches',
    thumb: '22 76 40 78',
    name: 'Wall torches',
    cost: 60,
    art: '<g><rect x="38" y="110" width="8" height="40" rx="3" fill="#8d5b3a"/><path d="M42 82 q14 16 0 30 q-14 -14 0 -30z" fill="#ff922b" class="flicker"/><path d="M42 94 q6 8 0 16 q-6 -8 0 -16z" fill="#ffd43b"/><rect x="354" y="110" width="8" height="40" rx="3" fill="#8d5b3a"/><path d="M358 82 q14 16 0 30 q-14 -14 0 -30z" fill="#ff922b" class="flicker"/><path d="M358 94 q6 8 0 16 q-6 -8 0 -16z" fill="#ffd43b"/></g>',
  },
  {
    id: 'crystals',
    thumb: '54 160 64 72',
    name: 'Glow crystals',
    cost: 80,
    art: '<g opacity="0.95"><path d="M60 228 l10 -46 l10 46z" fill="#74c0fc"/><path d="M76 228 l12 -62 l12 62z" fill="#a5d8ff"/><path d="M96 228 l8 -34 l8 34z" fill="#4dabf7"/></g>',
  },
  {
    id: 'banner',
    thumb: '174 12 52 68',
    name: 'Rider banner',
    cost: 100,
    art: '<g><rect x="180" y="18" width="40" height="4" fill="#ffd43b"/><path d="M184 22 h32 v52 l-16 -12 l-16 12z" fill="#e8364f"/><path d="M200 34 l6 10 l-6 10 l-6 -10z" fill="#ffd43b"/></g>',
  },
  {
    id: 'lanterns',
    thumb: '34 34 332 48',
    name: 'String lanterns',
    cost: 120,
    art: '<path d="M40 40 Q200 90 360 40" stroke="#c3b8e8" stroke-width="2" fill="none"/><g><circle cx="90" cy="58" r="7" fill="#ffe066"/><circle cx="145" cy="68" r="7" fill="#ff8787"/><circle cx="200" cy="72" r="7" fill="#8ce99a"/><circle cx="255" cy="68" r="7" fill="#74c0fc"/><circle cx="310" cy="58" r="7" fill="#e599f7"/></g>',
  },
  {
    id: 'treasure',
    thumb: '270 182 100 56',
    name: 'Treasure pile',
    cost: 180,
    art: '<g><ellipse cx="320" cy="222" rx="44" ry="14" fill="#f59f00"/><circle cx="300" cy="212" r="8" fill="#ffd43b"/><circle cx="318" cy="206" r="8" fill="#fcc419"/><circle cx="336" cy="212" r="8" fill="#ffd43b"/><circle cx="326" cy="198" r="7" fill="#fff3bf"/><path d="M344 196 l8 -8 l8 8 l-8 8z" fill="#e64980"/></g>',
  },
  {
    id: 'stars',
    thumb: '60 10 280 66',
    name: 'Starry ceiling',
    cost: 250,
    art: '<g fill="#fff"><circle cx="70" cy="30" r="2"/><circle cx="120" cy="18" r="1.5"/><circle cx="160" cy="40" r="2"/><circle cx="240" cy="22" r="1.5"/><circle cx="280" cy="44" r="2"/><circle cx="330" cy="26" r="1.5"/><circle cx="100" cy="60" r="1.2"/><circle cx="300" cy="70" r="1.2"/></g>',
  },
];

const CAVE = '<path d="M0 240 V60 Q0 0 80 0 H320 Q400 0 400 60 V240z" fill="#2a2150"/><path d="M20 240 V80 Q20 24 96 24 H304 Q380 24 380 80 V240z" fill="#352a66"/><rect x="0" y="228" width="400" height="12" fill="#1f1842"/>';

/** The aerie scene with owned decorations and a dragon in the middle. */
export function aerieScene(p: Profile, dragon: HTMLElement): HTMLElement {
  const owned = DECOR.filter((d) => p.decor.includes(d.id));
  const back = h('div', { class: 'aerie-back' });
  back.innerHTML = `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${CAVE}${owned.map((d) => d.art).join('')}</svg>`;
  const scene = h('div', { class: 'aerie' }, back, h('div', { class: 'aerie-dragon' }, dragon));
  // Soft sparkles drifting up through the cave, in the active dragon's colors.
  const d = activeDragon(p);
  const colors = d ? TRAIL_COLORS[d.tribe] : TRAIL_COLORS.emberback;
  let debt = 0;
  attachField(scene, (f, dt) => {
    debt += dt / 170;
    if (debt < 1) return;
    debt -= 1;
    const { w, h: ht } = f.size;
    f.emit(Math.random() * w, ht * (0.55 + Math.random() * 0.4), { colors, kind: 'ember', vy: -22, spread: 16, size: 4.5, life: 3.4 });
  });
  return scene;
}

/** A small picture of one decoration for its shop card. */
export function decorThumb(d: Decor): string {
  return `<svg viewBox="${d.thumb}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${d.art}</svg>`;
}

export function buyDecor(p: Profile, id: string): boolean {
  const d = DECOR.find((x) => x.id === id);
  if (!d || p.decor.includes(id) || p.embers < d.cost) return false;
  p.embers -= d.cost;
  p.decor.push(id);
  return true;
}
