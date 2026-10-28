// Classroom mode. A teacher makes a class and gets a six-letter code; riders type the code
// and race classmates live on any device, with a shared class board. No accounts: riders
// show up only by their preset-word rider name and their dragon.

import { dragonSvg, stageFor } from '../../game/dragons';
import { activeDragon, isTouch } from '../../game/progress';
import {
  GATHER_MS, MAX_LANES, classRiderName, estimateProgress, isClassCode, newRace, normalizeCode, placeFor, quickRacers, raceHost, spacedCode,
  teacherRacers, tickEvery, waitingRiders, type Member, type RaceStart, type Tick,
} from '../../game/classroom';
import { classBoard, clearClassBoard, createClass, joinClass, postClassRace, type BoardRow, type TeacherClass } from '../../net/classApi';
import { openClassLink, type ClassLink } from '../../net/classLink';
import type { SessionSummary } from '../../engine/typing';
import type { InputMode } from '../../save/store';
import { go, inputMode, profile } from '../app';
import { button, h, svg } from '../dom';
import { sfx } from '../sound';
import { topBar } from './hub';
import { liveRace, raceMap, type LiveRace } from './race';
import { parentGate } from './supporter';
import { title } from './title';

const LAST_CODE_KEY = 'keyflame-class-code';
const TEACHER_KEY = 'keyflame-teacher-class';

function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private browsing: the code is typed again next time.
  }
}

const randomId = (): string => Math.random().toString(36).slice(2, 10);

function riderMember(): Member {
  const p = profile();
  const d = activeDragon(p);
  return {
    id: randomId(),
    name: classRiderName(p.name),
    look: d ? { tribe: d.tribe, palette: d.palette, stage: stageFor(d.xp), marking: d.marking ?? 0, stars: d.stars ?? 0, skin: d.skin } : null,
    role: 'rider',
    status: 'lobby',
    touch: isTouch(inputMode()),
    since: Date.now(),
  };
}

function memberArt(m: Member, cls: string): HTMLElement {
  const l = m.look;
  return svg(dragonSvg(l?.tribe ?? 'emberback', l?.palette ?? 0, l?.stage ?? 'hatchling', '', l?.skin, l?.marking ?? 0, l?.stars ?? 0), cls);
}

const STATUS_LABEL: Record<Member['status'], string> = { lobby: 'Here', waiting: 'Ready!', racing: 'Racing' };

function rosterChip(m: Member, me = false): HTMLElement {
  return h(
    'li',
    { class: `roster-chip status-${m.status}${me ? ' me' : ''}` },
    memberArt(m, 'roster-art'),
    h('span', { class: 'roster-name' }, me ? `${m.name} (you)` : m.name),
    h('small', { class: 'roster-status' }, STATUS_LABEL[m.status]),
  );
}

function boardTable(rows: BoardRow[], highlight?: string): HTMLElement {
  if (!rows.length) return h('p', { class: 'fine board-empty' }, 'No class races yet.');
  return h(
    'ol',
    { class: 'class-board' },
    ...rows.map((r, i) =>
      h(
        'li',
        { class: r.rider === highlight ? 'me' : '' },
        h('span', { class: 'cb-place' }, i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1)),
        h('span', { class: 'cb-name' }, r.rider),
        h('span', { class: 'cb-wpm' }, h('strong', {}, String(Math.round(r.best_wpm))), ' WPM'),
        h('span', { class: 'cb-meta', title: r.touch ? 'Best race on a touch screen' : 'Best race on a keyboard' }, r.touch ? '📱' : '⌨️', ` ${r.wins}🏆`),
      ),
    ),
  );
}

/** A board panel that loads itself and has a refresh button. */
function boardPanel(code: string, highlight?: string, extra: HTMLElement | null = null): { el: HTMLElement; refresh: () => void } {
  const body = h('div', {}, h('p', { class: 'fine' }, 'Loading…'));
  const refresh = (): void => {
    classBoard(code)
      .then((rows) => body.replaceChildren(boardTable(rows, highlight)))
      .catch(() => body.replaceChildren(h('p', { class: 'fine' }, 'The class board needs internet.')));
  };
  refresh();
  const el = h('section', { class: 'board-panel' }, h('div', { class: 'board-head' }, h('h2', {}, '🏆 Class board'), button('↻', refresh, 'btn ghost small', { 'aria-label': 'Refresh the class board' }), extra), body);
  return { el, refresh };
}

function linkBanner(link: ClassLink): HTMLElement {
  const el = h('p', { class: 'link-banner', role: 'status' });
  const render = (): void => {
    const s = link.state();
    el.hidden = s === 'online';
    el.textContent = s === 'connecting' ? 'Connecting…' : 'Can’t reach the class. Check the Wi-Fi.';
  };
  render();
  link.onChange(render);
  return el;
}

// ---------- Riders ----------

interface Session {
  code: string;
  link: ClassLink;
  /** The screen that is showing the class right now, if any. */
  here: 'lobby' | 'race' | null;
}

let session: Session | null = null;

function endSession(): void {
  session?.link.close();
  session = null;
}

async function startSession(code: string): Promise<Session> {
  if (session?.code === code) return session;
  endSession();
  const link = await openClassLink(code, riderMember());
  const s: Session = { code, link, here: null };
  link.onRace((race) => {
    // A race only pulls in riders who are looking at the class lobby.
    if (s.here !== 'lobby' || !race.racers.includes(link.me.id)) return;
    link.setStatus('racing');
    go(liveRace(race.courseId, liveFor(s, race)));
  });
  session = s;
  return s;
}

/** Leaving the class screens for anywhere else closes the link. */
function leftClass(s: Session): void {
  s.here = null;
  window.setTimeout(() => {
    if (session === s && s.here === null) endSession();
  }, 0);
}

function liveFor(s: Session, race: RaceStart): LiveRace {
  const link = s.link;
  const me = link.me;
  const byId = new Map(link.members().map((m) => [m.id, m]));
  const others = race.racers.filter((id) => id !== me.id);
  const ticks = new Map<string, Tick>();
  const done = new Map<string, { ms: number; wpm: number }>();
  let mine: { ms: number; wpm: number } | null = null;
  const list = h('ol', { class: 'live-results' });

  const renderResults = (): void => {
    const rows = [...done.entries()].map(([id, d]) => ({ id, name: byId.get(id)?.name ?? 'Classmate', ...d }));
    if (mine) rows.push({ id: me.id, name: me.name, ...mine });
    rows.sort((a, b) => a.ms - b.ms);
    const flying = others.filter((id) => !done.has(id)).length;
    list.replaceChildren(...rows.map((r, i) => h('li', { class: r.id === me.id ? 'me' : '' }, h('span', {}, `${i + 1}. ${r.name}`), h('strong', {}, `${Math.round(r.wpm)} WPM`))));
    if (flying) list.append(h('li', { class: 'flying' }, `${flying} still flying…`));
  };

  const room = link.joinRace(race.raceId, {
    tick: (id, progress, ms) => ticks.set(id, { progress, ms, at: performance.now() }),
    done: (id, ms, wpm) => {
      if (done.has(id) || !race.racers.includes(id)) return;
      done.set(id, { ms, wpm });
      renderResults();
    },
  });
  const every = tickEvery(race.racers.length);
  let lastSent = -Infinity;
  s.here = 'race';

  return {
    text: race.text,
    factId: race.factId,
    rivals: others.slice(0, MAX_LANES).map((id) => ({ id, name: byId.get(id)?.name ?? 'Classmate', look: byId.get(id)?.look ?? null })),
    racers: race.racers.length,
    progress: (id, now) => estimateProgress(ticks.get(id) ?? null, now, done.has(id)),
    place: (ms) => placeFor(ms, others.map((id) => done.get(id)?.ms ?? null)),
    report(progress, ms) {
      if (ms - lastSent < every) return;
      lastSent = ms;
      room.sendTick(progress, ms);
    },
    finish(ms: number, sum: SessionSummary, place: number, input: InputMode) {
      mine = { ms, wpm: sum.wpm };
      room.sendDone(ms, sum.wpm, sum.accuracy);
      renderResults();
      void postClassRace(s.code, { rider: me.name, wpm: sum.wpm, accuracy: sum.accuracy, place, racers: race.racers.length, touch: isTouch(input) }).catch(() => undefined);
    },
    results: () => (renderResults(), h('div', { class: 'live-results-card' }, h('strong', {}, 'Class race'), list)),
    back: () => go(classLobby(s.code)),
    leave() {
      room.leave();
      link.setStatus('lobby');
      leftClass(s);
    },
  };
}

/** Straight to the lobby when this device already knows its class. */
export function classRaceEntry(): (root: HTMLElement) => (() => void) | void {
  const code = readStore(LAST_CODE_KEY);
  return code && isClassCode(code) ? classLobby(code) : classJoin;
}

/** Where riders type the class code. */
export const classJoin = (root: HTMLElement): void => {
  const input = h('input', {
    type: 'text',
    class: 'class-code-input',
    maxlength: 8,
    autocapitalize: 'characters',
    autocomplete: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'go',
    'aria-label': 'Class code',
    placeholder: 'ABCDEF',
    value: readStore(LAST_CODE_KEY) ?? '',
  });
  const msg = h('p', { class: 'fine', role: 'status' });
  const joinBtn = button('Join', () => void join());
  const join = async (): Promise<void> => {
    const code = normalizeCode(input.value);
    input.value = code;
    if (!isClassCode(code)) {
      msg.textContent = 'A class code is 6 letters.';
      return;
    }
    joinBtn.disabled = true;
    msg.textContent = 'Finding your class…';
    try {
      if (!(await joinClass(code))) {
        msg.textContent = 'No class has that code. Check each letter.';
        joinBtn.disabled = false;
        return;
      }
    } catch {
      msg.textContent = 'Can’t reach the class. Check the Wi-Fi.';
      joinBtn.disabled = false;
      return;
    }
    writeStore(LAST_CODE_KEY, code);
    sfx.click();
    go(classLobby(code));
  };
  input.addEventListener('input', () => {
    const v = normalizeCode(input.value);
    if (v !== input.value) input.value = v;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void join();
  });
  root.append(
    topBar(() => go(raceMap)),
    h(
      'main',
      { class: 'class-join' },
      h('h1', {}, '🏫 Class race'),
      h('p', {}, 'Type your class code'),
      input,
      msg,
      h('div', { class: 'row center' }, joinBtn),
    ),
  );
  input.focus();
};

/** The class lobby: who is here, a big Race button, and the class board. */
export function classLobby(code: string) {
  return (root: HTMLElement): (() => void) => {
    const main = h('main', { class: 'class-lobby' }, h('p', { class: 'fine' }, 'Connecting…'));
    root.append(topBar(() => go(raceMap)), main);
    let s: Session | null = null;
    let gather: number | undefined;
    let off: (() => void) | null = null;
    let gone = false;

    void startSession(code)
      .then((sess) => {
        if (gone) return leftClass(sess);
        s = sess;
        s.here = 'lobby';
        s.link.setStatus('lobby');
        build(sess);
      })
      .catch(() => {
        if (!gone) main.replaceChildren(h('p', {}, 'Can’t reach the class. Check the Wi-Fi.'), button('Try again', () => go(classLobby(code))));
      });

    function build(sess: Session): void {
      const link = sess.link;
      const me = link.me;
      const roster = h('ul', { class: 'roster' });
      const raceBtn = button('', () => {
        sfx.click();
        link.setStatus(me.status === 'waiting' ? 'lobby' : 'waiting');
      }, 'btn race-classmates');
      const hint = h('p', { class: 'fine lobby-hint', 'aria-live': 'polite' });
      const board = boardPanel(code, me.name);

      const render = (): void => {
        const members = link.members();
        const riders = members.filter((m) => m.role === 'rider');
        roster.replaceChildren(rosterChip(me, true), ...riders.filter((m) => m.id !== me.id).map((m) => rosterChip(m)));
        const waiting = waitingRiders(members);
        const ready = me.status === 'waiting';
        raceBtn.textContent = ready ? 'Cancel' : '🏁 Race!';
        raceBtn.classList.toggle('ghost', ready);
        hint.textContent = !ready ? '' : waiting.length >= 2 ? 'Starting soon…' : 'Waiting for a classmate…';

        // The rider who has waited longest starts the race for everyone who is ready.
        const host = raceHost(waiting);
        if (ready && waiting.length >= 2 && host?.id === me.id) {
          gather ??= window.setTimeout(() => {
            gather = undefined;
            const now = waitingRiders(link.members());
            if (me.status === 'waiting' && now.length >= 2 && raceHost(now)?.id === me.id) link.startRace(newRace(quickRacers(now)));
          }, GATHER_MS);
        } else if (gather !== undefined) {
          clearTimeout(gather);
          gather = undefined;
        }
      };

      main.replaceChildren(
        linkBanner(link),
        h('div', { class: 'lobby-head' }, h('h1', {}, '🏫 Class race'), h('span', { class: 'class-code-chip' }, spacedCode(code))),
        h('div', { class: 'lobby-race' }, raceBtn, hint),
        h('h2', {}, 'Here now'),
        roster,
        board.el,
        h('p', { class: 'fine center' }, button('Leave class', () => {
          writeStore(LAST_CODE_KEY, null);
          endSession();
          go(raceMap);
        }, 'link')),
      );
      render();
      off = link.onChange(render);
    }

    return () => {
      gone = true;
      clearTimeout(gather);
      off?.();
      if (s) {
        if (s.link.me.status === 'waiting') s.link.setStatus('lobby');
        if (s.here === 'lobby') leftClass(s);
      }
    };
  };
}

// ---------- Teachers ----------

function readTeacher(): TeacherClass | null {
  try {
    const t = JSON.parse(readStore(TEACHER_KEY) ?? 'null') as TeacherClass | null;
    return t && isClassCode(t.code) && typeof t.key === 'string' ? t : null;
  } catch {
    return null;
  }
}

/** Behind the grown-up check on the title screen. */
export function openTeacher(root: HTMLElement): void {
  root.append(parentGate(() => go(teacherScreen)));
}

export const teacherScreen = (root: HTMLElement): (() => void) => {
  let link: ClassLink | null = null;
  let raf = 0;
  const back = h('header', { class: 'top-bar' }, button('← Back', () => go(title), 'btn ghost small'), h('strong', {}, 'Teacher'), h('span'));
  const main = h('main', { class: 'teacher' });
  root.append(back, main);

  const makeClass = async (): Promise<void> => {
    main.replaceChildren(h('p', { class: 'fine' }, 'Making your class…'));
    try {
      const t = await createClass();
      writeStore(TEACHER_KEY, JSON.stringify(t));
      writeStore(LAST_CODE_KEY, t.code);
      void show(t);
    } catch {
      main.replaceChildren(h('p', {}, 'Can’t reach Keyflame right now. Check the Wi-Fi.'), button('Try again', () => void makeClass()));
    }
  };

  const start = (): void => {
    const t = readTeacher();
    if (t) void show(t);
    else
      main.replaceChildren(
        h('h1', {}, '🏫 Classroom'),
        h('p', {}, 'Kids race each other live, on any device.'),
        h('ol', { class: 'teacher-steps' }, h('li', {}, 'Make a class'), h('li', {}, 'Kids open Race, then Class race'), h('li', {}, 'They type the code')),
        h('div', { class: 'row center' }, button('Make a class', () => void makeClass())),
        h('p', { class: 'fine' }, 'No sign-up. Kids show up only by their rider name, which is made from preset words.'),
      );
  };

  async function show(t: TeacherClass): Promise<void> {
    main.replaceChildren(h('p', { class: 'fine' }, 'Connecting…'));
    link?.close();
    try {
      link = await openClassLink(t.code, { id: randomId(), name: 'Teacher', look: null, role: 'teacher', status: 'lobby', touch: false, since: Date.now() });
    } catch {
      main.replaceChildren(h('p', {}, 'Can’t reach Keyflame right now. Check the Wi-Fi.'), button('Try again', () => void show(t)));
      return;
    }
    const l = link;
    const roster = h('ul', { class: 'roster' });
    const count = h('span', { class: 'fine' });
    const raceBtn = button('🏁 Race everyone', () => {
      const racers = teacherRacers(l.members());
      if (racers.length < 1) return;
      sfx.click();
      l.startRace(newRace(racers));
    }, 'btn race-classmates');
    const races = h('div', { class: 'teacher-races' });
    const clearBtn = button('Clear', () => {
      if (!confirm('Clear every race from the class board?')) return;
      void clearClassBoard(t).then(() => board.refresh());
    }, 'btn ghost small');
    const board = boardPanel(t.code, undefined, clearBtn);

    const render = (): void => {
      const riders = l.members().filter((m) => m.role === 'rider');
      roster.replaceChildren(...riders.map((m) => rosterChip(m)));
      count.textContent = riders.length === 1 ? '1 rider here' : `${riders.length} riders here`;
      raceBtn.disabled = teacherRacers(l.members()).length < 1;
    };

    l.onRace((race) => races.prepend(watchRace(l, race, () => board.refresh())));

    main.replaceChildren(
      linkBanner(l),
      h('div', { class: 'teacher-code' }, h('small', {}, 'Class code'), h('strong', {}, spacedCode(t.code)), h('small', {}, 'Race → Class race → type the code')),
      h('div', { class: 'lobby-race' }, raceBtn, count),
      roster,
      races,
      board.el,
      h('p', { class: 'fine center' }, button('Make a new class', () => {
        if (confirm('Make a new class? The old code stops showing here.')) void makeClass();
      }, 'link')),
    );
    render();
    l.onChange(render);
    cancelAnimationFrame(raf);
    const frame = (): void => {
      for (const el of races.querySelectorAll<HTMLElement>('.watch')) (el as HTMLElement & { step?: () => void }).step?.();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  start();
  return () => {
    cancelAnimationFrame(raf);
    link?.close();
  };
};

/** The teacher's view of one race: a bar per rider and the finish order. */
function watchRace(link: ClassLink, race: RaceStart, finished: () => void): HTMLElement {
  const byId = new Map(link.members().map((m) => [m.id, m]));
  const ticks = new Map<string, Tick>();
  const done = new Map<string, { ms: number; wpm: number }>();
  const rows = new Map<string, { bar: HTMLElement; tag: HTMLElement }>();
  const list = h('ul', { class: 'watch-bars' });
  for (const id of race.racers) {
    const m = byId.get(id);
    const bar = h('span', { class: 'wb-fill' });
    const tag = h('small', { class: 'wb-tag' });
    rows.set(id, { bar, tag });
    list.append(h('li', {}, m ? memberArt(m, 'wb-art') : null, h('span', { class: 'wb-name' }, m?.name ?? 'Classmate'), h('span', { class: 'wb-track' }, bar), tag));
  }
  const el = h('section', { class: 'watch' }, h('h2', {}, 'Live race'), list) as HTMLElement & { step?: () => void };
  const room = link.joinRace(race.raceId, {
    tick: (id, progress, ms) => ticks.set(id, { progress, ms, at: performance.now() }),
    done: (id, ms, wpm) => {
      if (done.has(id) || !rows.has(id)) return;
      done.set(id, { ms, wpm });
      const order = [...done.values()].sort((a, b) => a.ms - b.ms).findIndex((d) => d.ms === ms) + 1;
      rows.get(id)!.tag.textContent = `${['🥇', '🥈', '🥉'][order - 1] ?? `#${order}`} ${Math.round(wpm)} WPM`;
      if (done.size === race.racers.length) {
        room.leave();
        el.querySelector('h2')!.textContent = 'Race finished';
        window.setTimeout(finished, 1500);
      }
    },
  });
  el.step = () => {
    const now = performance.now();
    for (const [id, r] of rows) r.bar.style.width = `${(estimateProgress(ticks.get(id) ?? null, now, done.has(id)) * 100).toFixed(1)}%`;
  };
  // Old races fold away so the board stays in view.
  window.setTimeout(() => {
    if (!el.isConnected) return;
    room.leave();
    el.remove();
  }, 5 * 60000);
  return el;
}
