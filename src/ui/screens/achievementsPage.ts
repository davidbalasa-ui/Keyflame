import { achievements, currentTitle, earnedTitles, type Achievement, type Medal } from '../../game/achievements';
import { SUPPORTER_TITLE, SUPPORTER_TITLE_ID } from '../../game/supporter';
import { go, persist, profile } from '../app';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { hub, topBar } from './hub';

const MEDAL_COLORS: Record<Medal, [string, string, string]> = {
  bronze: ['#f0a875', '#b8652f', '#7a3e17'],
  silver: ['#f1f3f5', '#adb5bd', '#5c636a'],
  gold: ['#fff3a3', '#ffc61a', '#b07800'],
  platinum: ['#e3fdff', '#7fe3f0', '#1f8a99'],
  legend: ['#ffd6f5', '#c77dff', '#5a189a'],
};

let medalId = 0;

/** A round medal with a ribbon and the track's icon. Locked medals are grey. */
export function medalSvg(medal: Medal, icon: string, locked = false): string {
  const [hi, mid, lo] = locked ? ['#5b5285', '#3d3466', '#2a2350'] : MEDAL_COLORS[medal];
  const id = `md${++medalId}`;
  return `<svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${hi}"/><stop offset="0.55" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></radialGradient>
    </defs>
    <path d="M18 2 L28 26 L22 30 L10 6 Z" fill="${locked ? '#3d3466' : '#e8364f'}"/>
    <path d="M46 2 L36 26 L42 30 L54 6 Z" fill="${locked ? '#2a2350' : '#4b4ee0'}"/>
    <circle cx="32" cy="44" r="24" fill="${lo}"/>
    <circle cx="32" cy="43" r="22" fill="url(#${id})"/>
    <circle cx="32" cy="43" r="16.5" fill="none" stroke="${hi}" stroke-opacity="0.7" stroke-width="1.5"/>
    ${medal === 'legend' && !locked ? '<path d="M32 17 l2 5 5 .5 -4 3.4 1.2 5 -4.2 -2.7 -4.2 2.7 1.2 -5 -4 -3.4 5 -.5z" fill="#fff" opacity="0.9"/>' : ''}
    <text x="32" y="50" text-anchor="middle" font-size="20" ${locked ? 'opacity="0.35"' : ''}>${locked ? '🔒' : icon}</text>
  </svg>`;
}

function trackCard(tiers: Achievement[]): HTMLElement {
  const got = tiers.filter((a) => a.earned);
  const top = got[got.length - 1];
  const next = tiers.find((a) => !a.earned);
  return h(
    'div',
    { class: 'ach-card' + (top ? ' earned medal-' + top.medal : '') },
    svg(medalSvg(top?.medal ?? 'bronze', tiers[0].icon, !top), 'ach-medal'),
    h(
      'div',
      { class: 'ach-body' },
      h('strong', {}, tiers[0].name),
      h('span', { class: 'ach-pips', 'aria-label': `${got.length} of ${tiers.length} levels` }, ...tiers.map((a) => h('span', { class: `pip ${a.medal}` + (a.earned ? ' on' : '') }))),
      next
        ? h('div', { class: 'ach-next' }, h('small', {}, next.how), h('span', { class: 'bar' }, h('span', { style: `width:${pct(next.value / next.goal)}` })), h('small', { class: 'fine' }, `${next.value.toLocaleString('en-US')} / ${next.goal.toLocaleString('en-US')} · unlocks “${next.title}”`))
        : h('div', { class: 'ach-next' }, h('small', {}, 'Every level done!')),
      h(
        'details',
        {},
        h('summary', {}, 'All levels'),
        h('ul', {}, ...tiers.map((a) => h('li', { class: a.earned ? 'on' : '' }, `${a.earned ? '✓' : '○'} ${a.how}`, h('small', {}, ` · title “${a.title}”`)))),
      ),
    ),
  );
}

export const achievementsPage = (root: HTMLElement): void => {
  const p = profile();
  const all = achievements(p);
  const tracks = new Map<string, Achievement[]>();
  for (const a of all) tracks.set(a.track, [...(tracks.get(a.track) ?? []), a]);
  const earned = all.filter((a) => a.earned).length;

  const titles: Array<{ id: string; title: string; medal: string }> = [...(p.supporter ? [{ id: SUPPORTER_TITLE_ID, title: SUPPORTER_TITLE, medal: 'starglint' }] : []), ...earnedTitles(p)];
  const wearing = currentTitle(p);
  const about = (t: string | null): string => (t ? `You fly as “${t}”. Every achievement unlocks a new title.` : 'Pick a title to show under your name. Every achievement unlocks one.');
  const note = h('p', { class: 'fine' }, about(wearing));
  const chips: HTMLButtonElement[] = [];
  // Updates in place so the page keeps its scroll position.
  const pick = (id: string | null): void => {
    sfx.click();
    p.title = id;
    persist();
    chips.forEach((c) => c.classList.toggle('on', (c.dataset.id || null) === id));
    note.textContent = about(currentTitle(p));
    const shown = document.querySelector('.top-bar .rider-title');
    if (shown) shown.textContent = currentTitle(p) ?? '';
  };

  root.append(
    topBar(() => go(hub)),
    h(
      'main',
      { class: 'achievements' },
      h('h1', {}, 'Achievements'),
      h('p', { class: 'ach-total' }, h('strong', {}, `${earned} of ${all.length}`), ' earned'),
      h(
        'section',
        { class: 'title-pick' },
        h('h2', {}, 'Your title'),
        note,
        titles.length
          ? h(
              'div',
              { class: 'chips' },
              ...[null, ...titles].map((a) => {
                const c = button(a ? a.title : 'No title', () => pick(a?.id ?? null), 'chip' + (a ? ` medal-${a.medal}` : '') + ((a ? p.title === a.id : !wearing) ? ' on' : ''));
                c.dataset.id = a?.id ?? '';
                chips.push(c);
                return c;
              }),
            )
          : h('p', { class: 'fine' }, 'Finish your first race to earn your first title.'),
      ),
      h('div', { class: 'ach-grid' }, ...[...tracks.values()].map(trackCard)),
    ),
  );
};
