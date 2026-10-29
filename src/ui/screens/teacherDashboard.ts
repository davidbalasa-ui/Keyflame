// The teacher's Progress tab: every badge in the class, how each rider's speed and accuracy
// move over time, which lessons they have passed, and the class week by week. The names a
// teacher gives badges stay on the teacher's device only; the server knows just the numbers.

import { LESSONS } from '../../content/lessons';
import { lastActive, mergeRoster, nextBadge, riderNotes, ridersCsv, spacedCode, speedTrend, weekCompare, weekLabel, type DashRow, type Trend } from '../../game/classroom';
import { removeRider, teacherRiderActivity, teacherRiders, teacherWeeks, type ActivityRow, type RiderRow, type TeacherClass, type WeekRow } from '../../net/classApi';
import { button, h, pct } from '../dom';

const ROSTER_KEY = 'keyflame-teacher-roster';
const MAX_NAME = 40;

/** Badge number -> the teacher's name for that student. */
export type Roster = Record<number, string>;

export function readRoster(): Roster {
  try {
    const raw = JSON.parse(localStorage.getItem(ROSTER_KEY) ?? '{}') as unknown;
    if (!raw || typeof raw !== 'object') return {};
    const out: Roster = {};
    for (const [k, v] of Object.entries(raw)) if (Number(k) >= 1 && Number(k) <= 99 && typeof v === 'string') out[Number(k)] = v;
    return out;
  } catch {
    return {};
  }
}

export function writeRoster(r: Roster): void {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(r));
  } catch {
    // Private browsing: names last until the page closes.
  }
}

const RETIRED_KEY = 'keyflame-teacher-retired';

/** Badge numbers of deleted students. They are never handed out again, so old results and sheets can't mix up. */
export function readRetired(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RETIRED_KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? raw.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 99) : [];
  } catch {
    return [];
  }
}

export function writeRetired(list: number[]): void {
  try {
    localStorage.setItem(RETIRED_KEY, JSON.stringify([...new Set(list)].sort((a, b) => a - b)));
  } catch {
    // Private browsing.
  }
}

function setStudent(badge: number, name: string): void {
  const r = readRoster();
  if (name) r[badge] = name.slice(0, MAX_NAME);
  else delete r[badge];
  writeRoster(r);
}

const TREND_MARK: Record<Trend, { icon: string; label: string }> = {
  up: { icon: '▲', label: 'getting faster' },
  down: { icon: '▼', label: 'slower lately' },
  flat: { icon: '●', label: 'steady' },
};

const wpmText = (n: number | null): string => (n === null ? '–' : String(Math.round(n)));
const lessonTitle = (id: string | null): string => LESSONS.find((l) => l.id === id)?.title ?? 'Lesson';

function trendChip(r: RiderRow): HTMLElement | null {
  const t = speedTrend(r.recent_wpm, r.prev_wpm);
  if (!t) return null;
  return h('span', { class: `trend trend-${t}`, title: TREND_MARK[t].label, 'aria-label': TREND_MARK[t].label }, TREND_MARK[t].icon);
}

/** Bars of the class's average speed per week, with how many riders played. */
function weekChart(weeks: WeekRow[]): HTMLElement {
  const timed = weeks.filter((w) => w.avg_wpm !== null).slice(-8);
  if (!timed.length) return h('p', { class: 'fine' }, 'The chart fills in as riders play.');
  const top = Math.max(10, ...timed.map((w) => w.avg_wpm ?? 0));
  return h(
    'ol',
    { class: 'week-chart', 'aria-label': 'Class average speed by week' },
    ...timed.map((w) =>
      h(
        'li',
        { 'aria-label': `Week of ${weekLabel(w.week)}: ${Math.round(w.avg_wpm ?? 0)} WPM average, ${w.riders} riders` },
        h('span', { class: 'wc-val' }, String(Math.round(w.avg_wpm ?? 0))),
        h('span', { class: 'wc-bar', style: `height:${Math.max(4, ((w.avg_wpm ?? 0) / top) * 100).toFixed(0)}%` }),
        h('small', { class: 'wc-week' }, weekLabel(w.week)),
        h('small', { class: 'wc-riders' }, `${w.riders} ${w.riders === 1 ? 'rider' : 'riders'}`),
      ),
    ),
  );
}

function statTile(label: string, value: string, note = ''): HTMLElement {
  return h('div', { class: 'stat-tile' }, h('small', {}, label), h('strong', {}, value), note ? h('small', { class: 'st-note' }, note) : null);
}

function classTiles(riders: RiderRow[], weeks: WeekRow[], students: number): HTMLElement {
  const { thisWeek, lastWeek } = weekCompare(weeks);
  const speedNote =
    thisWeek?.avg_wpm != null && lastWeek?.avg_wpm != null
      ? `${thisWeek.avg_wpm >= lastWeek.avg_wpm ? '▲' : '▼'} ${Math.abs(Math.round(thisWeek.avg_wpm - lastWeek.avg_wpm))} from last week`
      : '';
  return h(
    'div',
    { class: 'stat-tiles' },
    statTile('Joined', `${riders.length} of ${Math.max(students, riders.length)}`),
    statTile('Played this week', String(thisWeek?.riders ?? 0), `${thisWeek?.sessions ?? 0} lessons and races`),
    statTile('Speed this week', thisWeek?.avg_wpm != null ? `${Math.round(thisWeek.avg_wpm)} WPM` : '–', speedNote),
    statTile('Accuracy this week', thisWeek ? pct(thisWeek.avg_accuracy) : '–'),
  );
}

/** A small line of a rider's speed, oldest on the left. */
function sparkline(rows: ActivityRow[]): HTMLElement {
  const pts = rows.filter((r) => r.wpm !== null).slice(0, 30).reverse();
  if (pts.length < 2) return h('p', { class: 'fine' }, 'A speed line shows after two timed lessons or races.');
  const W = 300;
  const H = 80;
  const top = Math.max(10, ...pts.map((r) => r.wpm ?? 0)) * 1.1;
  const xy = pts.map((r, i) => [(i / (pts.length - 1)) * W, H - ((r.wpm ?? 0) / top) * H] as const);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lx, ly] = xy[xy.length - 1];
  const el = h('div', { class: 'spark', role: 'img', 'aria-label': `Speed over the last ${pts.length} timed sessions, from ${Math.round(pts[0].wpm ?? 0)} to ${Math.round(pts[pts.length - 1].wpm ?? 0)} WPM` });
  el.innerHTML = `<svg viewBox="-4 -6 ${W + 8} ${H + 12}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="var(--gold)"/></svg>`;
  return el;
}

/** Best stars per lesson, from the rider's class history. */
function lessonGrid(rows: ActivityRow[]): HTMLElement {
  const best = new Map<string, number>();
  for (const r of rows) if (r.kind === 'lesson' && r.lesson) best.set(r.lesson, Math.max(best.get(r.lesson) ?? 0, r.stars ?? 0));
  return h(
    'ol',
    { class: 'lesson-dots' },
    ...LESSONS.map((l, i) => {
      const s = best.get(l.id);
      return h(
        'li',
        { class: s === undefined ? 'lg-none' : s > 0 ? 'lg-pass' : 'lg-tried', title: l.title, 'aria-label': `${l.title}: ${s === undefined ? 'not played' : `${s} of 3 stars`}` },
        h('span', {}, String(i + 1)),
        h('small', {}, s === undefined ? '' : s > 0 ? '★'.repeat(s) : '·'),
      );
    }),
  );
}

function activityList(rows: ActivityRow[]): HTMLElement {
  if (!rows.length) return h('p', { class: 'fine' }, 'Nothing played in this class yet.');
  return h(
    'ul',
    { class: 'activity-list' },
    ...rows.slice(0, 25).map((r) =>
      h(
        'li',
        {},
        h('span', { class: 'al-when' }, lastActive(r.created_at)),
        h(
          'span',
          { class: 'al-what' },
          r.kind === 'lesson' ? `${lessonTitle(r.lesson)} ${r.stars ? '★'.repeat(r.stars) : ''}` : r.kind === 'class' ? `Class race · #${r.place ?? '?'} of ${r.racers ?? '?'}` : 'Race',
        ),
        h('span', { class: 'al-num' }, r.wpm === null ? 'relaxed' : `${Math.round(r.wpm)} WPM`, ` · ${pct(r.accuracy)} `, r.touch ? 'touch screen' : 'keyboard'),
      ),
    ),
  );
}

type Row = DashRow<RiderRow>;

const nameOf = (r: Row): string => r.student || r.rider?.name || 'Not joined yet';

/** One badge up close: the teacher's name for it, progress, and Remove. */
function riderSheet(t: TeacherClass, row: Row, changed: () => void): HTMLElement {
  const r = row.rider;
  const nameInput = h('input', { type: 'text', class: 'label-input', maxlength: MAX_NAME, value: row.student, placeholder: 'Student name', autocomplete: 'off', 'aria-label': `Student name for badge ${row.badge}` });
  const body = h('div', {}, r ? h('p', { class: 'fine' }, 'Loading…') : h('p', { class: 'fine' }, `Badge ${row.badge} hasn’t joined yet. They open Race → Class race and type ${spacedCode(t.code)} and ${row.badge}.`));
  const badgeInput = h('input', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 2, class: 'label-input badge-edit', value: String(row.badge), autocomplete: 'off', 'aria-label': 'Badge number' });
  const msg = h('p', { class: 'fine rs-msg', role: 'status' });
  const close = (): void => {
    const name = nameInput.value.trim();
    const to = Number(badgeInput.value.trim());
    if (to !== row.badge) {
      // Fixing a mix-up: the name moves to another number. Results stay with each number,
      // because that is what the student types.
      const roster = readRoster();
      if (!Number.isInteger(to) || to < 1 || to > 99) return void (msg.textContent = 'A badge number is 1 to 99.');
      if (readRetired().includes(to)) return void (msg.textContent = `Badge ${to} belonged to a deleted student and isn’t used again.`);
      if (!name) return void (msg.textContent = 'Type a name to move it to another badge.');
      const other = roster[to];
      if (other && !confirm(`Badge ${to} is ${other}. Swap ${name} and ${other}?`)) return;
      if (!other && !confirm(`Move ${name} to badge ${to}? ${name} then types ${to} to join, and results already under ${row.badge} stay with ${row.badge}.`)) return;
      if (other) roster[row.badge] = other;
      else delete roster[row.badge];
      roster[to] = name.slice(0, MAX_NAME);
      writeRoster(roster);
    } else setStudent(row.badge, name);
    sheet.remove();
    changed();
  };
  const sheet = h(
    'div',
    { class: 'modal-backdrop', onclick: (e: Event) => e.target === sheet && close() },
    h(
      'div',
      { class: 'modal rider-sheet', role: 'dialog', 'aria-label': `Badge ${row.badge}` },
      h('div', { class: 'rs-head' }, h('h2', {}, h('span', { class: 'badge-num big' }, String(row.badge)), ' ', row.student || r?.name || `Badge ${row.badge}`), button('Done', close, 'btn small')),
      r && row.student ? h('p', { class: 'fine rs-rider' }, `Rider name: ${r.name}`) : null,
      h(
        'div',
        { class: 'rs-edit' },
        h('label', { class: 'rs-label' }, h('span', {}, 'Student name'), nameInput),
        h('label', { class: 'rs-label rs-badge' }, h('span', {}, 'Badge'), badgeInput),
      ),
      h('small', { class: 'fine' }, 'Names stay on your device and in your locked backup. Keyflame only sees the number.'),
      msg,
      r
        ? h(
            'div',
            { class: 'stat-tiles small' },
            statTile('Best', `${wpmText(r.best_wpm)} WPM`),
            statTile('Last 5', `${wpmText(r.recent_wpm)} WPM`),
            statTile('Accuracy', r.recent_accuracy === null ? '–' : pct(r.recent_accuracy)),
            statTile('Days played', String(r.active_days)),
          )
        : null,
      body,
      h(
        'p',
        { class: 'center' },
        button('Delete student', () => {
          const who = nameOf(row);
          if (!confirm(`Delete ${who} (badge ${row.badge})? ${r ? 'Their lessons and races in this class are deleted for good. ' : ''}Badge ${row.badge} won’t be given out again.`)) return;
          const done = (): void => {
            setStudent(row.badge, '');
            writeRetired([...readRetired(), row.badge]);
            sheet.remove();
            changed();
          };
          if (r) void removeRider(t, r.id).then(done, () => alert('Can’t reach Keyflame right now. Check the Wi-Fi.'));
          else done();
        }, 'btn ghost small danger'),
      ),
    ),
  );
  if (r)
    teacherRiderActivity(t, r.id)
      .then((rows) =>
        body.replaceChildren(
          h('h3', {}, 'Speed over time'),
          sparkline(rows),
          h('h3', {}, `Lessons passed: ${r.lessons_passed} of ${LESSONS.length}`),
          lessonGrid(rows),
          h('h3', {}, 'Recent'),
          activityList(rows),
        ),
      )
      .catch(() => body.replaceChildren(h('p', { class: 'fine' }, 'Can’t load this rider right now. Check the Wi-Fi.')));
  return sheet;
}

type SortKey = 'badge' | 'name' | 'speed' | 'active' | 'lessons';
const SORTS: Array<[SortKey, string]> = [['badge', '#'], ['name', 'Name'], ['speed', 'Speed'], ['lessons', 'Lessons'], ['active', 'Last active']];

function sortRows(rows: Row[], key: SortKey): Row[] {
  const out = [...rows];
  if (key === 'name') out.sort((a, b) => nameOf(a).toLowerCase().localeCompare(nameOf(b).toLowerCase()));
  if (key === 'speed') out.sort((a, b) => (b.rider?.recent_wpm ?? -1) - (a.rider?.recent_wpm ?? -1));
  if (key === 'lessons') out.sort((a, b) => (b.rider?.lessons_passed ?? -1) - (a.rider?.lessons_passed ?? -1));
  if (key === 'active') out.sort((a, b) => (b.rider?.last_seen ?? '').localeCompare(a.rider?.last_seen ?? ''));
  return out;
}

function riderTable(rows: Row[], sort: SortKey, open: (r: Row) => void): HTMLElement {
  if (!rows.length) return h('p', { class: 'fine board-empty' }, 'No students yet. Add them below, then hand out badge numbers.');
  return h(
    'ul',
    { class: 'rider-table' },
    h('li', { class: 'rt-head', 'aria-hidden': 'true' }, h('span', {}, 'Student'), h('span', {}, 'Lessons'), h('span', {}, 'Speed'), h('span', {}, 'Accuracy'), h('span', {}, 'Last active')),
    ...sortRows(rows, sort).map((row) => {
      const r = row.rider;
      const notes = r ? riderNotes(r) : [];
      return h(
        'li',
        { class: r ? '' : 'rt-waiting' },
        h(
          'button',
          { type: 'button', class: 'rt-row', onclick: () => open(row) },
          h(
            'span',
            { class: 'rt-name' },
            h('span', { class: 'rt-who' }, h('span', { class: 'badge-num' }, String(row.badge)), h('strong', {}, row.student || r?.name || '')),
            h('small', {}, r ? (row.student ? r.name : 'Tap to add a name') : 'Not joined yet'),
            ...notes.map((n) => h('small', { class: 'rt-note' }, n)),
          ),
          h(
            'span',
            { class: 'rt-lessons', 'aria-label': r ? `${r.lessons_passed} of ${LESSONS.length} lessons passed` : 'No lessons yet' },
            h('span', { class: 'rt-meter' }, h('span', { style: `width:${(((r?.lessons_passed ?? 0) / LESSONS.length) * 100).toFixed(0)}%` })),
            h('small', {}, r ? `${r.lessons_passed}/${LESSONS.length}` : '–'),
          ),
          h('span', { class: 'rt-speed' }, h('strong', {}, wpmText(r?.recent_wpm ?? null)), h('small', {}, ' WPM '), r ? trendChip(r) : null),
          h('span', { class: 'rt-acc' }, r?.recent_accuracy == null ? '–' : pct(r.recent_accuracy)),
          h('span', { class: 'rt-seen' }, r ? lastActive(r.last_seen) : '–'),
        ),
      );
    }),
  );
}

export function download(name: string, text: string, type = 'text/csv'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printView(...content: HTMLElement[]): void {
  const close = (): void => {
    sheet.remove();
    document.body.classList.remove('printing');
  };
  const sheet = h('div', { class: 'print-sheet' }, h('div', { class: 'print-bar' }, button('Print', () => window.print()), button('Close', close, 'btn ghost')), ...content);
  document.body.classList.add('printing');
  document.body.append(sheet);
}

const rosterList = (roster: Roster): Array<[number, string]> => Object.entries(roster).map(([b, n]) => [Number(b), n] as [number, string]).sort((a, b) => a[0] - b[0]);

/** The teacher's paper copy: the code and every badge number with its student. */
export function classSheet(t: TeacherClass, roster: Roster): void {
  printView(
    h(
      'div',
      { class: 'class-sheet' },
      h('h1', {}, 'Keyflame class sheet'),
      h('p', {}, 'Class code ', h('b', { class: 'cs-code' }, spacedCode(t.code)), ` · printed ${new Date().toLocaleDateString()}`),
      h('p', { class: 'cs-keep' }, 'Keep this sheet safe. It is the paper copy of which badge number belongs to which student.'),
      h(
        'table',
        {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Badge'), h('th', {}, 'Student'))),
        h('tbody', {}, ...rosterList(roster).map(([b, n]) => h('tr', {}, h('td', {}, String(b)), h('td', {}, n)))),
      ),
      h('p', {}, 'Students: open keyflame.org → Race → Class race → type the class code and your badge number.'),
    ),
  );
}

/** Cards with the class code and each student's badge number, to cut out and hand out. */
export function badgeCards(t: TeacherClass, roster: Roster): void {
  printView(
    h(
      'div',
      { class: 'badge-cards' },
      ...rosterList(roster).map(([badge, name]) =>
        h(
          'div',
          { class: 'badge-card' },
          h('small', {}, 'Keyflame · keyflame.org'),
          h('strong', { class: 'bc-name' }, name),
          h('div', { class: 'bc-row' }, h('span', {}, 'Class code'), h('b', {}, spacedCode(t.code))),
          h('div', { class: 'bc-row' }, h('span', {}, 'Badge'), h('b', { class: 'bc-badge' }, String(badge))),
          h('small', {}, 'Race → Class race → type both'),
        ),
      ),
    ),
  );
}

interface BackupFile {
  keyflame: 'teacher-backup';
  v: 1;
  code: string;
  key: string;
  roster: Roster;
  retired?: number[];
}

/** A file with everything needed to open the class again: code, teacher key and names. */
export function saveBackupFile(t: TeacherClass): void {
  const b: BackupFile = { keyflame: 'teacher-backup', v: 1, code: t.code, key: t.key, roster: readRoster(), retired: readRetired() };
  download(`keyflame-class-${t.code}-backup.json`, JSON.stringify(b, null, 1), 'application/json');
}

export function readBackupFile(text: string): { code: string; key: string; roster: Roster; retired: number[] } | null {
  try {
    const b = JSON.parse(text) as Partial<BackupFile>;
    if (b.keyflame !== 'teacher-backup' || typeof b.code !== 'string' || !/^[A-Z]{6}$/.test(b.code) || typeof b.key !== 'string') return null;
    const roster: Roster = {};
    for (const [k, v] of Object.entries(b.roster ?? {})) if (Number(k) >= 1 && Number(k) <= 99 && typeof v === 'string') roster[Number(k)] = v.slice(0, MAX_NAME);
    const retired = Array.isArray(b.retired) ? b.retired.filter((n) => Number.isInteger(n) && n >= 1 && n <= 99) : [];
    return { code: b.code, key: b.key, roster, retired };
  } catch {
    return null;
  }
}

/** The Progress tab. Refreshes itself every half minute while it is showing. */
export function progressPanel(t: TeacherClass, rosterChanged: () => void): { el: HTMLElement; refresh: () => void; stop: () => void } {
  let riders: RiderRow[] = [];
  let sort: SortKey = 'badge';
  const tiles = h('div', {});
  const chart = h('div', {});
  const table = h('div', {}, h('p', { class: 'fine' }, 'Loading…'));
  const status = h('p', { class: 'fine', role: 'status' });
  const sortBar = h('div', { class: 'seg small', role: 'group', 'aria-label': 'Sort students' });
  const rows = (): Row[] => mergeRoster(readRoster(), riders);

  const drawTable = (): void => {
    sortBar.replaceChildren(
      ...SORTS.map(([k, label]) => button(label, () => ((sort = k), drawTable()), `seg-btn${k === sort ? ' on' : ''}`, { 'aria-pressed': String(k === sort), 'aria-label': k === 'badge' ? 'Badge' : label })),
    );
    table.replaceChildren(
      riderTable(rows(), sort, (r) =>
        el.append(
          riderSheet(t, r, () => {
            rosterChanged();
            refresh();
          }),
        ),
      ),
    );
  };

  const refresh = (): void => {
    Promise.all([teacherRiders(t), teacherWeeks(t)])
      .then(([r, w]) => {
        riders = r;
        tiles.replaceChildren(classTiles(r, w, rows().length));
        chart.replaceChildren(weekChart(w));
        status.textContent = '';
        drawTable();
      })
      .catch(() => {
        status.textContent = 'Can’t reach Keyflame right now. Check the Wi-Fi.';
        drawTable();
      });
  };

  const addInput = h('input', { type: 'text', class: 'label-input', maxlength: MAX_NAME, placeholder: 'New student name', autocomplete: 'off', 'aria-label': 'New student name', enterkeyhint: 'done' });
  const addMsg = h('small', { class: 'fine', role: 'status' });
  const add = (): void => {
    const name = addInput.value.trim();
    if (!name) return addInput.focus();
    const roster = readRoster();
    const badge = nextBadge([...Object.keys(roster).map(Number), ...riders.map((r) => r.badge), ...readRetired()]);
    if (badge === null) {
      addMsg.textContent = 'A class has up to 99 badges.';
      return;
    }
    roster[badge] = name.slice(0, MAX_NAME);
    writeRoster(roster);
    addInput.value = '';
    addMsg.textContent = `${name} is badge ${badge}.`;
    rosterChanged();
    drawTable();
  };
  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') add();
  });

  const el = h(
    'section',
    { class: 'progress-panel' },
    status,
    tiles,
    h('section', { class: 'board-panel' }, h('h2', {}, 'Class speed by week'), chart),
    h(
      'section',
      { class: 'board-panel' },
      h(
        'div',
        { class: 'board-head' },
        h('h2', {}, 'Students'),
        button('Refresh', refresh, 'btn ghost small'),
        button('Badge cards', () => badgeCards(t, readRoster()), 'btn ghost small'),
        button('Export CSV', () => download(`keyflame-class-${t.code}.csv`, ridersCsv(rows(), LESSONS.length)), 'btn ghost small'),
      ),
      sortBar,
      table,
      h('div', { class: 'add-student' }, addInput, button('Add student', add, 'btn small')),
      addMsg,
      h('p', { class: 'fine' }, 'Tap a student to see their lessons and speed over time, edit their name or badge number, or delete them. Speed is the average of their last five timed lessons and races.'),
    ),
  );
  refresh();
  const timer = window.setInterval(() => {
    if (el.isConnected && !document.hidden && !el.querySelector('.rider-sheet')) refresh();
  }, 30000);
  return { el, refresh, stop: () => clearInterval(timer) };
}
