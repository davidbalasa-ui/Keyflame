import { GROWTH, NAME_ENDS, NAME_STARTS, TRIBES, dragonSvg, eggSvg, stageFor } from '../../game/dragons';
import type { OwnedDragon } from '../../save/store';
import { activeDragon, eggProgress, hatchEgg, randomDragonName } from '../../game/progress';
import { go, persist, profile } from '../app';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { hub, topBar } from './hub';
import { race } from './race';

function growthText(d: OwnedDragon): string {
  const stage = stageFor(d.xp);
  if (stage === 'adult') return 'Fully grown';
  const goal = stage === 'hatchling' ? GROWTH.young : GROWTH.adult;
  return `${stage === 'hatchling' ? 'Hatchling' : 'Young'} · ${goal - d.xp} keys to grow`;
}

export const nest = (root: HTMLElement): void => {
  const p = profile();
  const egg = p.nest;
  const prog = eggProgress(p);
  const active = activeDragon(p);

  const nestPanel = egg
    ? h(
        'section',
        { class: 'nest-panel' },
        svg(eggSvg(egg.tribe, prog, egg.seed), 'nest-egg' + (prog >= 1 ? ' ready' : ' wobble')),
        h('h2', {}, `${TRIBES[egg.tribe].name} egg`),
        h('div', { class: 'warmth' }, h('span', { style: `width:${pct(prog)}` })),
        h('p', {}, prog >= 1 ? 'It is ready! Listen… crack, crack!' : `${pct(prog)} warm. ${TRIBES[egg.tribe].hatchKeys - egg.warmth} more correct keys to hatch.`),
        prog >= 1 ? button('Hatch it!', () => hatchSequence(root)) : button('Race to warm it', () => go(race)),
      )
    : h('section', { class: 'nest-panel empty' }, h('h2', {}, 'Your nest is empty'), h('p', {}, 'Finish a lesson unit to earn your next egg.'));

  root.append(
    topBar(() => go(hub)),
    h(
      'main',
      { class: 'nest' },
      h('h1', {}, 'Nest'),
      nestPanel,
      p.basket.length
        ? h('section', {}, h('h2', {}, 'Eggs waiting'), h('div', { class: 'basket' }, ...p.basket.map((t, i) => h('div', { class: 'basket-egg' }, svg(eggSvg(t, 0, i + 11), 'mini-egg'), h('small', {}, TRIBES[t].name)))), h('p', { class: 'fine' }, 'The next egg moves into the nest when this one hatches.'))
        : null,
      h(
        'section',
        {},
        h('h2', {}, 'Your dragons'),
        p.dragons.length
          ? h(
              'div',
              { class: 'dragon-grid' },
              ...p.dragons.map((d) =>
                h(
                  'div',
                  { class: 'dragon-card' + (active?.id === d.id ? ' active' : '') },
                  svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), 'flap'), 'card-dragon'),
                  h('strong', {}, d.name),
                  h('small', {}, `${TRIBES[d.tribe].palettes[d.palette]?.name} ${TRIBES[d.tribe].name}`),
                  h('small', {}, growthText(d)),
                  h('small', { class: 'perk' }, TRIBES[d.tribe].perk),
                  active?.id === d.id
                    ? h('span', { class: 'badge' }, 'Racing')
                    : button('Race with me', () => {
                        p.activeDragonId = d.id;
                        persist();
                        go(nest);
                      }, 'btn small'),
                ),
              ),
            )
          : h('p', { class: 'fine' }, 'No dragons yet. Your first egg is almost ready!'),
      ),
    ),
  );
};

function hatchSequence(root: HTMLElement): void {
  const p = profile();
  const egg = p.nest!;
  let name = randomDragonName();
  const stageEl = svg(eggSvg(egg.tribe, 1, egg.seed), 'hatch-egg shaking');
  const box = h('div', { class: 'modal hatch' }, stageEl, h('h2', {}, 'Hatching…'));
  const modal = h('div', { class: 'modal-backdrop' }, box);
  root.append(modal);
  sfx.crack();
  setTimeout(() => sfx.crack(), 500);
  setTimeout(() => sfx.crack(), 1000);

  setTimeout(() => {
    const dragon = hatchEgg(p, name)!;
    persist();
    sfx.hatch();
    const palette = TRIBES[dragon.tribe].palettes[dragon.palette];
    const nameEl = h('h2', {}, `Meet ${name}!`);
    const setName = (n: string): void => {
      name = n;
      dragon.name = n;
      nameEl.textContent = `Meet ${n}!`;
      persist();
    };
    let start = NAME_STARTS.find((s) => name.startsWith(s)) ?? NAME_STARTS[0];
    let end = name.slice(start.length);
    const sel = (opts: string[], value: string, on: (v: string) => void): HTMLSelectElement => {
      const s = h('select', { onchange: () => on(s.value) }, ...opts.map((o) => h('option', { value: o, selected: o === value }, o)));
      return s;
    };
    box.replaceChildren(
      svg(dragonSvg(dragon.tribe, dragon.palette, 'hatchling', 'flap bob pop-in'), 'hatch-dragon'),
      nameEl,
      h('p', {}, `A ${palette.name} ${TRIBES[dragon.tribe].name}${palette.rare ? ' — a rare color!' : '!'}`),
      h('p', { class: 'fine' }, TRIBES[dragon.tribe].lore),
      h('p', {}, 'Pick a name:'),
      h('div', { class: 'name-pickers' }, sel(NAME_STARTS, start, (v) => ((start = v), setName(start + end))), sel(NAME_ENDS, end, (v) => ((end = v), setName(start + end)))),
      h('div', { class: 'row' }, button('Done', () => go(nest))),
    );
  }, 1600);
}
