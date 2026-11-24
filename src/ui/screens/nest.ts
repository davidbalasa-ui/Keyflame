import { EGG_PATH } from '../../game/art/eggs';
import { EGG_SEAM, GROWTH, HATCH_TAPS, NAME_ENDS, NAME_STARTS, TRIBES, dragonSvg, eggCracksSvg, eggSvg, isSeasonPalette, lookName, paletteFor, stageFor, type TribeId } from '../../game/dragons';
import { EGG_PRICE, buyEgg, canBuyEgg, claimSets, eggShop, foundLooks, lookKey } from '../../game/collection';
import { codex, codexLook } from './codex';
import { isStarglint, type OwnedDragon, type Profile } from '../../save/store';
import { courseUnlocked, kindName, perkText, EVOLVE_XP, MAXED_EMBERS, MAX_STARS, MILESTONES, STAR_NAMES, milestoneText, WARM_PRICE, WARM_SHARE, activeDragon, canWarmWithEmbers, eggProgress, hatchNest, randomDragonName, basketGroups, swapNestEgg, warmWithEmbers, nearestFreeEgg, keysToHatch } from '../../game/progress';
import { UNITS } from '../../content/lessons';
import { lessons } from './lessons';
import { go, persist, profile } from '../app';
import { DECOR, aerieScene, buyDecor, decorThumb } from './aerie';
import { button, h, pct, svg, tapHand } from '../dom';
import { nestStage } from '../eggNest';
import { diceButton, randomOf, wordPicker } from '../picker';
import { sfx } from '../sound';
import { CONFETTI, TRAIL_COLORS, attachField } from '../particles';
import { claimNewAchievements, earnedIds } from '../../game/achievements';
import { medalSvg } from './achievementsPage';
import { hub, refreshEmbers, topBar } from './hub';
import { dragonTabs, withTabs } from '../tabBar';
import { race, raceMap } from './race';
import { COURSES } from '../../game/courses';
import { countUsage, firstHatch } from '../usage';

function growthText(d: OwnedDragon): string {
  const stage = stageFor(d.xp);
  const evo = d.stars ? `${STAR_NAMES[d.stars]}${d.stars >= MAX_STARS ? ' (full stars)' : ''} · ` : '';
  if (stage === 'adult') return `${evo}Fully grown`;
  const goal = stage === 'hatchling' ? GROWTH.young : GROWTH.adult;
  return `${evo}${stage === 'hatchling' ? 'Hatchling' : 'Young'} · ${goal - d.xp} keys to grow`;
}

/** Set by hatchNow: the nest opens straight into the hatch. */
let hatchOnOpen = false;
/** Set right after buying an egg, so the nest says it landed. */
let justBought = false;

/** Opens the nest and, if the egg is ready, starts cracking it at once (one tap from Home or results). */
export function hatchNow(): void {
  hatchOnOpen = true;
  go(nest);
}

/** "Free egg next" with its progress and one button to go work on it. */
function freeEggCard(p: Profile): HTMLElement | null {
  const next = nearestFreeEgg(p);
  if (!next) return null;
  return h(
    'div',
    { class: 'free-egg-next' },
    svg(eggSvg(next.tribe, next.done / next.need, 9), 'mini-egg'),
    h('span', {}, h('strong', {}, `Free ${TRIBES[next.tribe].name} egg`), h('small', {}, next.text)),
    button(next.lessons ? '▶ Lessons' : '▶ Race', () => go(next.lessons ? lessons : nextHatchRace()), 'btn small glow-btn'),
  );
}

/** The empty nest: eggs of tribes the rider knows, bought with one tap, straight into the nest. */
function emptyNest(): HTMLElement {
  const p = profile();
  const shop = eggShop(p);
  const short = shop.length > 0 && p.embers < EGG_PRICE;
  return h(
    'section',
    { class: 'nest-panel empty' },
    h('h2', {}, shop.length ? 'Get an egg' : 'Your nest is empty'),
    // The nearest free egg comes first, before anything that costs embers.
    freeEggCard(p),
    shop.length
      ? h(
          'div',
          { class: 'egg-shop' },
          ...shop.map((t) => {
            const ok = canBuyEgg(p, t) === 'ok';
            return h(
              'button',
              {
                class: 'shop-egg' + (ok ? ' glow-btn' : ''),
                type: 'button',
                disabled: !ok,
                'aria-label': `Get a ${TRIBES[t].name} egg for ${EGG_PRICE} embers`,
                onclick: () => {
                  if (!buyEgg(p, t)) return;
                  sfx.coin();
                  persist();
                  justBought = true;
                  go(nest);
                },
              },
              svg(eggSvg(t, 0, 7), 'mini-egg'),
              h('strong', {}, TRIBES[t].name),
              h('span', { class: 'shop-price' }, `🔥 ${EGG_PRICE}`),
            );
          }),
        )
      : null,
    short ? h('p', { class: 'nest-keys' }, `Need ${EGG_PRICE - p.embers} more 🔥`) : null,
    short ? h('div', { class: 'row center' }, button('▶ Race for embers', () => go(raceMap), 'btn big glow-btn')) : null,
    // No tribe to buy yet: eggs come from the goals further down.
    shop.length ? null : button('🥚 How to earn eggs ↓', () => document.getElementById('egg-goals')?.scrollIntoView({ behavior: 'smooth' }), 'btn big glow-btn'),
  );
}

/** "Race to hatch" starts a race right away, on the newest course this rider has opened. */
function nextHatchRace() {
  const p = profile();
  const open = COURSES.filter((c) => courseUnlocked(p, c.id));
  return open.length ? race(open[open.length - 1].id) : raceMap;
}

export const nest = (root: HTMLElement): (() => void) => {
  const p = profile();
  const autoHatch = hatchOnOpen;
  hatchOnOpen = false;
  const bought = justBought;
  justBought = false;
  if (!p.nestSeen) {
    // Home points at the nest with a tapping finger until the rider has found it once.
    p.nestSeen = true;
    persist();
  }
  const egg = p.nest;
  const prog = eggProgress(p);
  const active = activeDragon(p);

  const nestPanel = egg
    ? h(
        'section',
        { class: 'nest-panel nest-hero', style: `--egg-glow:${TRIBES[egg.tribe].palettes[0].accent}` },
        prog >= 1
          ? h('button', { class: 'nest-egg-tap', type: 'button', 'aria-label': `Tap to open the ${TRIBES[egg.tribe].name} egg`, onclick: () => hatchSequence(root) }, h('span', { class: 'ready-ring', 'aria-hidden': 'true' }), nestStage(svg(eggSvg(egg.tribe, prog, egg.seed), 'nest-egg ready'), { seed: egg.seed, warm: prog }), tapHand())
          : nestStage(svg(eggSvg(egg.tribe, prog, egg.seed), 'nest-egg wobble'), { seed: egg.seed, warm: prog }),
        bought ? h('p', { class: 'egg-landed', role: 'status' }, '🥚 Egg in your nest!') : null,
        h('h2', {}, `${TRIBES[egg.tribe].name} egg`),
        h('div', { class: 'warmth' + (prog >= 1 ? ' full' : ''), role: 'img', 'aria-label': `${pct(prog)} warm` }, h('span', { class: 'warmth-fill', style: `width:${pct(prog)}` }), h('b', { class: 'warmth-label', 'aria-hidden': 'true' }, prog >= 1 ? 'Ready!' : pct(prog))),
        prog >= 1
          ? button('Tap to open!', () => hatchSequence(root), 'btn big glow-btn open-btn')
          : h('p', { class: 'nest-keys' }, `${keysToHatch(p)} ${keysToHatch(p) === 1 ? 'key' : 'keys'} to hatch`),
        prog >= 1
          ? null
          : h(
              'div',
              { class: 'row center' },
              button('▶ Race to hatch', () => go(nextHatchRace()), 'btn big glow-btn'),
              button(`🔥 +${Math.round(WARM_SHARE * 100)}% warmth · ${WARM_PRICE}`, () => {
                if (!warmWithEmbers(p)) return;
                sfx.coin();
                persist();
                go(nest);
              }, 'btn ghost', canWarmWithEmbers(p) ? { title: `Use ${WARM_PRICE} embers to add ${Math.round(WARM_SHARE * 100)}% warmth` } : { disabled: true, title: `Costs ${WARM_PRICE} embers` }),
              canWarmWithEmbers(p) ? null : h('small', { class: 'warm-need' }, `Need ${Math.max(1, WARM_PRICE - p.embers)} more 🔥`),
            ),
      )
    : emptyNest();

  const goals = [
    ...UNITS.map((u) => ({ tribe: u.reward, label: `Finish the ${u.title} lessons`, done: p.unitsRewarded.includes(u.id) })),
    ...MILESTONES.map((m) => ({ tribe: m.tribe, label: milestoneText(m, p), done: p.milestones.includes(m.id) })),
  ];
  const scene = active ? aerieScene(p, svg(dragonSvg(active.tribe, active.palette, stageFor(active.xp), 'flap bob', active.skin, active.marking, active.stars), 'showcase-dragon')) : null;

  root.append(
    topBar(() => go(hub), 'Home'),
    h(
      'main',
      { class: 'nest' },
      h('h1', { class: 'sr-only' }, 'Nest'),
      dragonTabs('nest'),
      nestPanel,
      p.basket.length
        ? h(
            'section',
            {},
            h('h2', {}, `Eggs waiting (${p.basket.length})`),
            h(
              'div',
              { class: 'basket' },
              ...basketGroups(p).map(({ tribe: t, index: i, count }) =>
                h(
                  'button',
                  {
                    class: 'basket-egg',
                    type: 'button',
                    'aria-label': `Put ${count > 1 ? `one of your ${count} ${TRIBES[t].name} eggs` : `the ${TRIBES[t].name} egg`} in the nest`,
                    onclick: () => {
                      if (!swapNestEgg(p, i)) return;
                      sfx.click();
                      persist();
                      go(nest);
                    },
                  },
                  svg(eggSvg(t, 0, i + 11), 'mini-egg'),
                  count > 1 ? h('span', { class: 'egg-count', 'aria-hidden': 'true' }, `×${count}`) : null,
                  h('strong', {}, TRIBES[t].name),
                  h('small', {}, h('span', { class: 'up-arrow', 'aria-hidden': 'true' }, '⬆'), ' Put in nest'),
                ),
              ),
            ),
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
                  isStarglint(d)
                    ? h('strong', {}, d.name)
                    : button(h('span', { class: 'dc-name-wrap' }, h('span', { class: 'dc-name' }, d.name), d.stars ? h('span', { class: 'stars dc-stars', 'aria-label': `${d.stars} evolution stars` }, '★'.repeat(d.stars)) : null), () => (sfx.click(), renameSheet(d)), 'dc-rename', { 'aria-label': `Rename ${d.name}` }),
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
          : h('p', { class: 'fine' }, egg && prog >= 0.75 ? 'No dragons yet. Your first egg is almost ready!' : 'No dragons yet. Type in lessons and races to warm your egg!'),
      ),
      h(
        'section',
        { id: 'egg-goals' },
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
            h(
              'div',
              { class: 'shop' },
              ...DECOR.map((item) => {
                const owned = p.decor.includes(item.id);
                return h(
                  'div',
                  { class: 'shop-item' + (owned ? ' owned' : '') },
                  svg(decorThumb(item), 'shop-thumb'),
                  h('strong', {}, item.name),
                  owned
                    ? h('span', { class: 'shop-tag' }, '✓ Placed')
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
  const stopTabs = withTabs(root, 'dragons');
  if (autoHatch && egg && prog >= 1) hatchSequence(root);
  const stopNap = napOffscreen(root.querySelectorAll('.dragon-card'));
  return () => (stopNap(), stopTabs());
};

/**
 * Dragons scrolled out of view stop flapping until they come back, so a big nest
 * (a long-time rider can own over a hundred dragons) stays light on tablets.
 */
function napOffscreen(cards: NodeListOf<Element>): () => void {
  if (cards.length < 9 || typeof IntersectionObserver === 'undefined') return () => {};
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('asleep', !e.isIntersecting);
  }, { rootMargin: '200px 0px' });
  cards.forEach((c) => io.observe(c));
  return () => io.disconnect();
}

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
  // Light building up inside the shell: an egg-shaped white layer that brightens on the last tap.
  eggArt.append(h('div', { class: 'shell-light', 'aria-hidden': 'true', html: `<svg viewBox="0 0 100 120"><path d="${EGG_PATH}" fill="#fff8dc"/></svg>` }));
  // The holder trembles harder as the cracks grow; the shell inside it jolts on each tap.
  const holder = h('div', { class: 'egg-holder' }, eggArt);
  const eggBtn = h('button', { class: 'hatch-tap', type: 'button', 'aria-label': 'Tap to open the egg' });
  const hint = h('p', { class: 'tap-hint big', 'aria-live': 'polite' }, 'Tap to open');
  const pips = h('div', { class: 'tap-pips', 'aria-hidden': 'true' }, ...Array.from({ length: HATCH_TAPS }, () => h('span')));
  const hand = tapHand();
  const stage = nestStage(holder, { seed: egg.seed, warm: 1, cls: 'hatch-nest' });
  eggBtn.replaceChildren(stage, hand);
  const center = h('div', { class: 'hatch-center' }, eggBtn, hint, pips);
  const screen = h('div', { class: 'hatch-screen', style: `--glow:${glow}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': `${TRIBES[egg.tribe].name} egg` }, h('div', { class: 'hatch-rays' }), center);
  // Keyboard and screen readers stay inside the hatch screen until it closes.
  const behind = [...root.children] as HTMLElement[];
  behind.forEach((el) => (el.inert = true));
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
    if (taps > 2) hand.remove();
    hint.textContent = taps === HATCH_TAPS - 1 ? 'One more tap!' : taps < HATCH_TAPS ? `${HATCH_TAPS - taps} more taps` : '';
    // The last tap charges up: the egg shakes hard and glows from inside, then bursts.
    if (taps >= HATCH_TAPS) {
      holder.classList.add('charging');
      setTimeout(open, calm ? 0 : 560);
    }
  };
  screen.addEventListener('click', crack);
  crack();
  eggBtn.focus();

  function open(): void {
    screen.removeEventListener('click', crack);
    const before = earnedIds(p);
    const looksBefore = foundLooks(p);
    const name = randomDragonName();
    const first = firstHatch(p);
    const result = hatchNest(p, name)!;
    if (first && result.dragon) countUsage('new_rider', p);
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
    eggArt.replaceWith(halves);
    holder.classList.remove('charging');
    stage.classList.add('opened');
    hint.remove();
    pips.remove();
    screen.classList.add('opened');
    // A ring of light sweeps out from the egg, with crisp streaks instead of big soft blobs.
    // Reduced motion skips the big bursts. Confetti comes a beat later so the dragon reads first.
    if (!calm) {
      screen.append(h('div', { class: 'hatch-ring', 'aria-hidden': 'true', style: `left:${x}px;top:${y}px` }));
      fx.emit(x, y, { count: 46, colors: [...colors, glow, '#ffffff'], kind: 'streak', spread: 1100, size: 5, life: 0.9 });
      fx.emit(x, y, { count: 40, colors: [glow, '#ffffff'], kind: 'spark', spread: 620, size: 4, life: 1.3 });
      setTimeout(() => fx.emit(x, y, { count: 60, colors: CONFETTI, kind: 'confetti', vy: -260, spread: 520, size: 6, life: 2.4 }), 220);
    }
    sfx.hatch();

    // Rewards are short pills; the Codex and the trophy room hold the longer story.
    const extras = (): HTMLElement[] => {
      const pills = [
        ...sets.map((x) => h('span', { class: 'reward-pill', title: `${TRIBES[x.tribe].name} ${x.label.toLowerCase()}` }, `Set done +${x.embers} 🔥`)),
        // Two titles at most, then one pill for the rest, so the card never turns into a long list.
        ...fresh.slice(0, fresh.length > 3 ? 2 : 3).map((a) => h('span', { class: 'reward-pill', title: a.how }, svg(medalSvg(a.medal, a.icon), 'ach-mini'), `New title: ${a.title}`)),
        ...(fresh.length > 3 ? [h('span', { class: 'reward-pill', title: fresh.slice(2).map((a) => a.title).join(', ') }, `+${fresh.length - 2} more titles 🏆`)] : []),
      ];
      return pills.length ? [h('div', { class: 'reward-pills' }, ...pills)] : [];
    };
    const d = result.dragon;
    const stars = result.evolved && d ? (d.stars ?? 1) - 1 : 0;
    const art = d
      ? svg(dragonSvg(d.tribe, d.palette, result.evolved ? stageFor(d.xp) : 'hatchling', 'flap bob', result.evolved ? d.skin : undefined, d.marking, stars, 'portrait'), 'hatch-dragon reveal-art')
      : h('div', { class: 'reveal-art reveal-embers' }, '🔥');
    const palette = d ? paletteFor(d.tribe, d.palette) : null;
    const season = d ? isSeasonPalette(d.palette) : false;
    const headline = !d
      ? `+${MAXED_EMBERS} embers!`
      : result.evolved
        ? `${d.name} again!`
        : `${/^[AEIOU]/.test(TRIBES[d.tribe].name) ? 'An' : 'A'} ${TRIBES[d.tribe].name}!`;
    const sub = !d ? 'A warm handful of embers' : `${lookName(d.tribe, d.palette, d.marking)}${season ? ' · a season color' : palette?.rare ? ' · a rare color' : ''}`;
    const revealTitle = h('h2', { class: 'reveal-title', tabindex: '-1' }, headline);
    const reveal = h('div', { class: 'hatch-reveal' }, h('div', { class: 'reveal-stage' }, h('div', { class: 'reveal-glow', 'aria-hidden': 'true' }), art), revealTitle, h('p', { class: 'reveal-sub' }, sub));
    setTimeout(() => {
      // The shell halves and the nest keep flying off in place while the dragon appears,
      // so their animations finish instead of being cut short.
      const r = eggBtn.getBoundingClientRect();
      Object.assign(eggBtn.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, margin: '0', pointerEvents: 'none', zIndex: '1' });
      setTimeout(() => eggBtn.remove(), 650);
      center.append(reveal);
      revealTitle.focus();
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
      panel.append(art, ...(d ? dragonDetails(d, looksBefore) : embersDetails(egg.tribe)), ...extras(), h('div', { class: 'row' }, codexBtn, button('Done', () => go(nest), 'btn glow-btn')));
      reveal.replaceWith(panel);
      panel.querySelector<HTMLElement>('.row .glow-btn')?.focus();
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
  const nameEl = h('h2', { class: 'hatch-name' }, `Meet ${dragon.name}!`);
  const pickers = namePickers(dragon, (n) => (nameEl.textContent = `Meet ${n}!`));
  const tag = season ? 'Season color' : palette.rare ? 'Rare color' : isNewLook ? 'New look' : null;
  return [
    nameEl,
    h(
      'div',
      { class: 'hatch-tags' },
      h('span', { class: 'hatch-tag' }, `${lookName(dragon.tribe, dragon.palette, dragon.marking)} ${TRIBES[dragon.tribe].name}`),
      tag ? h('span', { class: 'hatch-tag shiny' }, `✨ ${tag}`) : null,
    ),
    pickers,
  ];
}

/** Splits a name into a start and an ending from the word lists (the longest start that fits). */
function splitName(name: string): [string, string] {
  const start = [...NAME_STARTS].sort((a, b) => b.length - a.length).find((s) => name.startsWith(s) && NAME_ENDS.includes(name.slice(s.length)));
  return start ? [start, name.slice(start.length)] : [NAME_STARTS[0], NAME_ENDS[0]];
}

/** Two word pickers and a dice button that rename `dragon` as they change. */
function namePickers(dragon: OwnedDragon, onName: (n: string) => void): HTMLElement {
  let [start, end] = splitName(dragon.name);
  const setName = (): void => {
    dragon.name = start + end;
    onName(dragon.name);
    persist();
  };
  const first = wordPicker({ words: NAME_STARTS, value: start, label: 'Name start', onChange: (v) => ((start = v), setName()), preview: (v) => v + end });
  const second = wordPicker({ words: NAME_ENDS, value: end, label: 'Name ending', onChange: (v) => ((end = v), setName()), preview: (v) => start + v });
  const dice = diceButton(() => {
    first.set(randomOf(NAME_STARTS.filter((w) => w !== start)));
    second.set(randomOf(NAME_ENDS.filter((w) => w !== end)));
  });
  return h('div', { class: 'name-pickers' }, h('span', { class: 'name-pencil', 'aria-hidden': 'true' }, '✏️'), h('div', { class: 'name-rows' }, first.el, second.el), dice);
}

/** Renaming a dragon later, from its card in the nest. */
function renameSheet(dragon: OwnedDragon): void {
  const nameEl = h('h2', { class: 'hatch-name' }, dragon.name);
  const close = (): void => {
    backdrop.remove();
    go(nest);
  };
  const backdrop = h(
    'div',
    { class: 'modal-backdrop', onclick: (e: Event) => e.target === backdrop && close() },
    h(
      'div',
      { class: 'modal rename', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Rename ${dragon.name}` },
      svg(dragonSvg(dragon.tribe, dragon.palette, stageFor(dragon.xp), 'flap', dragon.skin, dragon.marking, dragon.stars), 'modal-dragon'),
      nameEl,
      namePickers(dragon, (n) => (nameEl.textContent = n)),
      h('div', { class: 'row' }, button('Done', close, 'btn glow-btn')),
    ),
  );
  document.body.append(backdrop);
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
  const art = (n: number, cls: string): HTMLElement => svg(dragonSvg(d.tribe, d.palette, stage, cls, d.skin, d.marking, n, 'portrait'), 'hatch-dragon');
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
      h('div', { class: 'row' }, button('Done', () => go(nest), 'btn glow-btn')),
    );
    box.querySelector<HTMLElement>('.row .glow-btn')?.focus();
  }, 2300);
}
