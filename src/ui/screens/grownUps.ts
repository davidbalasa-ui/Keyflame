// The Grown-ups tab: everything for adults in one place, behind the grown-up question.
// Classroom (teachers), Family (each rider on this device), Ideas, the supporter pack
// and privacy.

import { dragonSvg, eggSvg, stageFor } from '../../game/dragons';
import { activeDragon } from '../../game/progress';
import { lastPlayed, lastPlayedText, lessonsPassed, personalBests, recentAccuracy, recentSessions } from '../../game/riderStats';
import { weakKeys } from '../../engine/typing';
import type { Profile } from '../../save/store';
import { go, profile, saveData } from '../app';
import { lineChart } from '../charts';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { withTabs } from '../tabBar';
import { openTeacherFrom } from './classroom';
import { feedbackPage } from './feedbackPage';
import { hub, topBar } from './hub';
import { progressCharts } from './progressPage';
import { parentGate, supporter } from './supporter';

/**
 * One pass of the grown-up question lasts while a grown-up moves around these screens.
 * It ends on going back to the kid screens, so a handed-back device asks again.
 */
const GATE_MS = 10 * 60000;
let gateUntil = 0;

export function leaveGrownUps(): void {
  gateUntil = 0;
}

export function openGrownUps(): void {
  if (Date.now() < gateUntil) {
    go(grownUps);
    return;
  }
  document.getElementById('app')!.append(
    parentGate(() => {
      gateUntil = Date.now() + GATE_MS;
      go(grownUps);
    }),
  );
}

const GLYPH = {
  classroom: '<svg viewBox="0 0 32 32"><path d="M4 12 16 5l12 7-12 7z" fill="#b197fc"/><path d="M9 15v6c0 2 3 4 7 4s7-2 7-4v-6l-7 4z" fill="#845ef7"/><path d="M26 12v8" stroke="#ffd43b" stroke-width="2"/><circle cx="26" cy="21" r="1.8" fill="#ffd43b"/></svg>',
  family: '<svg viewBox="0 0 32 32"><path d="M5 15 16 6l11 9v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" fill="#ffa94d"/><path d="M3 16 16 5l13 11" stroke="#e8590c" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="12.5" cy="17" r="2.5" fill="#fff4e6"/><circle cx="19.5" cy="18" r="2" fill="#fff4e6"/><path d="M8.5 27c0-3 1.8-5.5 4-5.5s4 2.5 4 5.5zM16 27c0-2.4 1.6-4.4 3.5-4.4S23 24.6 23 27z" fill="#fff4e6"/></svg>',
  ideas: '<svg viewBox="0 0 32 32"><path d="M5 7h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H14l-6 5v-5H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" fill="#74c0fc"/><circle cx="11" cy="15" r="2" fill="#1b1536"/><circle cx="16" cy="15" r="2" fill="#1b1536"/><circle cx="21" cy="15" r="2" fill="#1b1536"/></svg>',
  support: '<svg viewBox="0 0 32 32"><path d="M16 27S4 19.5 4 11.5A6 6 0 0 1 16 9a6 6 0 0 1 12 2.5C28 19.5 16 27 16 27z" fill="#f783ac"/><path d="m22 5 1 2.2 2.4.3-1.8 1.6.5 2.4-2.1-1.2-2.1 1.2.5-2.4-1.8-1.6 2.4-.3z" fill="#ffd43b"/></svg>',
  privacy: '<svg viewBox="0 0 32 32"><path d="M16 3 27 7v8c0 7-5 12-11 14C10 27 5 22 5 15V7z" fill="#5ee6a8"/><rect x="11" y="14" width="10" height="8" rx="1.5" fill="#1b1536"/><path d="M13 14v-2a3 3 0 0 1 6 0v2" stroke="#1b1536" stroke-width="2" fill="none"/></svg>',
};

const card = (glyph: string, label: string, sub: string, onClick: () => void, cls = ''): HTMLElement =>
  button(
    h('span', { class: 'gu-card-in' }, h('span', { class: 'gu-glyph', 'aria-hidden': 'true', html: glyph }), h('span', { class: 'gu-text' }, h('strong', {}, label), h('small', {}, sub)), h('span', { class: 'play-card-go', 'aria-hidden': 'true' }, '›')),
    () => (sfx.click(), onClick()),
    `gu-card ${cls}`,
  );

export const grownUps = (root: HTMLElement): (() => void) => {
  const p = profile();
  const riders = saveData().profiles.length;
  root.append(
    topBar(() => go(hub)),
    h(
      'main',
      { class: 'grownups' },
      h('h1', {}, 'Grown-ups'),
      h(
        'div',
        { class: 'gu-grid' },
        card(GLYPH.family, 'Family', riders === 1 ? '1 rider on this device' : `${riders} riders on this device`, () => go(family), 'gu-family'),
        card(GLYPH.classroom, 'Classroom', 'For teachers', () => openTeacherFrom(grownUps), 'gu-classroom'),
        card(GLYPH.ideas, 'Ideas', 'Send a bug or idea', () => go(feedbackPage('grownups', grownUps)), 'gu-ideas'),
        card(GLYPH.support, p.supporter ? 'Supporter pack' : 'Support Keyflame', p.supporter ? 'Thank you!' : 'Optional, one time', () => go(supporter), 'gu-support'),
        card(GLYPH.privacy, 'Privacy', 'No ads, no tracking', () => window.open('./privacy.html', '_blank', 'noopener'), 'gu-privacy'),
      ),
      h(
        'ul',
        { class: 'gu-facts' },
        h('li', {}, 'Progress stays on this device.'),
        h('li', {}, 'No names, emails or accounts.'),
        h('li', {}, 'Names come from preset words.'),
      ),
    ),
  );
  return withTabs(root, 'grownups');
};

function avatar(p: Profile): HTMLElement {
  const d = activeDragon(p);
  if (d) return svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), '', d.skin, d.marking, d.stars), 'fam-avatar');
  return svg(eggSvg(p.nest?.tribe ?? 'emberback', 0, p.nest?.seed ?? 1), 'fam-avatar egg');
}

const famStat = (value: string, label: string): HTMLElement => h('div', { class: 'fam-stat' }, h('strong', {}, value), h('small', {}, label));

function riderCard(p: Profile, open: boolean, toggle: () => void): HTMLElement {
  const best = personalBests(p);
  const acc = recentAccuracy(p);
  const les = lessonsPassed(p);
  const recent = recentSessions(p, 12);
  const weak = weakKeys(p.keyStats, 'abcdefghijklmnopqrstuvwxyz;,./'.split(''));
  return h(
    'section',
    { class: 'fam-card' + (open ? ' open' : '') },
    button(
      h(
        'span',
        { class: 'fam-head' },
        avatar(p),
        h('span', { class: 'fam-name' }, h('strong', {}, p.name), h('small', {}, `Last played: ${lastPlayedText(lastPlayed(p))}`)),
        p.classBadge ? h('span', { class: 'fam-class' }, `Class #${p.classBadge}`) : null,
        h('span', { class: 'fam-more', 'aria-hidden': 'true' }, open ? '▴' : '▾'),
      ),
      toggle,
      'fam-toggle',
      { 'aria-expanded': open ? 'true' : 'false' },
    ),
    h(
      'div',
      { class: 'fam-stats' },
      famStat(String(Math.max(best.keyboardWpm, best.touchWpm)), 'Top WPM'),
      famStat(acc === null ? '–' : pct(acc), 'Accuracy'),
      famStat(`${les.passed}/${les.total}`, 'Lessons'),
      famStat(String(best.streak), 'Day streak'),
      famStat(String(Math.round(p.totals.minutes)), 'Minutes'),
    ),
    !open && recent.length >= 2 ? lineChart(recent.map((r) => r.wpm), { label: `${p.name}: recent speed`, unit: ' WPM', compact: true }) : null,
    open ? h('div', { class: 'fam-detail' }, ...progressCharts(p), weak.length ? h('p', { class: 'tricky' }, 'Tricky keys: ', ...weak.map((k) => h('kbd', {}, k.toUpperCase()))) : null) : null,
  );
}

/** Family: each rider on this device, side by side. Nothing leaves the device. */
export const family = (root: HTMLElement): (() => void) => {
  const save = saveData();
  let openId: string | null = save.profiles.length === 1 ? save.profiles[0].id : null;
  const list = h('div', { class: 'fam-list' });
  const render = (): void => {
    list.replaceChildren(
      ...save.profiles.map((p) =>
        riderCard(p, openId === p.id, () => {
          sfx.click();
          openId = openId === p.id ? null : p.id;
          render();
        }),
      ),
    );
  };
  render();
  root.append(topBar(() => go(grownUps)), h('main', { class: 'family' }, h('h1', {}, 'Family'), list, h('p', { class: 'fine fam-note' }, 'Saved on this device only. Use a backup code in Settings to move a rider.')));
  return withTabs(root, 'grownups');
};
