import { TRIBES, dragonSvg, eggSvg, stageFor } from '../../game/dragons';
import { achievements, currentTitle } from '../../game/achievements';
import { activeDragon, eggProgress } from '../../game/progress';
import { today } from '../../save/store';
import { breakDue, go, profile } from '../app';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { achievementsPage } from './achievementsPage';
import { aerieScene } from './aerie';
import { codex } from './codex';
import { lessons } from './lessons';
import { nest } from './nest';
import { progressPage } from './progressPage';
import { raceMap } from './race';
import { settings } from './settings';
import { supporter } from './supporter';
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
const BACKUP_REMIND_DAYS = 21;

export const hub = (root: HTMLElement): void => {
  const p = profile();
  const d = activeDragon(p);
  const daily = p.daily.date === today() ? p.daily : { races: 0, lessons: 0 };
  const dailyDone = daily.races >= DAILY_RACES || daily.lessons >= 1;

  const showcase = d
    ? h('div', { class: 'showcase' }, aerieScene(p, svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), 'flap bob', d.skin, d.marking), 'showcase-dragon')), h('p', {}, h('strong', {}, d.name), ` the ${TRIBES[d.tribe].name}`))
    : p.nest
      ? h('div', { class: 'showcase' }, svg(eggSvg(p.nest.tribe, eggProgress(p), p.nest.seed), 'showcase-egg wobble'), h('p', {}, `Your ${TRIBES[p.nest.tribe].name} egg is ${pct(eggProgress(p))} warm. Every correct key helps!`))
      : null;

  const tile = (label: string, sub: string, cls: string, to: () => void): HTMLElement =>
    button(h('span', {}, h('strong', {}, label), h('small', {}, sub)), () => (sfx.click(), to()), `tile ${cls}`);

  const eggReady = p.nest && eggProgress(p) >= 1;
  const backupDue = p.dragons.length > 0 && Date.now() - p.lastBackupAt > BACKUP_REMIND_DAYS * 864e5;

  root.append(
    topBar(),
    h(
      'main',
      { class: 'hub' },
      showcase,
      h(
        'div',
        { class: 'daily' + (dailyDone ? ' done' : '') },
        h('strong', {}, 'Daily flight: '),
        dailyDone ? 'Done for today. Nice flying!' : `Race ${DAILY_RACES} times or finish a lesson (${daily.races}/${DAILY_RACES} races).`,
      ),
      h(
        'div',
        { class: 'tiles' },
        tile('Race', 'Fly against rival dragons', 'tile-race', () => go(raceMap)),
        tile('Lessons', 'Learn new keys', 'tile-lessons', () => go(lessons)),
        tile(eggReady ? 'Nest: egg ready!' : 'Nest', eggReady ? 'Something is hatching…' : 'Eggs, dragons, and your aerie', 'tile-nest' + (eggReady ? ' pulse' : ''), () => go(nest)),
        tile('Codex', 'Every tribe and color', 'tile-codex', () => go(codex)),
      ),
      h(
        'div',
        { class: 'row center' },
        button(`🏅 Achievements ${achievements(p).filter((a) => a.earned).length}/${achievements(p).length}`, () => go(achievementsPage), 'btn ghost small'),
        button('My progress', () => go(progressPage), 'btn ghost small'),
        button('Settings and backup', () => go(settings), 'btn ghost small'),
        p.supporter ? null : button('Support Keyflame', () => go(supporter), 'btn ghost small'),
      ),
      backupDue ? h('p', { class: 'fine' }, 'It has been a while since your last backup. ', button('Make a backup code', () => go(settings), 'link')) : null,
    ),
  );

  if (breakDue()) {
    const modal = h(
      'div',
      { class: 'modal-backdrop' },
      h(
        'div',
        { class: 'modal' },
        d ? svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), 'sleepy', d.skin, d.marking), 'modal-dragon') : null,
        h('h2', {}, 'Time for a stretch?'),
        h('p', {}, 'You have been flying for a while. Your dragon is taking a nap. Rest your eyes and hands, and come back anytime.'),
        button('Okay', () => modal.remove()),
      ),
    );
    root.append(modal);
  }
};
