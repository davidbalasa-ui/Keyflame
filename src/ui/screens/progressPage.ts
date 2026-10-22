import { ROWS } from '../../content/keyboard';
import { badges } from '../../game/badges';
import { go, profile } from '../app';
import { h, pct } from '../dom';
import { hub, topBar } from './hub';

/** Line chart of recent race speeds, oldest on the left. */
function wpmChart(points: number[]): HTMLElement {
  const W = 640, H = 220, left = 40, right = 16, top = 16, bottom = 28;
  const max = Math.max(10, ...points) * 1.15;
  const x = (i: number): number => left + (points.length === 1 ? 0 : (i / (points.length - 1)) * (W - left - right));
  const y = (v: number): number => top + (1 - v / max) * (H - top - bottom);
  // About five gridlines at a round step (1, 2 or 5 times a power of ten).
  const raw = max / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const el = h('div', { class: 'chart' });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Words per minute in your recent races">
    ${ticks.map((t) => `<line x1="${left}" x2="${W - right}" y1="${y(t)}" y2="${y(t)}" stroke="#4d3f8f" stroke-width="1"/><text x="${left - 8}" y="${y(t) + 4}" text-anchor="end" font-size="12" fill="#c3b8e8">${t}</text>`).join('')}
    <path d="${line}" fill="none" stroke="#ffb347" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#ffd43b"><title>${Math.round(v)} WPM</title></circle>`).join('')}
    <text x="${left}" y="${H - 6}" font-size="12" fill="#c3b8e8">older</text>
    <text x="${W - right}" y="${H - 6}" font-size="12" fill="#c3b8e8" text-anchor="end">latest</text>
  </svg>`;
  return el;
}

export const progressPage = (root: HTMLElement): void => {
  const p = profile();
  const recent = p.races.slice(0, 20).reverse();
  const all = badges(p);
  const errRate = (k: string): number | null => {
    const s = p.keyStats[k];
    if (!s || s.hits + s.misses < 8) return null;
    return s.misses / (s.hits + s.misses);
  };

  root.append(
    topBar(() => go(hub)),
    h(
      'main',
      { class: 'progress' },
      h('h1', {}, 'My progress'),
      h(
        'div',
        { class: 'stat-row' },
        h('div', { class: 'stat' }, h('strong', {}, String(Math.round(p.totals.bestWpm))), h('small', {}, 'Best WPM, keyboard')),
        h('div', { class: 'stat' }, h('strong', {}, String(Math.round(p.totals.bestTouchWpm))), h('small', {}, 'Best WPM, touch')),
        h('div', { class: 'stat' }, h('strong', {}, String(p.totals.races)), h('small', {}, 'Races')),
        h('div', { class: 'stat' }, h('strong', {}, String(Math.round(p.totals.minutes))), h('small', {}, 'Minutes practiced')),
      ),
      h('section', {}, h('h2', {}, 'Speed in recent races'), recent.length >= 2 ? wpmChart(recent.map((r) => r.wpm)) : h('p', { class: 'fine' }, 'Finish two races to see your speed chart.')),
      h(
        'section',
        {},
        h('h2', {}, 'Key accuracy'),
        h('p', { class: 'fine' }, 'Green keys are solid. Orange and red keys need a little more practice. Grey keys need more typing before we can tell.'),
        h(
          'div',
          { class: 'heat-keys' },
          ...ROWS.map((row) =>
            h(
              'div',
              { class: 'kb-row' },
              ...row.map((k) => {
                const r = errRate(k);
                const cls = r === null ? 'unknown' : r < 0.04 ? 'good' : r < 0.1 ? 'ok' : 'weak';
                return h('span', { class: `heat ${cls}`, title: r === null ? 'Not enough data' : `${pct(1 - r)} correct` }, k.toUpperCase());
              }),
            ),
          ),
        ),
      ),
      h(
        'section',
        {},
        h('h2', {}, `Badges (${all.filter((b) => b.earned).length} of ${all.length})`),
        h('div', { class: 'badge-grid' }, ...all.map((b) => h('div', { class: 'badge-card' + (b.earned ? ' earned' : '') }, h('span', { class: 'badge-icon' }, b.earned ? '★' : '☆'), h('strong', {}, b.name), h('small', {}, b.how)))),
      ),
    ),
  );
};
