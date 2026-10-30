// The season button on the hub and the Seasons page it opens. Before seasons begin
// the button counts down in whole days and the page previews what is coming.
// Kind to kids: no ticking clocks, nothing to buy, and every season comes back later.

import { SEASONS, daysUntilSeasons, pastSeasons, seasonAt, type Season } from '../../content/seasons';
import { dragonSvg, type TribeId } from '../../game/dragons';
import { CHALLENGE_EMBERS, SEASON_COLOR_CHANCE, seasonChallenges, seasonPalette, seasonsFinished } from '../../game/seasons';
import { go, profile } from '../app';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { hub, topBar } from './hub';
import { withTabs } from '../tabBar';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TRIBE_CYCLE: TribeId[] = ['frostspine', 'stormcrest', 'tidefin', 'mossclaw', 'emberback', 'duneskimmer', 'shadeglide'];

const monthOf = (s: Season): string => MONTHS[Number(s.id.slice(5)) - 1];
const skyStyle = (s: Season): string => `--s1:${s.sky[0]};--s2:${s.sky[1]};--s3:${s.sky[2]}`;
const seasonDragon = (s: Season, cls = 'flap bob'): string => dragonSvg(TRIBE_CYCLE[SEASONS.indexOf(s) % TRIBE_CYCLE.length], seasonPalette(s), 'adult', cls);

function daysText(days: number): string {
  return days === 1 ? '1 day to go' : `${days} days to go`;
}

/** The hub's season banner. It opens the Seasons page. */
export function seasonButton(): HTMLElement {
  const p = profile();
  const s = seasonAt();
  const shown = s ?? SEASONS[0];
  const line = s ? `${seasonChallenges(p).filter((c) => c.done).length} of ${s.challenges.length} challenges` : `Starts January 1 · ${daysText(daysUntilSeasons())}`;
  return button(
    h('span', { class: 'season-btn-in' }, svg(seasonDragon(shown, 'flap'), 'season-btn-dragon'), h('span', { class: 'season-btn-text' }, h('small', {}, s ? 'This month’s season' : 'Seasons are coming'), h('strong', {}, shown.name), h('small', {}, line)), h('span', { class: 'season-btn-go', 'aria-hidden': 'true' }, '›')),
    () => (sfx.click(), go(seasonPage)),
    'season-btn',
    { style: skyStyle(shown), 'aria-label': s ? `${s.name} season: ${line}` : `Seasons start January 1, ${daysText(daysUntilSeasons())}. See what is coming.` },
  );
}

function hero(s: Season, kicker: string, title: string, body: Array<HTMLElement | string | null>): HTMLElement {
  return h('section', { class: 'season-banner', style: skyStyle(s) }, svg(seasonDragon(s), 'season-dragon'), h('div', { class: 'season-body' }, h('small', { class: 'season-kicker' }, kicker), h('h2', {}, title), ...body));
}

/** A small card for a season in a list. */
function seasonCard(s: Season, note: string): HTMLElement {
  return h('div', { class: 'season-card', style: skyStyle(s) }, svg(seasonDragon(s, ''), 'season-card-dragon'), h('strong', {}, s.name), h('small', {}, note));
}

export const seasonPage = (root: HTMLElement): (() => void) => {
  const p = profile();
  const s = seasonAt();
  const parts: Array<HTMLElement | null> = [];

  if (!s) {
    const first = SEASONS[0];
    const days = daysUntilSeasons();
    parts.push(
      hero(first, 'Coming soon', 'Seasons start January 1', [
        h('p', { class: 'season-count' }, daysText(days)),
        h('p', {}, `The first season is ${first.name}. ${first.idea}`),
        h('p', { class: 'fine' }, 'Everyone starts together on the same day, so nobody misses the first one.'),
      ]),
      h(
        'section',
        { class: 'season-how' },
        h('h2', {}, 'What a season brings'),
        h(
          'ul',
          {},
          h('li', {}, '🌌 A new sky over every race course, all month long.'),
          h('li', {}, `🥚 A new dragon color. About one egg in ${Math.round(1 / SEASON_COLOR_CHANCE)} hatches in it, on any tribe.`),
          h('li', {}, `🎯 Three fun challenges. Each one pays ${CHALLENGE_EMBERS} embers.`),
          h('li', {}, '🌟 Finish all three to earn that season’s title.'),
          h('li', {}, '🔁 Seasons always come back, and old colors still turn up in the Starfall Vault. Everything is free.'),
        ),
      ),
      h('section', { class: 'season-how' }, h('h2', {}, 'The first three seasons'), h('div', { class: 'season-cards' }, ...SEASONS.slice(0, 3).map((x) => seasonCard(x, `${monthOf(x)} · ${x.color.name} dragons`)))),
    );
  } else {
    const challenges = seasonChallenges(p);
    const done = challenges.filter((c) => c.done).length;
    const next = seasonAt(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
    const finished = seasonsFinished(p);
    const past = pastSeasons().filter((x) => x !== s && finished.has(x.id));
    parts.push(
      hero(s, `${monthOf(s)} season`, s.name, [
        h('p', {}, s.idea),
        h('p', { class: 'fine' }, `Eggs that hatch this month may come out ${s.color.name}. Every race flies under the ${s.name} sky.`),
        h(
          'ul',
          { class: 'season-challenges' },
          ...challenges.map((c) => h('li', { class: c.done ? 'done' : '' }, h('span', {}, `${c.done ? '✓' : '○'} ${c.text}`), h('span', { class: 'bar' }, h('span', { style: `width:${pct(c.value / c.goal)}` })), h('small', { class: 'fine' }, c.done ? `Done · +${CHALLENGE_EMBERS} embers` : `${c.value.toLocaleString('en-US')} / ${c.goal.toLocaleString('en-US')}`))),
        ),
        h('small', { class: 'fine' }, done === challenges.length ? `All done! You earned the title “${s.title}”.` : `Finish all ${challenges.length} for the title “${s.title}”.`),
      ]),
      next ? h('section', { class: 'season-how' }, h('h2', {}, 'Next month'), h('div', { class: 'season-cards' }, seasonCard(next, `${monthOf(next)} · ${next.color.name} dragons`))) : null,
      past.length ? h('section', { class: 'season-how' }, h('h2', {}, 'Seasons you finished'), h('div', { class: 'season-cards' }, ...past.map((x) => seasonCard(x, `Title “${x.title}”`)))) : null,
    );
  }

  root.append(topBar(() => go(hub)), h('main', { class: 'season-page' }, h('h1', {}, 'Seasons'), ...parts, h('div', { class: 'row' }, button('Home', () => go(hub), 'btn ghost'))));
  return withTabs(root, 'home');
};
