import { MARKINGS, TRIBES, dragonSvg, eggSvg, lookName, stageFor, type TribeId } from '../../game/dragons';
import { EGG_PRICE, MAX_BASKET, TOTAL_LOOKS, buyEgg, canBuyEgg, claimSets, codexSets, foundLooks, lookKey } from '../../game/collection';
import { MAX_STARS, MILESTONES, lookHolder } from '../../game/progress';
import { UNITS } from '../../content/lessons';
import { FACTS, TOPIC_LABEL, factById, type FactTopic } from '../../content/facts';
import { go, persist, profile } from '../app';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { hub, refreshEmbers, topBar } from './hub';
import { nest } from './nest';
import { SEASONS, pastSeasons, seasonAt } from '../../content/seasons';
import { SEASON_COLOR_CHANCE, VAULT_COLOR_CHANCE, seasonPalette } from '../../game/seasons';

type Filter = 'all' | 'found' | 'missing' | 'rare';
let filter: Filter = 'all';

/** Where the first egg of a tribe comes from. */
function eggHint(tribe: TribeId): string {
  if (tribe === 'emberback') return 'Every rider starts with an Emberback egg.';
  const unit = UNITS.find((u) => u.reward === tribe);
  if (unit) return `Pass every ${unit.title} lesson to earn this tribe’s first egg.`;
  const m = MILESTONES.find((x) => x.tribe === tribe);
  return m ? `${m.label} to earn this tribe’s first egg.` : 'Keep flying to find this tribe.';
}

export const codex = (root: HTMLElement): void => {
  const p = profile();
  // Sets finished before this screen existed, or by a bought egg, pay out here.
  const paid = claimSets(p);
  if (paid.length) {
    persist();
    sfx.coin();
  }
  const found = foundLooks(p);
  const sets = codexSets(p);

  const tribeSection = (tribe: TribeId): HTMLElement | null => {
    const t = TRIBES[tribe];
    const cards = t.palettes.flatMap((pal, i) =>
      MARKINGS.map((_, m) => {
        const n = found.get(lookKey(tribe, i, m)) ?? 0;
        const show = filter === 'all' || (filter === 'found' && n > 0) || (filter === 'missing' && n === 0) || (filter === 'rare' && pal.rare);
        if (!show) return null;
        return button(
          h(
            'span',
            { class: 'codex-card-in' },
            svg(dragonSvg(tribe, i, 'adult', '', undefined, m, n ? lookHolder(p, tribe, i, m)?.stars ?? 0 : 0), 'codex-art'),
            h('small', {}, n ? lookName(tribe, i, m) : '???'),
            pal.rare ? h('small', { class: 'rare' }, 'Rare') : null,
            n && lookHolder(p, tribe, i, m)?.stars ? h('span', { class: 'codex-count stars' }, '★'.repeat(lookHolder(p, tribe, i, m)!.stars!)) : null,
          ),
          () => (sfx.click(), root.append(lookPage(tribe, i, m))),
          'codex-card' + (n ? '' : ' unknown') + (pal.rare ? ' is-rare' : ''),
          { 'aria-label': n ? `${lookName(tribe, i, m)} ${t.name}` : `Unknown ${t.name} look` },
        );
      }),
    ).filter((c) => c !== null);
    if (!cards.length) return null;
    const mine = [...found.keys()].filter((k) => k.startsWith(tribe + ':')).length;
    const buy = canBuyEgg(p, tribe);
    return h(
      'section',
      { class: 'codex-tribe', id: `tribe-${tribe}` },
      h('div', { class: 'codex-head' }, h('h2', {}, t.name), h('span', { class: 'codex-found' }, `${mine} / ${MARKINGS.length * t.palettes.length}`)),
      h('p', { class: 'fine' }, `${t.home} · ${t.perk}`),
      h('p', {}, t.lore),
      h(
        'div',
        { class: 'codex-sets' },
        ...sets
          .filter((s) => s.tribe === tribe)
          .map((s) => h('div', { class: 'codex-set' + (s.done ? ' done' : '') }, h('strong', {}, `${s.done ? '✓ ' : ''}${s.label}`), h('span', { class: 'bar' }, h('span', { style: `width:${pct(s.have / s.need)}` })), h('small', {}, s.done ? `Done · earned ${s.embers} embers` : `${s.have} / ${s.need} · reward ${s.embers} embers`))),
      ),
      h('div', { class: 'codex-row' }, ...cards),
      buy === 'unknown'
        ? h('p', { class: 'fine' }, eggHint(tribe))
        : buy === 'maxed'
          ? h('p', { class: 'reward' }, `Every ${t.name} look is at full stars. Amazing! ${t.name} eggs are all done.`)
        : h(
            'div',
            { class: 'codex-buy' },
            svg(eggSvg(tribe, 0, 3), 'codex-egg'),
            h('div', {}, h('strong', {}, `${t.name} egg`), h('small', { class: 'fine' }, buy === 'full' ? `Your basket is full (${MAX_BASKET} eggs). Hatch one first.` : buy === 'embers' ? `Costs ${EGG_PRICE} embers. You have ${p.embers}. Race to earn more!` : `${EGG_PRICE} embers. Every egg could be a new look.`)),
            button(`🔥 ${EGG_PRICE}`, () => {
              if (!buyEgg(p, tribe)) return;
              sfx.coin();
              persist();
              refreshEmbers();
              root.append(eggBought(tribe));
            }, 'btn small', buy === 'ok' ? {} : { disabled: true }),
          ),
    );
  };

  const chip = (f: Filter, label: string): HTMLButtonElement =>
    button(label, () => {
      filter = f;
      go(codex);
    }, 'chip' + (filter === f ? ' on' : ''));

  const sections = (Object.keys(TRIBES) as TribeId[]).map(tribeSection).filter((s) => s !== null);
  root.append(
    topBar(() => go(hub)),
    h(
      'main',
      { class: 'codex' },
      h('h1', {}, 'Dragon Codex'),
      ...paid.map((x) => h('p', { class: 'codex-paid' }, `🧩 Codex set done: ${TRIBES[x.tribe].name} ${x.label.toLowerCase()}! +${x.embers} embers`)),
      h('div', { class: 'codex-total' }, h('p', {}, h('strong', {}, `${found.size} of ${TOTAL_LOOKS}`), ' dragon looks found'), h('span', { class: 'bar' }, h('span', { style: `width:${pct(found.size / TOTAL_LOOKS)}` }))),
      h('p', { class: 'fine' }, `Every tribe comes in ${TRIBES.emberback.palettes.length} colors and ${MARKINGS.length} patterns: ${MARKINGS.join(', ').toLowerCase()}. Hatch eggs to fill your Codex.`),
      factBook(p.factsSeen),
      h('div', { class: 'chips codex-filters' }, chip('all', 'All'), chip('found', 'Found'), chip('missing', 'Still to find'), chip('rare', 'Rare')),
      ...(sections.length ? sections : [h('p', { class: 'fine' }, filter === 'found' ? 'Hatch your first egg to start your Codex.' : 'Nothing here yet.')]),
      seasonVault(),
      starfireSpot(p.supporter),
    ),
  );
};

/** The Codex with one look's page already open (used by "See it in Codex" after a hatch). */
export const codexLook =
  (tribe: TribeId, palette: number, marking: number) =>
  (root: HTMLElement): void => {
    codex(root);
    root.append(lookPage(tribe, palette, marking));
  };

/** A page for one look: big art, the tribe's story, and your dragons that wear it. */
function lookPage(tribe: TribeId, palette: number, marking: number): HTMLElement {
  const p = profile();
  const t = TRIBES[tribe];
  const pal = t.palettes[palette];
  const mine = p.dragons.filter((d) => d.tribe === tribe && d.palette === palette && (d.marking ?? 0) === marking);
  const holder = lookHolder(p, tribe, palette, marking);
  const close = (): void => modal.remove();
  const modal = h(
    'div',
    { class: 'modal-backdrop', onclick: (e: Event) => e.target === modal && close() },
    h(
      'div',
      { class: 'modal look-page' + (mine.length ? '' : ' unknown') },
      svg(dragonSvg(tribe, palette, mine.length ? stageFor(Math.max(...mine.map((d) => d.xp))) : 'adult', mine.length ? 'flap bob' : '', undefined, marking, holder?.stars ?? 0), 'look-art'),
      holder?.stars ? h('p', { class: 'evo-stars small', 'aria-label': `${holder.stars} of ${MAX_STARS} stars` }, '★'.repeat(holder.stars) + '☆'.repeat(MAX_STARS - holder.stars)) : null,
      h('h2', {}, mine.length ? `${lookName(tribe, palette, marking)} ${t.name}` : `A ${t.name} still to find`),
      h('p', { class: 'look-tags' }, h('span', { class: 'tag' }, t.home), pal.rare ? h('span', { class: 'tag rare' }, 'Rare color') : null, h('span', { class: 'tag' }, `${MARKINGS[marking]} pattern`)),
      h('p', { class: 'fine' }, `Racing perk: ${t.perk}`),
      h('p', {}, t.lore),
      mine.length
        ? h('div', { class: 'look-mine' }, h('strong', {}, mine.length === 1 ? 'Your dragon with this look' : `Your ${mine.length} dragons with this look`), h('ul', {}, ...mine.map((d) => h('li', {}, `${d.name} · ${stageFor(d.xp)} · hatched ${new Date(d.hatchedAt).toLocaleDateString()}`))))
        : h('p', { class: 'fine' }, p.dragons.some((d) => d.tribe === tribe) ? `Hatch more ${t.name} eggs to find it. ${pal.rare ? 'Rare colors turn up about one egg in ten.' : ''}` : eggHint(tribe)),
      h('div', { class: 'row' }, button('Close', close)),
    ),
  );
  return modal;
}

function eggBought(tribe: TribeId): HTMLElement {
  const p = profile();
  const inNest = p.nest?.tribe === tribe && p.basket.length === 0;
  const modal = h(
    'div',
    { class: 'modal-backdrop' },
    h(
      'div',
      { class: 'modal' },
      svg(eggSvg(tribe, 0, 3), 'modal-egg wobble'),
      h('h2', {}, `A new ${TRIBES[tribe].name} egg!`),
      h('p', {}, inNest ? 'It is in your nest. Every correct key you type warms it up.' : 'It is waiting in your basket. Tap it in the Nest any time to warm it next.'),
      h('div', { class: 'row' }, button('Keep browsing', () => go(codex), 'btn ghost'), button('Go to nest', () => go(nest))),
    ),
  );
  return modal;
}

/**
 * Season colors found so far. This month's color hatches often; colors from
 * earlier seasons can still turn up now and then, so none is ever missed for good.
 */
function seasonVault(): HTMLElement | null {
  const p = profile();
  const now = seasonAt();
  const shown = [...(now ? [now] : []), ...pastSeasons().filter((s) => s !== now)];
  if (!shown.length) return null;
  const mine = (i: number) => p.dragons.filter((d) => d.palette === seasonPalette(SEASONS[i]));
  const found = shown.filter((s) => mine(SEASONS.indexOf(s)).length).length;
  return h(
    'section',
    { class: 'codex-tribe season-vault' },
    h('div', { class: 'codex-head' }, h('h2', {}, 'Starfall Vault'), h('span', { class: 'codex-found' }, `${found} / ${shown.length}`)),
    h('p', { class: 'fine' }, `Season colors work on any tribe. This month’s color hatches about one egg in ${Math.round(1 / SEASON_COLOR_CHANCE)}, and colors from earlier seasons still turn up about one egg in ${Math.round(1 / VAULT_COLOR_CHANCE)}.`),
    h(
      'div',
      { class: 'codex-row' },
      ...shown.map((s) => {
        const d = mine(SEASONS.indexOf(s))[0];
        return h(
          'div',
          { class: 'codex-card' + (d ? '' : ' unknown') },
          h(
            'span',
            { class: 'codex-card-in' },
            svg(dragonSvg(d?.tribe ?? 'emberback', seasonPalette(s), 'adult', '', undefined, d?.marking ?? 0), 'codex-art' + (d ? '' : ' dim')),
            h('small', {}, d ? s.color.name : '???'),
            h('small', { class: 'fine' }, s === now ? 'This month' : s.name),
          ),
        );
      }),
    ),
  );
}

/** Where the supporter skin will live once the pack is on sale. */
function starfireSpot(owned: boolean): HTMLElement {
  return h(
    'section',
    { class: 'codex-tribe starfire-spot' },
    h('div', { class: 'codex-head' }, h('h2', {}, 'Starfire skin'), h('span', { class: 'codex-found' }, owned ? 'Yours' : 'Supporter pack')),
    h(
      'div',
      { class: 'starfire-row' },
      svg(dragonSvg('emberback', 0, 'adult', owned ? 'flap bob' : '', 'starfire'), 'codex-art' + (owned ? '' : ' dim')),
      h('p', {}, owned ? 'Thank you for supporting Keyflame! Starfire works on any of your dragons.' : 'A special skin that works on any dragon. It will come with the optional supporter pack later. It only changes how a dragon looks, never how fast it flies.'),
    ),
  );
}

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
