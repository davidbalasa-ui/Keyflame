import { GROWTH, NAME_ENDS, NAME_STARTS, TRIBES, dragonSvg, eggSvg, isSeasonPalette, lookName, paletteFor, stageFor } from '../../game/dragons';
import { EGG_PRICE, claimSets, foundLooks, lookKey } from '../../game/collection';
import { codex } from './codex';
import type { OwnedDragon } from '../../save/store';
import { MILESTONES, activeDragon, eggProgress, hatchEgg, randomDragonName } from '../../game/progress';
import { UNITS } from '../../content/lessons';
import { go, persist, profile } from '../app';
import { DECOR, aerieScene, buyDecor } from './aerie';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { CONFETTI, TRAIL_COLORS, attachField } from '../particles';
import { claimNewAchievements, earnedIds } from '../../game/achievements';
import { medalSvg } from './achievementsPage';
import { hub, topBar } from './hub';
import { raceMap } from './race';

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
        prog >= 1 ? button('Hatch it!', () => hatchSequence(root)) : button('Race to warm it', () => go(raceMap)),
      )
    : h('section', { class: 'nest-panel empty' }, h('h2', {}, 'Your nest is empty'), h('p', {}, 'Earn your next egg from a lesson unit or a milestone below.'), p.dragons.length ? button(`Get an egg for 🔥 ${EGG_PRICE} in the Codex`, () => go(codex), 'btn ghost') : null);

  const goals = [
    ...UNITS.map((u) => ({ tribe: u.reward, label: `Finish the ${u.title} lessons`, done: p.unitsRewarded.includes(u.id) })),
    ...MILESTONES.map((m) => ({ tribe: m.tribe, label: m.label, done: p.milestones.includes(m.id) })),
  ];
  const scene = active ? aerieScene(p, svg(dragonSvg(active.tribe, active.palette, stageFor(active.xp), 'flap bob', active.skin, active.marking), 'showcase-dragon')) : null;

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
                  svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), 'flap', d.skin, d.marking), 'card-dragon'),
                  h('strong', {}, d.name),
                  h('small', {}, `${paletteFor(d.tribe, d.palette).name} ${TRIBES[d.tribe].name}`),
                  h('small', {}, growthText(d)),
                  h('small', { class: 'perk' }, TRIBES[d.tribe].perk),
                  p.supporter
                    ? h('label', { class: 'toggle small' }, h('input', { type: 'checkbox', checked: d.skin === 'starfire', onchange: () => ((d.skin = d.skin ? undefined : 'starfire'), persist(), go(nest)) }), 'Starfire skin')
                    : null,
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
      h(
        'section',
        {},
        h('h2', {}, 'How to earn eggs'),
        h(
          'ul',
          { class: 'egg-goals' },
          ...goals.map((g) => h('li', { class: g.done ? 'done' : '' }, svg(eggSvg(g.tribe, 0, 9), 'mini-egg'), h('span', {}, h('strong', {}, TRIBES[g.tribe].name), ` · ${g.label}`), g.done ? h('span', { class: 'check' }, '✓') : null)),
        ),
      ),
      scene
        ? h(
            'section',
            {},
            h('h2', {}, 'Your aerie'),
            scene,
            h('p', { class: 'fine' }, 'Spend embers to decorate your dragon’s cave. Decorations are just for fun.'),
            h(
              'div',
              { class: 'shop' },
              ...DECOR.map((item) => {
                const owned = p.decor.includes(item.id);
                return h(
                  'div',
                  { class: 'shop-item' + (owned ? ' owned' : '') },
                  h('strong', {}, item.name),
                  owned
                    ? h('small', {}, 'In your aerie')
                    : button(`🔥 ${item.cost}`, () => {
                        if (buyDecor(p, item.id)) {
                          sfx.win();
                          persist();
                          go(nest);
                        }
                      }, 'btn small', { disabled: p.embers < item.cost }),
                );
              }),
            ),
          )
        : null,
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
  const colors = TRAIL_COLORS[egg.tribe];
  let shake = 0;
  const fx = attachField(box, (f, dt) => {
    shake += dt;
    if (shake < 1600 && Math.random() < dt / 120) {
      const r = stageEl.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      f.emit(r.left - b.left + r.width / 2, r.top - b.top + r.height * 0.5, { colors, kind: 'spark', spread: 160, size: 4, life: 0.6 });
    }
  });
  sfx.crack();
  setTimeout(() => sfx.crack(), 500);
  setTimeout(() => sfx.crack(), 1000);

  setTimeout(() => {
    const before = earnedIds(p);
    const looksBefore = foundLooks(p);
    const dragon = hatchEgg(p, name)!;
    const isNewLook = !looksBefore.has(lookKey(dragon.tribe, dragon.palette, dragon.marking));
    const sets = claimSets(p);
    const fresh = claimNewAchievements(p, before);
    persist();
    sfx.hatch();
    {
      const r = stageEl.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      const x = r.left - b.left + r.width / 2;
      const y = r.top - b.top + r.height / 2;
      fx.emit(x, y, { count: 70, colors, kind: 'spark', spread: 520, size: 7, life: 1.2 });
      fx.emit(x, y, { count: 50, colors: CONFETTI, kind: 'confetti', vy: -220, spread: 420, size: 5, life: 2.2 });
    }
    const palette = paletteFor(dragon.tribe, dragon.palette);
    const season = isSeasonPalette(dragon.palette);
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
      svg(dragonSvg(dragon.tribe, dragon.palette, 'hatchling', 'flap bob pop-in', undefined, dragon.marking), 'hatch-dragon'),
      nameEl,
      h('p', {}, `A ${lookName(dragon.tribe, dragon.palette, dragon.marking)} ${TRIBES[dragon.tribe].name}${season ? ', a season color!' : palette.rare ? ', a rare color!' : '!'}`),
      h('p', { class: 'fine' }, season ? 'It joins the season looks in your Codex.' : isNewLook ? 'A new look for your Codex!' : 'You already have this look in your Codex.'),
      h('p', { class: 'fine' }, TRIBES[dragon.tribe].lore),
      ...sets.map((x) => h('p', { class: 'reward' }, `Codex set done: ${TRIBES[x.tribe].name} ${x.label.toLowerCase()}! +${x.embers} embers`)),
      ...fresh.map((a) => h('p', { class: 'reward ach-line' }, svg(medalSvg(a.medal, a.icon), 'ach-mini'), `Achievement: ${a.how}. New title “${a.title}”!`)),
      h('p', {}, 'Pick a name:'),
      h('div', { class: 'name-pickers' }, sel(NAME_STARTS, start, (v) => ((start = v), setName(start + end))), sel(NAME_ENDS, end, (v) => ((end = v), setName(start + end)))),
      h('div', { class: 'row' }, button('Done', () => go(nest))),
    );
    box.append(fx.canvas);
  }, 1600);
}
