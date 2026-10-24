import { TRIBES, dragonSvg } from '../../game/dragons';
import { FACTS, TOPIC_LABEL, factById, type FactTopic } from '../../content/facts';
import { go, profile } from '../app';
import { h, svg } from '../dom';
import { hub, topBar } from './hub';

export const codex = (root: HTMLElement): void => {
  const p = profile();
  const owned = new Set(p.dragons.map((d) => `${d.tribe}:${d.palette}`));
  const total = Object.values(TRIBES).reduce((n, t) => n + t.palettes.length, 0);

  root.append(
    topBar(() => go(hub)),
    h(
      'main',
      { class: 'codex' },
      h('h1', {}, 'Dragon Codex'),
      h('p', {}, `You have found ${owned.size} of ${total} dragons.`),
      factBook(p.factsSeen),
      ...Object.values(TRIBES).map((t) =>
        h(
          'section',
          { class: 'codex-tribe' },
          h('h2', {}, t.name),
          h('p', { class: 'fine' }, `${t.home} · ${t.perk}`),
          h('p', {}, t.lore),
          h(
            'div',
            { class: 'codex-row' },
            ...t.palettes.map((pal, i) => {
              const found = owned.has(`${t.id}:${i}`);
              return h(
                'div',
                { class: 'codex-card' + (found ? '' : ' unknown') },
                svg(dragonSvg(t.id, i, 'adult'), 'codex-art'),
                h('small', {}, found ? pal.name : '???'),
                pal.rare ? h('small', { class: 'rare' }, 'Rare') : null,
              );
            }),
          ),
        ),
      ),
    ),
  );
};

/** Every fact the player has typed in a race, grouped by topic. */
function factBook(seen: string[]): HTMLElement {
  const facts = seen.map(factById).filter((f) => f !== undefined);
  const topics = Object.keys(TOPIC_LABEL) as FactTopic[];
  return h(
    'section',
    { class: 'codex-tribe fact-book' },
    h('h2', {}, 'Fact Book'),
    h('p', {}, facts.length ? `You have collected ${facts.length} of ${FACTS.length} facts.` : 'Learn every letter, then race to collect fun facts here.'),
    ...topics.map((t) => {
      const mine = facts.filter((f) => f.topic === t);
      if (!mine.length) return null;
      return h('details', {}, h('summary', {}, `${TOPIC_LABEL[t]} (${mine.length})`), h('ul', {}, ...mine.map((f) => h('li', {}, f.text))));
    }),
  );
}
