import { eggProgress } from '../game/progress';
import { go, profile } from './app';
import { button, h, pct } from './dom';
import { sfx } from './sound';
import { hub } from './screens/hub';
import { hatchNow, nest } from './screens/nest';
import { eggToBuy } from '../game/collection';

/**
 * The bar at the bottom of every finish screen (race and lesson results): Home and Nest
 * are always one tap away, and the big orange button keeps playing. Smaller extras, like
 * the course map or Try again, sit as chips above it.
 */
export function finishBar(primary: HTMLElement, extras: Array<HTMLElement | null> = [], opts: { nestGlow?: boolean; keepPrimary?: boolean } = {}): HTMLElement {
  const p = profile();
  const prog = p.nest ? eggProgress(p) : 0;
  const ready = !!p.nest && prog >= 1;
  const buyNow = eggToBuy(p);
  const nestNote = ready ? '' : p.nest ? pct(prog) : buyNow ? 'Get egg' : '';
  const glow = ready || buyNow || opts.nestGlow;
  const home = button(h('span', { class: 'fin-in' }, h('span', { class: 'fin-icon', 'aria-hidden': 'true' }, '🏠'), h('span', {}, 'Home')), () => (sfx.click(), go(hub)), 'btn ghost fin-btn fin-home');
  const nestBtn = button(
    // A ready egg: the button says Hatch and cracks it open right away.
    h('span', { class: 'fin-in' }, h('span', { class: 'fin-icon', 'aria-hidden': 'true' }, ready ? '🐣' : '🥚'), h('span', {}, ready ? 'Hatch!' : 'Nest'), nestNote ? h('small', { class: 'fin-note' }, nestNote) : null),
    () => (sfx.click(), ready ? hatchNow() : go(nest)),
    `btn ${ready ? '' : 'ghost '}fin-btn fin-nest${glow ? ' glow-btn lit' : ''}${ready ? ' hatch-ready' : ''}`,
    { 'aria-label': ready ? 'Hatch your egg' : buyNow ? 'Nest: get an egg' : p.nest ? `Nest: egg ${pct(prog)} warm` : 'Nest' },
  );
  primary.classList.add('fin-go');
  // A ready egg is the main thing to do next: Hatch! takes the big slot, the usual button steps aside.
  if (ready && !opts.keepPrimary) {
    primary.classList.add('ghost', 'fin-second');
    nestBtn.classList.add('fin-hatch-main');
    return h('div', { class: 'finish' }, chipsRow(extras), h('div', { class: 'fin-bar hatch-first' }, home, primary, nestBtn));
  }
  return h('div', { class: 'finish' }, chipsRow(extras), h('div', { class: 'fin-bar' }, home, nestBtn, primary));
}

function chipsRow(extras: Array<HTMLElement | null>): HTMLElement | null {
  const chips = extras.filter((e): e is HTMLElement => !!e);
  chips.forEach((c) => c.classList.add('fin-chip'));
  return chips.length ? h('div', { class: 'fin-chips' }, ...chips) : null;
}
