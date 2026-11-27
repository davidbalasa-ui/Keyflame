// A small live egg meter for races and lessons: it fills as the rider types, so the
// egg's progress is visible while it happens, not only on the results screen.

import { hatchNeed } from '../game/progress';
import type { Profile } from '../save/store';
import { h } from './dom';

export interface EggMeter {
  el: HTMLElement | null;
  /** Call with the correct keys typed so far in this session. Cheap to call every frame. */
  update(correct: number): void;
}

export function eggMeter(p: Profile | null): EggMeter {
  const nest = p?.nest;
  const need = p && nest ? hatchNeed(p, nest.tribe) : 0;
  if (!p || !nest || nest.warmth >= need) return { el: null, update: () => {} };
  const fill = h('span', {});
  const label = h('small', { class: 'egg-meter-label' });
  const el = h('div', { class: 'egg-meter', role: 'status', 'aria-live': 'off' }, h('span', { class: 'egg-meter-icon', 'aria-hidden': 'true' }, '🥚'), h('span', { class: 'egg-meter-bar', 'aria-hidden': 'true' }, fill), label);
  let shown = -1;
  const update = (correct: number): void => {
    const warm = Math.min(need, nest.warmth + correct);
    if (warm === shown) return;
    shown = warm;
    fill.style.width = `${((warm / need) * 100).toFixed(1)}%`;
    const left = need - warm;
    label.textContent = left > 0 ? `${left} to hatch` : 'Ready!';
    el.classList.toggle('ready', left === 0);
    el.setAttribute('aria-label', left > 0 ? `Egg: ${left} ${left === 1 ? 'key' : 'keys'} to hatch` : 'Egg ready to hatch');
  };
  update(0);
  return { el, update };
}
