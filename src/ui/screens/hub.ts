import { classRaceEntry } from './classroom';
import { TRIBES, dragonSvg, eggSvg, stageFor } from '../../game/dragons';
import { currentTitle } from '../../game/achievements';
import { activeDragon, eggProgress, kindName } from '../../game/progress';
import { today, type Profile } from '../../save/store';
import { currentStreak, playedToday } from '../../game/streak';
import { withTabs } from '../tabBar';
import { breakDue, go, profile } from '../app';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { aerieScene } from './aerie';
import { lessons } from './lessons';
import { nest } from './nest';
import { raceMap } from './race';
import { seasonButton } from './seasonPage';
import { title } from './title';

/** Rider rank grows with total practice, so it always moves forward. */
export function riderRank(correctKeys: number): { level: number; progress: number } {
  const level = Math.floor(Math.sqrt(correctKeys / 250)) + 1;
  const lo = (level - 1) ** 2 * 250;
  const hi = level ** 2 * 250;
  return { level, progress: (correctKeys - lo) / (hi - lo) };
}

export function topBar(back?: () => void): HTMLElement {
  const p = profile();
  const rank = riderRank(p.totals.correctKeys);
  return h(
    'header',
    { class: 'top-bar' },
    back ? button('← Back', back, 'btn ghost small') : button('Switch rider', () => go(title), 'btn ghost small'),
    h('div', { class: 'who' }, h('strong', {}, p.name), h('span', { class: 'rider-title' }, currentTitle(p) ?? ''), h('span', { class: 'rank' }, `Rider rank ${rank.level}`), h('span', { class: 'bar' }, h('span', { style: `width:${pct(rank.progress)}` }))),
    h('div', { class: 'embers', title: 'Embers' }, h('span', { class: 'ember-icon' }, '🔥'), h('span', { class: 'ember-count' }, String(p.embers))),
  );
}

/** Updates the ember count in the top bar after a reward. */
export function refreshEmbers(): void {
  const el = document.querySelector('.ember-count');
  if (el) el.textContent = String(profile().embers);
}

const DAILY_RACES = 3;
const WING = '<svg viewBox="0 0 32 32"><path d="M4 26c2-9 8-16 18-20 3-1 6 0 6 2-5 1-9 4-11 7 4-1 8 0 10 2-4 0-8 1-10 3 3 0 6 1 7 3-6 0-11 1-15 4-2 1-4 1-5-1z" fill="#ffd8a8"/><path d="M8 24c3-6 8-11 15-14" stroke="#e8590c" stroke-width="1.4" fill="none" opacity="0.6"/></svg>';

const NEST_SVG =
  '<svg viewBox="0 0 120 52" aria-hidden="true"><ellipse cx="60" cy="34" rx="57" ry="17" fill="#4a2e16"/><ellipse cx="60" cy="27" rx="47" ry="11" fill="#24150a"/>' +
  '<g fill="none" stroke-linecap="round" stroke-width="3.2"><path d="M6 31 Q40 50 114 30" stroke="#8d5b3a"/><path d="M9 38 Q60 54 110 36" stroke="#a87445"/><path d="M14 26 Q34 42 70 44" stroke="#6b4425"/><path d="M48 46 Q86 44 112 26" stroke="#6b4425"/><path d="M4 33 Q30 22 52 24" stroke="#a87445" stroke-width="2.4"/><path d="M70 23 Q98 21 116 32" stroke="#8d5b3a" stroke-width="2.4"/></g>' +
  '<g fill="#69db7c"><ellipse cx="16" cy="40" rx="6" ry="3" transform="rotate(-25 16 40)"/><ellipse cx="104" cy="41" rx="6" ry="3" transform="rotate(20 104 41)"/><ellipse cx="62" cy="49" rx="5" ry="2.5"/></g><g fill="#b197fc"><circle cx="22" cy="44" r="2.4"/><circle cx="98" cy="45" r="2.4"/></g></svg>';

/** The egg sitting in its twig nest, glowing as it warms. */
function eggInNest(egg: NonNullable<Profile['nest']>, prog: number, cls: string): HTMLElement {
  return h(
    'div',
    { class: `egg-nest ${cls}${prog >= 1 ? ' ready' : ''}`, style: `--warm:${prog.toFixed(2)}` },
    h('div', { class: 'egg-glow', 'aria-hidden': 'true' }),
    svg(eggSvg(egg.tribe, prog, egg.seed), 'egg-nest-egg' + (prog >= 1 ? ' wobble' : '')),
    svg(NEST_SVG, 'egg-nest-twigs'),
  );
}

/** Small static scenes for the Race and Lessons cards. */
const RACE_ART = (): string =>
  `<svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="race-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb35c"/><stop offset="0.55" stop-color="#ff6b5b"/><stop offset="1" stop-color="#8e2f52"/></linearGradient></defs><rect width="200" height="110" fill="url(#race-sky)"/><circle cx="150" cy="40" r="22" fill="#ffe8a3" opacity="0.8"/><path d="M0 80 L30 52 L52 70 L84 40 L118 72 L146 50 L176 68 L200 56 V110 H0z" fill="#6a2c4d"/><path d="M0 96 Q50 78 100 92 T200 86 V110 H0z" fill="#3f1834"/></svg>`;
const LESSON_ART = (): string =>
  `<svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="les-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa9ff"/><stop offset="0.6" stop-color="#4263eb"/><stop offset="1" stop-color="#2b2a7a"/></linearGradient></defs><rect width="200" height="110" fill="url(#les-sky)"/><path d="M0 84 L36 54 L60 72 L96 44 L130 74 L160 56 L200 76 V110 H0z" fill="#33408f"/><path d="M0 98 Q60 84 110 96 T200 92 V110 H0z" fill="#1f2366"/><g fill="none" stroke="#ffd43b" stroke-width="4"><ellipse cx="168" cy="40" rx="12" ry="20" opacity="0.95"/><ellipse cx="138" cy="52" rx="7" ry="12" opacity="0.7"/><ellipse cx="118" cy="60" rx="4" ry="7" opacity="0.5"/></g></svg>`;

export const hub = (root: HTMLElement): (() => void) => {
  const p = profile();
  const d = activeDragon(p);
  const daily = p.daily.date === today() ? p.daily : { races: 0, lessons: 0 };
  const dailyDone = daily.races >= DAILY_RACES || daily.lessons >= 1;
  const rank = riderRank(p.totals.correctKeys);
  const streak = currentStreak(p);
  const prog = eggProgress(p);
  const eggReady = !!p.nest && prog >= 1;

  const avatarArt = d ? svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), '', d.skin, d.marking, d.stars), 'home-avatar-art') : svg(eggSvg(p.nest?.tribe ?? 'emberback', prog, p.nest?.seed ?? 1), 'home-avatar-art egg');
  const top = h(
    'header',
    { class: 'home-top' },
    button(avatarArt, () => (sfx.click(), go(title)), 'home-avatar', { 'aria-label': `${p.name}. Switch rider`, title: 'Switch rider' }),
    h(
      'div',
      { class: 'home-who' },
      h('strong', {}, p.name),
      h('span', { class: 'rider-title' }, currentTitle(p) ?? ''),
      h('span', { class: 'rank' }, `Rider rank ${rank.level}`),
      h('span', { class: 'bar' }, h('span', { style: `width:${pct(rank.progress)}` })),
    ),
    h(
      'div',
      { class: 'streak-pill' + (streak ? '' : ' cold') + (playedToday(p) ? ' lit' : ''), 'aria-label': `${streak} day streak` },
      h('span', { class: 'streak-flame', 'aria-hidden': 'true' }, '🔥'),
      h('span', { class: 'streak-in', 'aria-hidden': 'true' }, h('strong', {}, String(streak)), h('small', {}, 'day streak')),
    ),
  );

  // The hero: your dragon in its cave and your egg in its nest. Tapping it opens the nest.
  const eggEl = p.nest ? eggInNest(p.nest, prog, d ? 'beside' : 'alone') : null;
  const scene = aerieScene(p, d ? svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), 'flap bob', d.skin, d.marking, d.stars), 'showcase-dragon') : eggEl ?? h('div'));
  if (d && eggEl) scene.append(eggEl);
  const heroLabel = d ? `${d.name} the ${kindName(d)}` : p.nest ? `${TRIBES[p.nest.tribe].name} egg` : 'Your nest';
  const hero = h(
    'div',
    { class: 'home-hero' },
    h(
      'div',
      { class: 'hero-frame' + (d ? '' : ' egg-only') },
      button(scene, () => (sfx.click(), go(nest)), 'hero-open', { 'aria-label': `${heroLabel}. Open the nest` }),
      // Kids in a class go straight to it; everyone else can join one here.
      button(p.classBadge ? `🏫 Class #${p.classBadge}` : '🏫 Join class', () => (sfx.click(), go(classRaceEntry())), 'hero-chip class-chip'),
      h('span', { class: 'hero-chip embers-chip', 'aria-label': `${p.embers} embers` }, h('span', { 'aria-hidden': 'true' }, '🔥'), h('span', { class: 'ember-count' }, String(p.embers))),
      h('span', { class: 'hero-chip name-chip', 'aria-hidden': 'true' }, d ? d.name : heroLabel),
      p.nest ? h('span', { class: 'hero-chip egg-chip' + (eggReady ? ' ready pulse' : ''), 'aria-hidden': 'true' }, eggReady ? 'Tap to hatch!' : `Egg ${pct(prog)}`) : null,
    ),
  );

  const dots = Array.from({ length: DAILY_RACES }, (_, i) => h('span', { class: 'daily-dot' + (dailyDone || i < daily.races ? ' on' : '') }));
  const dailyCard = h(
    'div',
    { class: 'daily-card' + (dailyDone ? ' done' : ''), role: 'status' },
    h('span', { class: 'daily-icon', 'aria-hidden': 'true', html: WING }),
    h('span', { class: 'daily-text' }, h('strong', {}, 'Daily flight'), h('small', {}, dailyDone ? 'Done! See you tomorrow' : `${daily.races}/${DAILY_RACES} races or 1 lesson`)),
    h('span', { class: 'daily-track', 'aria-hidden': 'true' }, ...dots),
    h('span', { class: 'daily-end', 'aria-hidden': 'true' }, dailyDone ? '✓' : '★'),
  );

  const card = (label: string, sub: string, cls: string, art: string, dragon: string, to: () => void): HTMLElement =>
    button(
      h('span', { class: 'play-card-in' }, svg(art, 'play-card-bg'), svg(dragon, 'play-card-dragon'), h('span', { class: 'play-card-text' }, h('strong', {}, label), h('small', {}, sub)), h('span', { class: 'play-card-go', 'aria-hidden': 'true' }, '›')),
      () => (sfx.click(), to()),
      `play-card ${cls}`,
    );

  document.body.classList.add('hub-fit');
  root.append(
    top,
    h(
      'main',
      { class: 'hub home' },
      h('h1', { class: 'home-logo' }, 'Keyflame'),
      seasonButton(),
      hero,
      dailyCard,
      h(
        'div',
        { class: 'play-cards' },
        card('Race', 'Beat rival dragons', 'tile-race', RACE_ART(), dragonSvg('emberback', 0, 'adult', ''), () => go(raceMap)),
        card('Lessons', 'Learn new keys', 'tile-lessons', LESSON_ART(), dragonSvg('frostspine', 0, 'adult', ''), () => go(lessons)),
      ),
    ),
  );
  const stopTabs = withTabs(root, 'home');

  if (breakDue()) {
    const modal = h(
      'div',
      { class: 'modal-backdrop' },
      h(
        'div',
        { class: 'modal' },
        d ? svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), 'sleepy', d.skin, d.marking, d.stars), 'modal-dragon') : null,
        h('h2', {}, 'Time for a stretch?'),
        h('p', {}, 'You have been flying for a while. Your dragon is taking a nap. Rest your eyes and hands, and come back anytime.'),
        button('Okay', () => modal.remove()),
      ),
    );
    root.append(modal);
  }
  return () => {
    stopTabs();
    document.body.classList.remove('hub-fit');
  };
};
