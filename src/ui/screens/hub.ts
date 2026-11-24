import { TRIBES, dragonSvg, eggSvg, stageFor } from '../../game/dragons';
import { nestStage } from '../eggNest';
import { currentTitle } from '../../game/achievements';
import { activeDragon, eggProgress, kindName, lessonUnlocked } from '../../game/progress';
import { LESSONS } from '../../content/lessons';
import { today, type Profile } from '../../save/store';
import { currentStreak, playedToday } from '../../game/streak';
import { withTabs } from '../tabBar';
import { leaveGrownUps } from './grownUps';
import { breakDue, go, isGuest, profile } from '../app';
import { button, h, pct, svg, tapHand } from '../dom';
import { sfx } from '../sound';
import { aerieScene } from './aerie';
import { lessons, nextChallenge, playChallenge, playLesson } from './lessons';
import { hatchNow, nest } from './nest';
import { eggToBuy } from '../../game/collection';
import { raceMap } from './race';
import { seasonButton } from './seasonPage';
import { wing } from './wing';
import { openRiders } from './riders';
import { riderLabel } from '../../game/wing';

/** Rider rank grows with total practice, so it always moves forward. */
export function riderRank(correctKeys: number): { level: number; progress: number } {
  const level = Math.floor(Math.sqrt(correctKeys / 250)) + 1;
  const lo = (level - 1) ** 2 * 250;
  const hi = level ** 2 * 250;
  return { level, progress: (correctKeys - lo) / (hi - lo) };
}

/** The top bar. The back button names where it goes: Home, Courses, Lessons and so on. */
export function topBar(back?: () => void, to = 'Back'): HTMLElement {
  const p = profile();
  const rank = riderRank(p.totals.correctKeys);
  return h(
    'header',
    { class: 'top-bar' },
    back ? button(`← ${to}`, back, `btn ghost small top-back${to === 'Home' ? ' to-home' : ''}`) : button('Switch rider', () => openRiders(), 'btn ghost small'),
    h('div', { class: 'who' }, h('strong', {}, riderLabel(p)), h('span', { class: 'rider-title' }, currentTitle(p) ?? ''), h('span', { class: 'rank' }, `Rider rank ${rank.level}`), h('span', { class: 'bar' }, h('span', { style: `width:${pct(rank.progress)}` }))),
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

/** The egg sitting in its twig nest, glowing as it warms. */
function eggInNest(egg: NonNullable<Profile['nest']>, prog: number, cls: string): HTMLElement {
  return h(
    'div',
    { class: `egg-nest ${cls}${prog >= 1 ? ' ready' : ''}`, style: `--warm:${prog.toFixed(2)}` },
    nestStage(svg(eggSvg(egg.tribe, prog, egg.seed), 'egg-nest-egg' + (prog >= 1 ? ' wobble' : '')), { seed: egg.seed, warm: prog }),
    prog >= 1 ? tapHand() : null,
  );
}

/** Small static scenes for the Race and Lessons cards. */
const RACE_ART = (): string =>
  `<svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="race-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb35c"/><stop offset="0.55" stop-color="#ff6b5b"/><stop offset="1" stop-color="#8e2f52"/></linearGradient></defs><rect width="200" height="110" fill="url(#race-sky)"/><circle cx="150" cy="40" r="22" fill="#ffe8a3" opacity="0.8"/><path d="M0 80 L30 52 L52 70 L84 40 L118 72 L146 50 L176 68 L200 56 V110 H0z" fill="#6a2c4d"/><path d="M0 96 Q50 78 100 92 T200 86 V110 H0z" fill="#3f1834"/></svg>`;
const LESSON_ART = (): string =>
  `<svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="les-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa9ff"/><stop offset="0.6" stop-color="#4263eb"/><stop offset="1" stop-color="#2b2a7a"/></linearGradient></defs><rect width="200" height="110" fill="url(#les-sky)"/><path d="M0 84 L36 54 L60 72 L96 44 L130 74 L160 56 L200 76 V110 H0z" fill="#33408f"/><path d="M0 98 Q60 84 110 96 T200 92 V110 H0z" fill="#1f2366"/><g fill="none" stroke="#ffd43b" stroke-width="4"><ellipse cx="168" cy="40" rx="12" ry="20" opacity="0.95"/><ellipse cx="138" cy="52" rx="7" ry="12" opacity="0.7"/><ellipse cx="118" cy="60" rx="4" ry="7" opacity="0.5"/></g></svg>`;

export const hub = (root: HTMLElement): (() => void) => {
  leaveGrownUps();
  const p = profile();
  const d = activeDragon(p);
  const daily = p.daily.date === today() ? p.daily : { races: 0, lessons: 0 };
  const dailyDone = daily.races >= DAILY_RACES || daily.lessons >= 1;
  const rank = riderRank(p.totals.correctKeys);
  const streak = currentStreak(p);
  const prog = eggProgress(p);
  const eggReady = !!p.nest && prog >= 1;
  const buyNow = eggToBuy(p);

  const avatarArt = d ? svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), '', d.skin, d.marking, d.stars), 'home-avatar-art') : svg(eggSvg(p.nest?.tribe ?? 'emberback', prog, p.nest?.seed ?? 1), 'home-avatar-art egg');
  const top = h(
    'header',
    { class: 'home-top' },
    button(h('span', { class: 'home-avatar-in' }, avatarArt, h('span', { class: 'avatar-swap', 'aria-hidden': 'true' }, '⇄')), () => (sfx.click(), openRiders(root)), 'home-avatar', { 'aria-label': `${riderLabel(p)}. Who’s playing?`, title: 'Who’s playing?' }),
    h(
      'div',
      { class: 'home-who' },
      h('strong', {}, riderLabel(p)),
      h('span', { class: 'rider-title' }, isGuest() ? 'Guest rider' : currentTitle(p) ?? ''),
      h('span', { class: 'rank' }, `Rider rank ${rank.level}`),
      h('span', { class: 'bar' }, h('span', { style: `width:${pct(rank.progress)}` })),
    ),
    h(
      'div',
      { class: 'streak-pill' + (streak ? '' : ' cold') + (playedToday(p) ? ' lit' : ''), role: 'img', 'aria-label': `${streak} day streak` },
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
      // A ready egg cracks open straight away; otherwise the cave opens the nest.
      button(scene, () => (sfx.click(), eggReady ? hatchNow() : go(nest)), 'hero-open', { 'aria-label': eggReady ? `${heroLabel}. Hatch your egg` : buyNow ? `${heroLabel}. Get an egg` : `${heroLabel}. Open the nest` }),
      // A class or family: the wing page has the badge, its QR code and wing races.
      button(p.classBadge ? `🐉 Wing #${p.classBadge}` : '🐉 Join a wing', () => (sfx.click(), go(wing)), 'hero-chip class-chip'),
      h('span', { class: 'hero-chip embers-chip', 'aria-label': `${p.embers} embers` }, h('span', { 'aria-hidden': 'true' }, '🔥'), h('span', { class: 'ember-count' }, String(p.embers))),
      h('span', { class: 'hero-chip name-chip', 'aria-hidden': 'true' }, d ? d.name : heroLabel),
      // Says out loud that the cave opens the nest. Taps fall through to the cave button.
      h('span', { class: 'hero-chip egg-chip' + (eggReady || buyNow ? ' ready pulse' : ''), 'aria-hidden': 'true' }, eggReady ? '🐣 Tap to hatch!' : p.nest ? `🥚 Nest · ${pct(prog)} ›` : buyNow ? '🥚 Get an egg ›' : '🥚 Nest ›'),
      // A tapping finger until this rider has found the nest once.
      (!p.nestSeen || eggReady || buyNow) ? h('span', { class: 'hero-hand' }, tapHand()) : null,
    ),
  );

  const dots = Array.from({ length: DAILY_RACES }, (_, i) => h('span', { class: 'daily-dot' + (dailyDone || i < daily.races ? ' on' : '') }));
  // Not done yet: the card is a Go button to the next lesson, or a race once every lesson is passed.
  const nextLesson = LESSONS.find((l, i) => lessonUnlocked(p, i) && !p.lessons[l.id]?.stars);
  const challenge = nextLesson ? null : nextChallenge(p);
  const dailyGo = (): void => (sfx.click(), go(nextLesson ? playLesson(nextLesson) : challenge ? playChallenge(challenge) : raceMap));
  const dailyCard = h(
    dailyDone ? 'div' : 'button',
    dailyDone ? { class: 'daily-card done', role: 'status' } : { class: 'daily-card go', type: 'button', onclick: dailyGo, 'aria-label': `Daily flight: ${daily.races} of ${DAILY_RACES} races or 1 ${nextLesson ? 'lesson' : 'word challenge'}. ${nextLesson ? 'Start a lesson' : challenge ? 'Start a word challenge' : 'Choose a race'}` },
    h('span', { class: 'daily-icon', 'aria-hidden': 'true', html: WING }),
    h('span', { class: 'daily-text' }, h('strong', {}, 'Daily flight'), h('small', {}, dailyDone ? 'Done! See you tomorrow' : `${daily.races}/${DAILY_RACES} races or 1 ${nextLesson ? 'lesson' : 'word challenge'}`)),
    h('span', { class: 'daily-track', 'aria-hidden': 'true' }, ...dots),
    dailyDone ? h('span', { class: 'daily-end', 'aria-hidden': 'true' }, '✓') : h('span', { class: 'daily-go', 'aria-hidden': 'true' }, nextLesson ? '▶ Lesson' : challenge ? '▶ Words' : '▶ Race'),
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
