// The end-of-race celebration: a full-screen moment with a place banner, a trophy,
// a WPM dial and reward cards that count up. Everything shown is already earned;
// there is nothing to claim, sign up for, or open.

import { h } from './dom';
import { CONFETTI, attachField, type ParticleField } from './particles';
import { sfx } from './sound';

export interface RewardCard {
  /** Trusted SVG markup from our own art code. */
  art: string;
  title: string;
  /** A number counts up from zero; text shows as is. */
  value: number | string;
  prefix?: string;
  note?: string;
  /** Extra class for colour accents. */
  tone?: 'ember' | 'warm' | 'gold' | 'egg' | 'grow';
}

export interface CelebrationInfo {
  place: number;
  racers: number;
  wpm: number;
  accuracy: number;
  /** Personal best before this race (0 = none yet). */
  prevBest: number;
  newBest: boolean;
  /** Short lines under the banner, such as "You beat Cinderfang!". */
  lines: string[];
  rewards: RewardCard[];
  /** The player's dragon, which swoops across the screen. */
  dragonArt?: string;
  trailColors?: string[];
  /** Anything else to show under the rewards, such as the fun fact card. */
  extra?: HTMLElement | null;
  actions: HTMLElement;
  reducedMotion: boolean;
}

const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

type Tier = 'gold' | 'silver' | 'bronze' | 'star';

function tierFor(place: number): Tier {
  return place === 1 ? 'gold' : place === 2 ? 'silver' : place === 3 ? 'bronze' : 'star';
}

const TIER_COLORS: Record<Tier, [string, string, string]> = {
  gold: ['#fff3bf', '#ffd43b', '#e8590c'],
  silver: ['#ffffff', '#ced4da', '#6c7a89'],
  bronze: ['#ffe8cc', '#e8a161', '#8a4b1c'],
  star: ['#fff3bf', '#b197fc', '#5f3dc4'],
};

let trophyId = 0;

/** A shiny cup for the top three, a star medal for everyone else. */
export function trophySvg(tier: Tier): string {
  const [hi, mid, lo] = TIER_COLORS[tier];
  const id = `tr${++trophyId}`;
  const defs = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${lo}"/><stop offset="0.35" stop-color="${hi}"/><stop offset="0.6" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></linearGradient></defs>`;
  if (tier === 'star') {
    return `<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}
      <path d="M40 4 L60 50 L80 4 Z" fill="#e8364f"/><path d="M48 4 L60 34 L72 4Z" fill="#ff8787"/>
      <circle cx="60" cy="88" r="42" fill="url(#${id})" stroke="${lo}" stroke-width="4"/>
      <path d="M60 60 L68 80 L90 81 L73 94 L79 116 L60 103 L41 116 L47 94 L30 81 L52 80Z" fill="${hi}" stroke="${lo}" stroke-width="2.5" stroke-linejoin="round"/>
      <ellipse cx="44" cy="70" rx="8" ry="14" fill="#fff" opacity="0.35" transform="rotate(30 44 70)"/></svg>`;
  }
  return `<svg viewBox="0 0 140 132" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}
    <path d="M34 22 C4 22 6 66 46 70" fill="none" stroke="url(#${id})" stroke-width="9" stroke-linecap="round"/>
    <path d="M106 22 C136 22 134 66 94 70" fill="none" stroke="url(#${id})" stroke-width="9" stroke-linecap="round"/>
    <path d="M28 12 H112 C112 60 96 84 70 88 C44 84 28 60 28 12Z" fill="url(#${id})" stroke="${lo}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M62 86 H78 L82 108 H58Z" fill="url(#${id})" stroke="${lo}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="40" y="106" width="60" height="12" rx="4" fill="url(#${id})" stroke="${lo}" stroke-width="3"/>
    <rect x="32" y="118" width="76" height="22" rx="6" fill="#3b2a6b" stroke="${lo}" stroke-width="3"/>
    <rect x="50" y="124" width="40" height="10" rx="3" fill="url(#${id})"/>
    <path d="M70 26 L76 40 L92 41 L80 51 L84 66 L70 58 L56 66 L60 51 L48 41 L64 40Z" fill="${hi}" opacity="0.9"/>
    <ellipse cx="44" cy="36" rx="6" ry="18" fill="#fff" opacity="0.45" transform="rotate(-10 44 36)"/></svg>`;
}

/** A flame icon for the ember reward card. */
export function flameSvg(): string {
  return `<svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><radialGradient id="fl${++trophyId}" cx="0.5" cy="0.8" r="0.8"><stop offset="0" stop-color="#fff3bf"/><stop offset="0.35" stop-color="#ffd43b"/><stop offset="0.7" stop-color="#ff922b"/><stop offset="1" stop-color="#e8590c"/></radialGradient></defs>
    <path d="M40 4 C46 22 64 30 64 56 C64 74 52 86 40 86 C28 86 16 74 16 56 C16 42 24 34 28 24 C30 34 34 38 38 38 C36 26 36 14 40 4Z" fill="url(#fl${trophyId})" stroke="#c2410c" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M40 50 C46 58 50 62 50 70 C50 78 46 82 40 82 C34 82 30 78 30 70 C30 64 34 60 36 56 C38 60 40 60 40 50Z" fill="#fff9db"/></svg>`;
}

/** A small crown for beating a course champion. */
export function crownSvg(): string {
  return `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M10 64 L4 18 L30 40 L50 6 L70 40 L96 18 L90 64Z" fill="#ffd43b" stroke="#c2410c" stroke-width="3" stroke-linejoin="round"/>
    <rect x="10" y="62" width="80" height="12" rx="4" fill="#fcc419" stroke="#c2410c" stroke-width="3"/>
    <circle cx="50" cy="42" r="7" fill="#e8364f" stroke="#fff" stroke-width="2"/><circle cx="26" cy="52" r="5" fill="#4dabf7"/><circle cx="74" cy="52" r="5" fill="#69db7c"/>
    <circle cx="4" cy="18" r="4" fill="#fff3bf"/><circle cx="50" cy="6" r="4" fill="#fff3bf"/><circle cx="96" cy="18" r="4" fill="#fff3bf"/></svg>`;
}

/** A speedometer-style dial. Returns the element and a function that sets the value shown. */
function wpmDial(max: number, best: number): { el: HTMLElement; set: (v: number) => void } {
  // A 240-degree arc, open at the bottom.
  const r = 52;
  const cx = 70;
  const cy = 70;
  const start = 150;
  const sweep = 240;
  const pt = (deg: number, rad = r): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const arc = (from: number, to: number): string => {
    const [x1, y1] = pt(from);
    const [x2, y2] = pt(to);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const full = arc(start, start + sweep);
  const length = (Math.PI * 2 * r * sweep) / 360;
  const ticks = Array.from({ length: 9 }, (_, i) => {
    const d = start + (sweep * i) / 8;
    const [x1, y1] = pt(d, r + 9);
    const [x2, y2] = pt(d, r + 14);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join('');
  const bestMark =
    best > 0 && best < max
      ? (() => {
          const d = start + (sweep * best) / max;
          const [x1, y1] = pt(d, r - 10);
          const [x2, y2] = pt(d, r + 10);
          return `<line class="best-mark" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
        })()
      : '';
  const el = h('div', { class: 'cel-dial', role: 'img', 'aria-label': 'Words per minute' });
  el.innerHTML = `<svg viewBox="0 0 140 132" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="dialg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#69db7c"/><stop offset="0.5" stop-color="#ffd43b"/><stop offset="1" stop-color="#ff6b1a"/></linearGradient></defs>
    <g class="ticks" stroke="rgba(255,255,255,0.45)" stroke-width="2.5" stroke-linecap="round">${ticks}</g>
    <path d="${full}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="14" stroke-linecap="round"/>
    <path class="dial-fill" d="${full}" fill="none" stroke="url(#dialg)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${length.toFixed(1)}" stroke-dashoffset="${length.toFixed(1)}"/>
    ${bestMark}
    <g class="needle"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r + 14}" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="6" fill="#fff"/></g>
  </svg><div class="dial-num"><strong>0</strong><span>WPM</span></div>`;
  const fill = el.querySelector('.dial-fill') as SVGPathElement;
  const needle = el.querySelector('.needle') as SVGGElement;
  const num = el.querySelector('.dial-num strong') as HTMLElement;
  const set = (v: number): void => {
    const f = Math.max(0, Math.min(1, v / max));
    fill.setAttribute('stroke-dashoffset', (length * (1 - f)).toFixed(1));
    // The needle starts pointing at the arc's start (150deg) and turns with the value.
    needle.setAttribute('transform', `rotate(${(start + sweep * f + 90 - 360).toFixed(1)} ${cx} ${cy})`);
    num.textContent = String(Math.round(v));
  };
  set(0);
  return { el, set };
}

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Counts a number up over `ms`, calling `show` each frame. */
function countUp(ms: number, to: number, show: (v: number) => void, done?: () => void): () => void {
  let raf = 0;
  const t0 = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - t0) / ms);
    show(to * easeOut(t));
    if (t < 1) raf = requestAnimationFrame(step);
    else done?.();
  };
  raf = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(raf);
    show(to);
    done?.();
  };
}

export function celebration(info: CelebrationInfo): HTMLElement {
  const tier = tierFor(info.place);
  const top3 = info.place <= 3;
  const calm = info.reducedMotion;
  const ord = ORD[info.place - 1] ?? `${info.place}th`;

  const banner = top3
    ? h('div', { class: `cel-banner tier-${tier}` }, h('span', { class: 'cel-ord' }, ord.slice(0, -2), h('sup', {}, ord.slice(-2))), ' Place!')
    : h('div', { class: `cel-banner tier-${tier}` }, 'Great flying!');
  const sub = h('p', { class: 'cel-sub' }, top3 ? `${ord} of ${info.racers} racers` : `You finished ${ord} of ${info.racers}. Keep practicing and you’ll climb!`);

  const max = Math.max(30, Math.ceil(Math.max(info.wpm, info.prevBest) / 10) * 10 + 10);
  const dial = wpmDial(max, info.prevBest);
  const dialWrap = h('div', { class: 'cel-dial-wrap' }, dial.el, h('div', { class: 'cel-acc' }, `${Math.round(info.accuracy * 100)}% accuracy`), info.newBest ? h('div', { class: 'cel-best' }, 'New best!') : null);

  const trophy = h('div', { class: `cel-trophy tier-${tier}` });
  trophy.innerHTML = trophySvg(tier);

  const cards = info.rewards.map((r, i) => {
    const valueEl = h('strong', { class: `cel-value${typeof r.value === 'number' ? '' : ' text'}` }, typeof r.value === 'number' ? `${r.prefix ?? '+'}0` : r.value);
    const card = h(
      'div',
      { class: `cel-reward tone-${r.tone ?? 'ember'}`, style: `--i:${i}` },
      h('div', { class: 'cel-reward-art', html: r.art }),
      valueEl,
      h('span', { class: 'cel-reward-title' }, r.title),
      r.note ? h('small', { class: 'cel-reward-note' }, r.note) : null,
    );
    return { card, valueEl, reward: r };
  });

  const actions = h('div', { class: 'cel-actions' }, info.actions);
  const skipHint = h('p', { class: 'cel-skip fine' }, 'Tap to skip');
  const swoop = info.dragonArt && !calm ? h('div', { class: 'cel-swoop', html: info.dragonArt }) : null;

  const panel = h(
    'div',
    { class: 'cel-panel' },
    banner,
    sub,
    h('div', { class: 'cel-hero' }, trophy, dialWrap),
    ...info.lines.map((l) => h('p', { class: 'cel-line' }, l)),
    cards.length ? h('div', { class: 'cel-rewards' }, ...cards.map((c) => c.card)) : null,
    info.extra ?? null,
    actions,
    skipHint,
  );
  const overlay = h('div', { class: `celebrate tier-${tier}${calm ? ' calm' : ''}`, role: 'dialog', 'aria-label': top3 ? `${ord} place` : 'Race finished' }, h('div', { class: 'cel-rays' }), swoop, panel);

  // Timeline. Every step can be skipped at once by tapping.
  const stops: Array<() => void> = [];
  const timers: number[] = [];
  let finished = false;
  const later = (ms: number, fn: () => void): void => {
    timers.push(window.setTimeout(fn, calm ? 0 : ms));
  };

  let field: ParticleField | null = null;
  const burst = (el: Element, count: number, kind: 'spark' | 'confetti' = 'spark'): void => {
    if (!field) return;
    const a = el.getBoundingClientRect();
    const b = overlay.getBoundingClientRect();
    field.emit(a.left - b.left + a.width / 2, a.top - b.top + a.height / 2, { count, colors: kind === 'confetti' ? CONFETTI : TIER_COLORS[tier], kind, spread: kind === 'confetti' ? 420 : 300, vy: kind === 'confetti' ? -200 : 0, size: kind === 'confetti' ? 5 : 6, life: kind === 'confetti' ? 2.2 : 0.9 });
  };

  const finishAll = (): void => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    stops.splice(0).forEach((s) => s());
    overlay.classList.add('done');
    dial.set(info.wpm);
    for (const c of cards) if (typeof c.reward.value === 'number') c.valueEl.textContent = `${c.reward.prefix ?? '+'}${c.reward.value}`;
  };

  const start = (): void => {
    if (!calm) {
      let swoopT = 0;
      field = attachField(overlay, (f, dt) => {
        // Fire trail behind the swooping dragon.
        if (!swoop || swoopT > 2200) return;
        swoopT += dt;
        const a = swoop.getBoundingClientRect();
        const b = overlay.getBoundingClientRect();
        if (a.right < b.left || a.left > b.right) return;
        f.emit(a.left - b.left + a.width * 0.08, a.top - b.top + a.height * 0.62, { count: 3, colors: info.trailColors ?? TIER_COLORS.gold, kind: 'ember', vx: -160, spread: 60, size: 9, life: 0.8 });
      });
    }
    if (info.place === 1) sfx.fanfare();
    else if (top3) sfx.win();
    else sfx.cheer();

    later(250, () => {
      burst(banner, top3 ? 50 : 20);
      if (info.place === 1) for (let i = 0; i < 5; i++) field?.emit(((i + 0.5) / 5) * overlay.clientWidth, -10, { count: 22, colors: CONFETTI, kind: 'confetti', vy: 60, spread: 260, size: 6, life: 3 });
    });
    later(600, () => {
      burst(trophy, 30);
      stops.push(countUp(calm ? 1 : 1300, info.wpm, (v) => dial.set(v), () => info.newBest && !calm && burst(dialWrap, 40)));
    });
    cards.forEach((c, i) => {
      later(1100 + i * 380, () => {
        c.card.classList.add('in');
        sfx.coin();
        burst(c.card, 16);
        if (typeof c.reward.value === 'number') {
          const to = c.reward.value;
          stops.push(countUp(calm ? 1 : 700, to, (v) => (c.valueEl.textContent = `${c.reward.prefix ?? '+'}${Math.round(v)}`)));
        }
      });
    });
    later(1300 + cards.length * 380, () => {
      finishAll();
    });
  };

  overlay.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button, a, select')) return;
    finishAll();
  });
  requestAnimationFrame(start);
  return overlay;
}
