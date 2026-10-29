// The bottom tab bar: Home, Progress, the big dragon button (Nest and Codex), Grown-ups
// and Settings. It sits at the foot of the hub and of the screens it opens.

import { achievements } from '../game/achievements';
import { eggProgress } from '../game/progress';
import { go, profile } from './app';
import { leaveGrownUps, openGrownUps } from './screens/grownUps';
import { hub } from './screens/hub';
import { nest } from './screens/nest';
import { codex } from './screens/codex';
import { progressPage } from './screens/progressPage';
import { settings } from './screens/settings';
import { button, h } from './dom';
import { sfx } from './sound';

export type Tab = 'home' | 'progress' | 'dragons' | 'grownups' | 'settings';

const BACKUP_REMIND_DAYS = 21;

const ICON: Record<Exclude<Tab, 'dragons'>, string> = {
  home: '<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z"/>',
  progress: '<rect x="4" y="12" width="4" height="8" rx="1.2"/><rect x="10" y="7" width="4" height="13" rx="1.2"/><rect x="16" y="3.5" width="4" height="16.5" rx="1.2"/>',
  grownups: '<circle cx="8.5" cy="7" r="3"/><circle cx="16.5" cy="8.5" r="2.4"/><path d="M2.5 19.5c0-3.6 2.7-6.2 6-6.2s6 2.6 6 6.2z"/><path d="M15.2 19.5c0-2.2-.6-4-1.8-5.3a5 5 0 0 1 3.1-1c2.8 0 5 2.2 5 5.2v1.1z"/>',
  settings:
    '<path fill-rule="evenodd" d="M10.3 2.5h3.4l.5 2.6a7.6 7.6 0 0 1 1.9 1.1l2.5-.9 1.7 2.9-2 1.7a7.7 7.7 0 0 1 0 2.2l2 1.7-1.7 2.9-2.5-.9a7.6 7.6 0 0 1-1.9 1.1l-.5 2.6h-3.4l-.5-2.6a7.6 7.6 0 0 1-1.9-1.1l-2.5.9-1.7-2.9 2-1.7a7.7 7.7 0 0 1 0-2.2l-2-1.7 1.7-2.9 2.5.9a7.6 7.6 0 0 1 1.9-1.1zM12 15.3a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6z"/>',
};

/** A gold dragon emblem for the middle button: head, horns, wing. */
export const DRAGON_EMBLEM =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="emb-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3bf"/><stop offset="0.55" stop-color="#ffd43b"/><stop offset="1" stop-color="#f08c00"/></linearGradient></defs>' +
  '<path fill="url(#emb-g)" d="M18 60 C15 50 15 42 20 36 L10 33 L21 30 L13 24 L25 24 C22 17 17 11 9 7 C19 8 27 12 32 15 C35 12 39 10 44 11 C41 12 39 13 38 14 C44 14 48 16 51 20 L58 23 C61 25 60 29 56 30 L47 31 L55 37 C51 41 46 42 40 41 C36 46 34 52 35 60 Z"/>' +
  '<circle cx="55" cy="24.5" r="1.1" fill="#7a3d00"/><path d="M44 21 l6 -1" stroke="#7a3d00" stroke-width="1.6" stroke-linecap="round"/><circle cx="39" cy="22" r="2.4" fill="#3b1f00"/><circle cx="39.7" cy="21.3" r="0.8" fill="#fff"/>' +
  '<path d="M24 40 q5 2 8 7 M22 47 q5 2 8 7" stroke="#c76b00" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';

const icon = (path: string): HTMLElement => {
  const el = h('span', { class: 'tab-icon', 'aria-hidden': 'true' });
  el.innerHTML = `<svg viewBox="0 0 24 24">${path}</svg>`;
  return el;
};

export function tabBar(active: Tab | null): HTMLElement {
  const p = profile();
  const all = achievements(p);
  const unseen = p.achievements ? all.filter((a) => a.earned && !p.achievements!.includes(a.id)).length : 0;
  const backupDue = p.dragons.length > 0 && Date.now() - p.lastBackupAt > BACKUP_REMIND_DAYS * 864e5;
  const eggReady = !!p.nest && eggProgress(p) >= 1;
  const open = (tab: Tab): void => {
    sfx.click();
    if (tab === 'grownups') return openGrownUps();
    // Leaving for a kid screen ends the grown-up pass.
    leaveGrownUps();
    go({ home: hub, progress: progressPage, dragons: nest, settings }[tab]);
  };
  const tab = (id: Exclude<Tab, 'dragons'>, label: string, badge = ''): HTMLElement =>
    button(
      h('span', { class: 'tab-in' }, icon(ICON[id]), badge ? h('span', { class: 'tab-badge' }, badge) : null, h('small', {}, label)),
      () => open(id),
      `tab tab-${id}${active === id ? ' on' : ''}`,
      { 'aria-label': badge ? `${label} (${badge === '!' ? 'time for a backup' : `${badge} new`})` : label, 'aria-current': active === id ? 'page' : undefined },
    );
  const dragon = button(
    h('span', { class: 'tab-dragon-in', html: DRAGON_EMBLEM }),
    () => open('dragons'),
    `tab-dragon${active === 'dragons' ? ' on' : ''}${eggReady ? ' ready' : ''}`,
    { 'aria-label': eggReady ? 'Nest and Codex: your egg is ready' : 'Nest and Codex', 'aria-current': active === 'dragons' ? 'page' : undefined },
  );
  if (eggReady) dragon.append(h('span', { class: 'tab-badge', 'aria-hidden': 'true' }, '!'));
  return h(
    'nav',
    { class: 'tab-bar', 'aria-label': 'Main' },
    h('div', { class: 'tab-bar-in' }, tab('home', 'Home'), tab('progress', 'Progress', unseen ? String(unseen) : ''), dragon, tab('grownups', 'Grown-ups'), tab('settings', 'Settings', backupDue ? '!' : '')),
  );
}

/** Adds the tab bar under a screen and leaves room for it. Returns the cleanup. */
export function withTabs(root: HTMLElement, active: Tab | null): () => void {
  root.append(tabBar(active));
  document.body.classList.add('has-tabs');
  return () => document.body.classList.remove('has-tabs');
}

/** Nest and Codex live behind the big dragon button, as two tabs of one screen. */
export function dragonTabs(active: 'nest' | 'codex', eggReady = false): HTMLElement {
  const t = (id: 'nest' | 'codex', label: string): HTMLElement =>
    button(label, () => {
      if (id === active) return;
      sfx.click();
      go(id === 'nest' ? nest : codex);
    }, `seg${id === active ? ' on' : ''}${id === 'nest' && eggReady && active !== 'nest' ? ' ping' : ''}`, { role: 'tab', 'aria-selected': id === active ? 'true' : 'false' });
  return h('div', { class: 'seg-tabs', role: 'tablist', 'aria-label': 'Nest and Codex' }, t('nest', '🥚 Nest'), t('codex', '📖 Codex'));
}
