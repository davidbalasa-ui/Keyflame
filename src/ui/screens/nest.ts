import { EGG_SEAM, GROWTH, HATCH_TAPS, NAME_ENDS, NAME_STARTS, TRIBES, dragonSvg, eggCracksSvg, eggSvg, isSeasonPalette, lookName, paletteFor, stageFor, type TribeId } from '../../game/dragons';
import { EGG_PRICE, claimSets, foundLooks, lookKey } from '../../game/collection';
import { codex, codexLook } from './codex';
import { isStarglint, type OwnedDragon } from '../../save/store';
import { kindName, perkText, EVOLVE_XP, MAXED_EMBERS, MAX_STARS, MILESTONES, STAR_NAMES, WARM_PRICE, WARM_SHARE, activeDragon, canWarmWithEmbers, eggProgress, hatchNest, randomDragonName, swapNestEgg, warmWithEmbers } from '../../game/progress';
import { UNITS } from '../../content/lessons';
import { go, persist, profile } from '../app';
import { DECOR, aerieScene, buyDecor } from './aerie';
import { button, h, pct, svg } from '../dom';
import { diceButton, randomOf, wordPicker } from '../picker';
import { sfx } from '../sound';
import { CONFETTI, TRAIL_COLORS, attachField } from '../particles';
import { claimNewAchievements, earnedIds } from '../../game/achievements';
import { medalSvg } from './achievementsPage';
import { hub, refreshEmbers, topBar } from './hub';
import { raceMap } from './race';

function growthText(d: OwnedDragon): string {
  const stage = stageFor(d.xp);
  const evo = d.stars ? `${STAR_NAMES[d.stars]}${d.stars >= MAX_STARS ? ' (full stars)' : ''} · ` : '';
  if (stage === 'adult') return `${evo}Fully grown`;
  const goal = stage === 'hatchling' ? GROWTH.young : GROWTH.adult;
  return `${evo}${stage === 'hatchling' ? 'Hatchling' : 'Young'} · ${goal - d.xp} keys to grow`;
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
        prog >= 1
          ? h('button', { class: 'nest-egg-tap', type: 'button', 'aria-label': `Tap to open the ${TRIBES[egg.tribe].name} egg`, onclick: () => hatchSequence(root) }, svg(eggSvg(egg.tribe, prog, egg.seed), 'nest-egg ready'))
          : svg(eggSvg(egg.tribe, prog, egg.seed), 'nest-egg wobble'),
        h('h2', {}, `${TRIBES[egg.tribe].name} egg`),
        h('div', { class: 'warmth' }, h('span', { style: `width:${pct(prog)}` })),
        prog >= 1
          ? h('p', { class: 'tap-hint' }, 'It is ready! Tap to open')
          : h('p', {}, `${pct(prog)} warm. ${TRIBES[egg.tribe].hatchKeys - egg.warmth} more correct keys to hatch.`),
        prog >= 1
          ? null
          : h(
              'div',
              { class: 'row center' },
              button('Race to warm it', () => go(raceMap)),
              button(`Warm with 🔥 ${WARM_PRICE}`, () => {
                if (!warmWithEmbers(p)) return;
                sfx.coin();
                persist();
                go(nest);
              }, 'btn ghost', canWarmWithEmbers(p) ? { title: `Adds ${Math.round(WARM_SHARE * 100)}% warmth` } : { disabled: true, title: `Costs ${WARM_PRICE} embers` }),
            ),
      )
    : h('section', { class: 'nest-panel empty' }, h('h2', {}, 'Your nest is empty'), h('p', {}, 'Earn your next egg from a lesson unit or a milestone below.'), p.dragons.length ? button(`Get an egg for 🔥 ${EGG_PRICE} in the Codex`, () => go(codex), 'btn ghost') : null);

  const goals = [
    ...UNITS.map((u) => ({ tribe: u.reward, label: `Finish the ${u.title} lessons`, done: p.unitsRewarded.includes(u.id) })),
    ...MILESTONES.map((m) => ({ tribe: m.tribe, label: m.label, done: p.milestones.includes(m.id) })),
  ];
  const scene = active ? aerieScene(p, svg(dragonSvg(active.tribe, active.palette, stageFor(active.xp), 'flap bob', active.skin, active.marking, active.stars), 'showcase-dragon')) : null;

  root.append(
    topBar(() => go(hub)),
    h(
      'main',
      { class: 'nest' },
      h('h1', {}, 'Nest'),
      nestPanel,
      p.basket.length
        ? h(
            'section',
            {},
            h('h2', {}, 'Eggs waiting'),
            h(
              'div',
              { class: 'basket' },
              ...p.basket.map((t, i) =>
                h(
                  'button',
                  {
                    class: 'basket-egg',
                    type: 'button',
                    'aria-label': `Put the ${TRIBES[t].name} egg in the nest`,
                    onclick: () => {
                      if (!swapNestEgg(p, i)) return;
                      sfx.click();
                      persist();
                      go(nest);
                    },
                  },
                  svg(eggSvg(t, 0, i + 11), 'mini-egg'),
                  h('strong', {}, TRIBES[t].name),
                  h('small', {}, 'Put in nest'),
                ),
              ),
            ),
            h('p', { class: 'fine' }, 'Pick which egg to hatch next. The nest stays warm, so switching eggs keeps all the warmth.'),
          )
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
                  svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), 'flap', d.skin, d.marking, d.stars), 'card-dragon'),
                  h('strong', {}, d.name, d.stars ? h('span', { class: 'stars', 'aria-label': `${d.stars} evolution stars` }, ' ' + '★'.repeat(d.stars)) : null),
                  h('small', {}, isStarglint(d) ? 'Supporter dragon' : `${paletteFor(d.tribe, d.palette).name} ${kindName(d)}`),
                  h('small', {}, growthText(d)),
                  h('small', { class: 'perk' }, perkText(d)),
                  isStarglint(d)
                    ? h('label', { class: 'toggle small' }, h('input', { type: 'checkbox', checked: d.noHints === true, onchange: () => ((d.noHints = !d.noHints), persist(), go(nest)) }), 'No key hints')
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

/** A clip-path that keeps one side of the seam the shell splits along. */
function shellClip(top: boolean): string {
  const pts = EGG_SEAM.map(([x, y]) => `${x}% ${((y / 120) * 100).toFixed(1)}%`);
  const [, y0] = EGG_SEAM[0];
  const [, y1] = EGG_SEAM[EGG_SEAM.length - 1];
  const left = `0% ${((y0 / 120) * 100).toFixed(1)}%`;
  const right = `100% ${((y1 / 120) * 100).toFixed(1)}%`;
  return top ? `polygon(0% 0%, 100% 0%, ${right}, ${[...pts].reverse().join(', ')}, ${left})` : `polygon(${left}, ${pts.join(', ')}, ${right}, 100% 100%, 0% 100%)`;
}

/**
 * Opening an egg: a full-screen stage where every tap cracks the shell a little more.
 * The last tap splits it, the dragon fills the screen for a moment, then it settles
 * into a card with its details. The first tap was the one on the nest egg.
 */
function hatchSequence(root: HTMLElement): void {
  const p = profile();
  const egg = p.nest!;
  const calm = document.body.classList.contains('reduced-motion');
  const colors = TRAIL_COLORS[egg.tribe];
  const glow = TRIBES[egg.tribe].palettes[0].accent;
  let taps = 0;

  const cracks = h('div', { class: 'art egg-crack-layer' });
  const shell = (): HTMLElement => h('div', { class: 'hatch-shell' }, svg(eggSvg(egg.tribe, 1, egg.seed, false)), cracks);
  const eggArt = shell();
  const eggBtn = h('button', { class: 'hatch-tap', type: 'button', 'aria-label': 'Tap to open the egg' }, eggArt);
  const hint = h('p', { class: 'tap-hint big', 'aria-live': 'polite' }, 'Tap to open');
  const pips = h('div', { class: 'tap-pips', 'aria-hidden': 'true' }, ...Array.from({ length: HATCH_TAPS }, () => h('span')));
  const center = h('div', { class: 'hatch-center' }, eggBtn, hint, pips);
  const screen = h('div', { class: 'hatch-screen', style: `--glow:${glow}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': `${TRIBES[egg.tribe].name} egg` }, h('div', { class: 'hatch-rays' }), center);
  root.append(screen);
  const fx = attachField(screen);
  const middle = (el: Element): [number, number] => {
    const r = el.getBoundingClientRect();
    const b = screen.getBoundingClientRect();
    return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2];
  };

  const crack = (): void => {
    if (taps >= HATCH_TAPS) return;
    taps++;
    cracks.innerHTML = eggCracksSvg(egg.tribe, taps);
    pips.children[taps - 1]?.classList.add('on');
    screen.style.setProperty('--heat', (taps / HATCH_TAPS).toFixed(2));
    eggArt.classList.remove('knock');
    void eggArt.offsetWidth;
    eggArt.classList.add('knock');
    fx.emit(...middle(eggArt), { count: 6 + taps * 4, colors, kind: 'spark', spread: 140 + taps * 30, size: 3 + taps * 0.5, life: 0.6 });
    sfx.tap(taps);
    hint.textContent = taps === HATCH_TAPS - 1 ? 'One more tap' : taps < HATCH_TAPS ? 'Tap again' : '';
    if (taps >= HATCH_TAPS) setTimeout(open, calm ? 0 : 180);
  };
  screen.addEventListener('click', crack);
  crack();
  eggBtn.focus();

  function open(): void {
    screen.removeEventListener('click', crack);
    const before = earnedIds(p);
    const looksBefore = foundLooks(p);
    const name = randomDragonName();
    const result = hatchNest(p, name)!;
    const sets = claimSets(p);
    const fresh = claimNewAchievements(p, before);
    persist();
    refreshEmbers();

    // The shell splits along the seam and the halves fly apart.
    const [x, y] = middle(eggArt);
    const top = shell();
    const bottom = shell();
    top.style.clipPath = shellClip(true);
    bottom.style.clipPath = shellClip(false);
    top.classList.add('fly-top');
    bottom.classList.add('fly-bottom');
    const halves = h('div', { class: 'hatch-halves' }, top, bottom);
    eggBtn.replaceWith(halves);
    hint.remove();
    pips.remove();
    screen.classList.add('opened');
    fx.emit(x, y, { count: 120, colors: [...colors, glow, '#ffffff'], kind: 'spark', spread: 760, size: 8, life: 1.5 });
    fx.emit(x, y, { count: 60, colors: CONFETTI, kind: 'confetti', vy: -260, spread: 520, size: 6, life: 2.4 });
    sfx.hatch();

    // Rewards are short pills; the Codex and the trophy room hold the longer story.
    const extras = (): HTMLElement[] => {
      const pills = [
        ...sets.map((x) => h('span', { class: 'reward-pill', title: `${TRIBES[x.tribe].name} ${x.label.toLowerCase()}` }, `Set done +${x.embers} 🔥`)),
        ...fresh.map((a) => h('span', { class: 'reward-pill', title: a.how }, svg(medalSvg(a.medal, a.icon), 'ach-mini'), `New title: ${a.title}`)),
      ];
      return pills.length ? [h('div', { class: 'reward-pills' }, ...pills)] : [];
    };
    const d = result.dragon;
    const stars = result.evolved && d ? (d.stars ?? 1) - 1 : 0;
    const art = d
      ? svg(dragonSvg(d.tribe, d.palette, result.evolved ? stageFor(d.xp) : 'hatchling', 'flap bob', result.evolved ? d.skin : undefined, d.marking, stars), 'hatch-dragon reveal-art')
      : h('div', { class: 'reveal-art reveal-embers' }, '🔥');
    const palette = d ? paletteFor(d.tribe, d.palette) : null;
    const season = d ? isSeasonPalette(d.palette) : false;
    const headline = !d
      ? `+${MAXED_EMBERS} embers!`
      : result.evolved
        ? `${d.name} again!`
        : `A ${TRIBES[d.tribe].name}!`;
    const sub = !d ? 'A warm handful of embers' : `${lookName(d.tribe, d.palette, d.marking)}${season ? ' · a season color' : palette?.rare ? ' · a rare color' : ''}`;
    const reveal = h('div', { class: 'hatch-reveal' }, art, h('h2', { class: 'reveal-title' }, headline), h('p', { class: 'reveal-sub' }, sub));
    setTimeout(() => {
      halves.remove();
      center.append(reveal);
    }, calm ? 0 : 220);

    // After a moment in the spotlight, the dragon shrinks into its details card.
    setTimeout(() => {
      screen.classList.add('settled');
      const panel = h('div', { class: 'modal hatch hatch-details' });
      if (d && result.evolved) {
        reveal.replaceWith(panel);
        evolveSequence(panel, attachField(panel), d, extras());
        return;
      }
      const first = art.getBoundingClientRect();
      art.classList.remove('reveal-art');
      const codexBtn = d && button('See it in Codex', () => go(isSeasonPalette(d.palette) ? codex : codexLook(d.tribe, d.palette, d.marking ?? 0)), 'btn ghost');
      panel.append(art, ...(d ? dragonDetails(d, looksBefore) : embersDetails(egg.tribe)), ...extras(), h('div', { class: 'row' }, codexBtn, button('Done', () => go(nest))));
      reveal.replaceWith(panel);
      const last = art.getBoundingClientRect();
      if (!calm && last.width) {
        const dx = first.left + first.width / 2 - (last.left + last.width / 2);
        const dy = first.top + first.height / 2 - (last.top + last.height / 2);
        art.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${first.width / last.width})` }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      }
    }, calm ? 1200 : 2900);
  }
}

function embersDetails(tribe: TribeId): HTMLElement[] {
  return [h('h2', {}, `+${MAXED_EMBERS} embers!`), h('p', {}, `Every ${TRIBES[tribe].name} look you could get is already at full stars, so this egg turned into ${MAXED_EMBERS} embers.`)];
}

/** The new dragon's card: its name, a look tag, and the name pickers. */
function dragonDetails(dragon: OwnedDragon, looksBefore: Map<string, number>): HTMLElement[] {
  const isNewLook = !looksBefore.has(lookKey(dragon.tribe, dragon.palette, dragon.marking));
  const palette = paletteFor(dragon.tribe, dragon.palette);
  const season = isSeasonPalette(dragon.palette);
  let name = dragon.name;
  const nameEl = h('h2', { class: 'hatch-name' }, `Meet ${name}!`);
  const setName = (n: string): void => {
    name = n;
    dragon.name = n;
    nameEl.textContent = `Meet ${n}!`;
    persist();
  };
  let start = NAME_STARTS.find((s) => name.startsWith(s)) ?? NAME_STARTS[0];
  let end = name.slice(start.length);
  const first = wordPicker({ words: NAME_STARTS, value: start, label: 'Name start', onChange: (v) => ((start = v), setName(start + end)), preview: (v) => v + end });
  const second = wordPicker({ words: NAME_ENDS, value: end, label: 'Name ending', onChange: (v) => ((end = v), setName(start + end)), preview: (v) => start + v });
  const dice = diceButton(() => {
    first.set(randomOf(NAME_STARTS.filter((w) => w !== start)));
    second.set(randomOf(NAME_ENDS.filter((w) => w !== end)));
  });
  const tag = season ? 'Season color' : palette.rare ? 'Rare color' : isNewLook ? 'New look' : null;
  return [
    nameEl,
    h(
      'div',
      { class: 'hatch-tags' },
      h('span', { class: 'hatch-tag' }, `${lookName(dragon.tribe, dragon.palette, dragon.marking)} ${TRIBES[dragon.tribe].name}`),
      tag ? h('span', { class: 'hatch-tag shiny' }, `✨ ${tag}`) : null,
    ),
    h('div', { class: 'name-pickers' }, first.el, second.el, dice),
  ];
}

/**
 * A repeated look evolves the dragon that already wears it: flashes build up, a big
 * burst in the tribe's colors hides the swap, and the evolved dragon is there after.
 */
function evolveSequence(box: HTMLElement, fx: ReturnType<typeof attachField>, d: OwnedDragon, extras: HTMLElement[]): void {
  const stars = d.stars ?? 1;
  const colors = TRAIL_COLORS[d.tribe];
  const glow = paletteFor(d.tribe, d.palette).accent;
  const stage = stageFor(d.xp);
  const art = (n: number, cls: string): HTMLElement => svg(dragonSvg(d.tribe, d.palette, stage, cls, d.skin, d.marking, n), 'hatch-dragon');
  const before = art(stars - 1, 'flap');
  const flash = h('div', { class: 'evo-flash', style: `--glow:${glow}` });
  const title = h('h2', {}, `${d.name} is changing…`);
  box.replaceChildren(h('div', { class: 'evo-stage' }, before, flash), title, fx.canvas);
  const at = (): [number, number] => {
    const r = before.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2];
  };
  // Three quick flashes, each brighter than the last.
  [0, 450, 850].forEach((t, i) =>
    setTimeout(() => {
      flash.classList.remove('pulse-' + i);
      void flash.offsetWidth;
      flash.classList.add('pulse-' + (i + 1));
      fx.emit(...at(), { count: 18 + i * 12, colors, kind: 'spark', spread: 200 + i * 80, size: 4 + i, life: 0.6 });
      sfx.crack();
    }, t),
  );
  setTimeout(() => {
    flash.classList.add('boom');
    const [x, y] = at();
    fx.emit(x, y, { count: 140, colors: [...colors, glow, '#ffffff'], kind: 'spark', spread: 760, size: 9, life: 1.6 });
    fx.emit(x, y, { count: 60, colors: CONFETTI, kind: 'confetti', vy: -260, spread: 520, size: 6, life: 2.4 });
    sfx.hatch();
  }, 1300);
  // The swap happens while the burst covers the dragon.
  setTimeout(() => before.replaceWith(art(stars, 'flap bob')), 1500);
  setTimeout(() => {
    title.textContent = `${d.name} evolved!`;
    box.append(
      h('p', { class: 'evo-stars', 'aria-label': `${stars} of ${MAX_STARS} stars` }, '★'.repeat(stars) + '☆'.repeat(MAX_STARS - stars)),
      h('p', {}, `${STAR_NAMES[stars]} ${d.name} · +${EVOLVE_XP.toLocaleString('en-US')} keys of growth`),
      h('p', { class: 'fine' }, stars >= MAX_STARS ? 'Full stars! This look will not hatch again, so your next eggs bring something else.' : `You found this look again, so ${d.name} grew stronger. ${MAX_STARS - stars} more ${MAX_STARS - stars === 1 ? 'star' : 'stars'} to go.`),
      ...extras,
      h('div', { class: 'row' }, button('Done', () => go(nest))),
    );
  }, 2300);
}
