// Small SVG line charts for the Progress tab and the Family view.

import { h } from './dom';

export interface ChartOptions {
  label: string;
  /** Text after a value in its tooltip, such as " WPM" or "%". */
  unit: string;
  /** Fixed top of the scale; otherwise it fits the data. */
  max?: number;
  min?: number;
  color?: string;
  /** Points drawn hollow, such as lessons among races. */
  hollow?: boolean[];
  compact?: boolean;
}

/** Line chart of values, oldest on the left. */
export function lineChart(points: number[], o: ChartOptions): HTMLElement {
  const compact = !!o.compact;
  const W = 640, H = compact ? 120 : 220, left = compact ? 8 : 40, right = compact ? 8 : 16, top = compact ? 10 : 16, bottom = compact ? 10 : 28;
  const min = o.min ?? 0;
  const max = o.max ?? Math.max(min + 10, ...points) * 1.15;
  const x = (i: number): number => left + (points.length === 1 ? (W - left - right) / 2 : (i / (points.length - 1)) * (W - left - right));
  const y = (v: number): number => top + (1 - (Math.max(min, v) - min) / (max - min)) * (H - top - bottom);
  // About five gridlines at a round step (1, 2 or 5 times a power of ten).
  const raw = (max - min) / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(t);
  const color = o.color ?? '#ffb347';
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const el = h('div', { class: 'chart' + (compact ? ' compact' : '') });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.label}">
    ${compact ? '' : ticks.map((t) => `<line x1="${left}" x2="${W - right}" y1="${y(t)}" y2="${y(t)}" stroke="#4d3f8f" stroke-width="1"/><text x="${left - 8}" y="${y(t) + 4}" text-anchor="end" font-size="12" fill="#c3b8e8">${t}</text>`).join('')}
    <path d="${line}" fill="none" stroke="${color}" stroke-width="${compact ? 4 : 3}" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${compact ? 5 : 4}" fill="${o.hollow?.[i] ? '#261d4a' : color}" stroke="${color}" stroke-width="2"><title>${Math.round(v)}${o.unit}</title></circle>`).join('')}
    ${compact ? '' : `<text x="${left}" y="${H - 6}" font-size="12" fill="#c3b8e8">older</text><text x="${W - right}" y="${H - 6}" font-size="12" fill="#c3b8e8" text-anchor="end">latest</text>`}
  </svg>`;
  return el;
}
