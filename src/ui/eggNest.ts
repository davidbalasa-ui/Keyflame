import { nestBackSvg, nestFrontSvg } from '../game/art/nest';
import { h, svg } from './dom';

/**
 * An egg sitting down inside a twig nest: back rim, the egg, then the front bowl over
 * its bottom. A soft warm glow behind it grows with `warm` (0 to 1). The glow is a
 * plain gradient (no filter), so it is cheap on iPads.
 */
export function nestStage(egg: HTMLElement, opts: { seed?: number; warm?: number; cls?: string } = {}): HTMLDivElement {
  const warm = Math.max(0, Math.min(1, opts.warm ?? 0));
  egg.classList.add('nest-stage-egg');
  return h(
    'div',
    { class: `nest-stage ${opts.cls ?? ''}${warm >= 1 ? ' ready' : ''}`, style: `--warm:${warm.toFixed(2)}` },
    h('div', { class: 'nest-stage-glow', 'aria-hidden': 'true' }),
    svg(nestBackSvg(opts.seed ?? 1), 'nest-layer'),
    egg,
    svg(nestFrontSvg(opts.seed ?? 1), 'nest-layer front'),
  );
}
