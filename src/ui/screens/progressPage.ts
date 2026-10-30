import { ROWS } from '../../content/keyboard';
import { achievements } from '../../game/achievements';
import { lessonsPassed, personalBests, recentAccuracy, recentAccuracySeries, recentSessions, unitProgress } from '../../game/riderStats';
import type { Profile } from '../../save/store';
import { go, profile } from '../app';
import { lineChart } from '../charts';
import { button, h, pct } from '../dom';
import { sfx } from '../sound';
import { withTabs } from '../tabBar';
import { achievementsPage } from './achievementsPage';
import { classRaceEntry } from './classroom';
import { hub, topBar } from './hub';

const stat = (value: string, label: string, note = ''): HTMLElement =>
  h('div', { class: 'stat-tile' }, h('small', {}, label), h('strong', {}, value), note ? h('small', { class: 'st-note' }, note) : null);

/** Speed and accuracy charts plus lesson stars, shared with the Family view. */
export function progressCharts(p: Profile): Array<HTMLElement | null> {
  const recent = recentSessions(p, 20);
  const hollow = recent.map((r) => r.kind === 'lesson');
  // Relaxed lessons have no speed, but their accuracy belongs on the chart.
  const accs = recentAccuracySeries(p, 20);
  return [
    h(
      'section',
      { class: 'pg-card' },
      h('h2', {}, 'Speed'),
      recent.length >= 2
        ? lineChart(recent.map((r) => r.wpm), { label: 'Words per minute in recent races and lessons', unit: ' WPM', hollow })
        : h('p', { class: 'fine' }, 'Finish two races or lessons to see your chart.'),
      recent.length >= 2 ? h('p', { class: 'chart-key fine' }, h('span', { class: 'dot full' }), 'Race ', h('span', { class: 'dot hollow' }), 'Lesson') : null,
    ),
    accs.length >= 2
      ? h('section', { class: 'pg-card' }, h('h2', {}, 'Accuracy'), lineChart(accs.map((r) => r.accuracy * 100), { label: 'Accuracy in recent races and lessons', unit: '%', min: 50, max: 100, color: '#5ee6a8', hollow: accs.map((r) => r.kind === 'lesson') }))
      : null,
    h(
      'section',
      { class: 'pg-card' },
      h('h2', {}, 'Lessons'),
      h(
        'div',
        { class: 'unit-bars' },
        ...unitProgress(p).map((u) =>
          h('div', { class: 'unit-bar' }, h('span', { class: 'ub-title' }, u.title), h('span', { class: 'bar wide' }, h('span', { style: `width:${u.total ? pct(u.passed / u.total) : '0%'}` })), h('span', { class: 'ub-stars' }, `★ ${u.stars}/${u.total * 3}`)),
        ),
      ),
    ),
  ];
}

export const progressPage = (root: HTMLElement): (() => void) => {
  const p = profile();
  const all = achievements(p);
  const earned = all.filter((a) => a.earned).length;
  const unseen = p.achievements ? all.filter((a) => a.earned && !p.achievements!.includes(a.id)).length : 0;
  const best = personalBests(p);
  const acc = recentAccuracy(p);
  const lessons = lessonsPassed(p);
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
      h(
        'div',
        { class: 'pg-head' },
        h('h1', {}, 'My progress'),
        p.classBadge ? button(`🐉 My wing #${p.classBadge}`, () => (sfx.click(), go(classRaceEntry())), 'class-pill') : null,
      ),
      h(
        'div',
        { class: 'stat-tiles' },
        stat(String(Math.max(best.keyboardWpm, best.touchWpm)), 'Top speed', 'WPM'),
        stat(acc === null ? '–' : pct(acc), 'Accuracy', 'Last 10'),
        stat(`${lessons.passed}/${lessons.total}`, 'Lessons'),
        stat(String(best.streak), 'Day streak', best.bestStreak > best.streak ? `Best ${best.bestStreak}` : ''),
        stat(String(p.totals.races), 'Races', best.wins ? `${best.wins} wins` : ''),
        stat(String(Math.round(p.totals.minutes)), 'Minutes'),
      ),
      button(
        h('span', { class: 'ach-card-in' }, h('span', { class: 'ach-trophy', 'aria-hidden': 'true' }, '🏆'), h('span', {}, h('strong', {}, 'Achievements'), h('small', {}, `${earned} of ${all.length}`)), unseen ? h('span', { class: 'tab-badge static' }, `${unseen} new`) : null, h('span', { class: 'play-card-go', 'aria-hidden': 'true' }, '›')),
        () => (sfx.click(), go(achievementsPage)),
        'ach-link',
      ),
      ...progressCharts(p),
      h(
        'section',
        { class: 'pg-card' },
        h('h2', {}, 'Personal bests'),
        h(
          'div',
          { class: 'stat-tiles small' },
          stat(String(best.keyboardWpm), 'Keyboard', 'WPM'),
          stat(String(best.touchWpm), 'Touch', 'WPM'),
          stat(best.bestAccuracy === null ? '–' : pct(best.bestAccuracy), 'Best accuracy'),
          stat(String(best.bestStreak), 'Longest streak', 'days'),
        ),
      ),
      h(
        'section',
        { class: 'pg-card' },
        h('h2', {}, 'Key accuracy'),
        h('p', { class: 'chart-key fine' }, h('span', { class: 'dot good' }), 'Solid ', h('span', { class: 'dot weak' }), 'Practice ', h('span', { class: 'dot unknown' }), 'Not sure yet'),
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
    ),
  );
  return withTabs(root, 'progress');
};
