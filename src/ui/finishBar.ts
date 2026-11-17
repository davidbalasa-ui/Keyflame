import { eggProgress } from '../game/progress';
import { go, profile } from './app';
import { button, h, pct } from './dom';
import { sfx } from './sound';
import { hub } from './screens/hub';
import { nest } from './screens/nest';

/**
 * The bar at the bottom of every finish screen (race and lesson results): Home and Nest
 * are always one tap away, and the big orange button keeps playing. Smaller extras, like
 * the course map or Try again, sit as chips above it.
 */
export function finishBar(primary: HTMLElement, extras: Array<HTMLElement | null> = [], opts: { nestGlow?: boolean } = {}): HTMLElement {
  const p = profile();
  const prog = p.nest ? eggProgress(p) : 0;
  const ready = !!p.nest && prog >= 1;
  const nestNote = ready ? 'Hatch!' : p.nest ? pct(prog) : '';
  const glow = ready || opts.nestGlow;
  const home = button(h('span', { class: 'fin-in' }, h('span', { class: 'fin-icon', 'aria-hidden': 'true' }, '🏠'), h('span', {}, 'Home')), () => (sfx.click(), go(hub)), 'btn ghost fin-btn fin-home');
  const nestBtn = button(
    h('span', { class: 'fin-in' }, h('span', { class: 'fin-icon', 'aria-hidden': 'true' }, '🥚'), h('span', {}, 'Nest'), nestNote ? h('small', { class: 'fin-note' }, nestNote) : null),
    () => (sfx.click(), go(nest)),
    `btn ghost fin-btn fin-nest${glow ? ' glow-btn lit' : ''}`,
    { 'aria-label': ready ? 'Nest: your egg is ready to hatch' : p.nest ? `Nest: egg ${pct(prog)} warm` : 'Nest' },
  );
  primary.classList.add('fin-go');
  const chips = extras.filter((e): e is HTMLElement => !!e);
  chips.forEach((c) => c.classList.add('fin-chip'));
  return h('div', { class: 'finish' }, chips.length ? h('div', { class: 'fin-chips' }, ...chips) : null, h('div', { class: 'fin-bar' }, home, nestBtn, primary));
}
