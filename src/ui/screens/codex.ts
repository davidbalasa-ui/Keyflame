import { TRIBES, dragonSvg } from '../../game/dragons';
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
