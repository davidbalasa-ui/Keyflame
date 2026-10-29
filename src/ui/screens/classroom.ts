// Classroom mode. A teacher makes a class and gets a six-letter code; riders type the code
// and race classmates live on any device, with a shared class board. No accounts: riders
// show up only by their preset-word rider name and their dragon.

import { dragonSvg, stageFor } from '../../game/dragons';
import { activeDragon, isTouch } from '../../game/progress';
import {
  GATHER_MS, MAX_LANES, classRiderName, parseStudentList, estimateProgress, isClassCode, newRace, normalizeCode, placeFor, quickRacers, raceHost, spacedCode,
  teacherRacers, tickEvery, waitingRiders, type Member, type RaceStart, type Tick,
} from '../../game/classroom';
import { classBoard, clearClassBoard, createClass, joinClassRider, newClassCode, type BoardRow, type TeacherClass } from '../../net/classApi';
import { reportToClass, riderSeat, seatFor, setRiderSeat } from '../classTrack';
import { badgeCards, classSheet, progressPanel, readBackupFile, readRetired, readRoster, saveBackupFile, writeRetired, writeRoster, type Roster } from './teacherDashboard';
import { heroDragon, heroEgg, teacherBackdropSvg, teacherHeroSvg } from '../teacherArt';
import { MIN_PASSWORD, deriveKeys, newSalt, pullVault, pushVault, type VaultKeys } from '../../net/teacherVault';
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
function boardPanel(code: string, highlight?: string, extra: HTMLElement | null = null, heading = '🏆 Class board'): { el: HTMLElement; refresh: () => void } {
  const body = h('div', {}, h('p', { class: 'fine' }, 'Loading…'));
  const refresh = (): void => {
    classBoard(code)
      .then((rows) => body.replaceChildren(boardTable(rows, highlight)))
      .catch(() => body.replaceChildren(h('p', { class: 'fine' }, 'The class board needs internet.')));
  };
  refresh();
  const el = h('section', { class: 'board-panel' }, h('div', { class: 'board-head' }, h('h2', {}, heading), button('↻', refresh, 'btn ghost small', { 'aria-label': 'Refresh the class board' }), extra), body);
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
      reportToClass(profile(), { kind: 'class', wpm: sum.wpm, accuracy: sum.accuracy, place, racers: race.racers.length, touch: isTouch(input) });
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

/** Straight to the lobby when this rider already joined their class. */
export function classRaceEntry(): (root: HTMLElement) => (() => void) | void {
  const seat = riderSeat(profile());
  return seat ? classLobby(seat.code) : classJoin;
}

/** Where riders type the class code and their badge number. */
export const classJoin = (root: HTMLElement): void => joinScreen(root, '');

/** Shown when the class or badge this rider had no longer works. */
const joinWithNote = (note: string) => (root: HTMLElement): void => joinScreen(root, note);

const BADGE_MAX = 99;

function joinScreen(root: HTMLElement, note: string): void {
  const p = profile();
  const input = h('input', {
    type: 'text',
    class: 'class-code-input',
    maxlength: 8,
    autocapitalize: 'characters',
    autocomplete: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'next',
    'aria-label': 'Class code',
    placeholder: 'ABCDEF',
    value: readStore(LAST_CODE_KEY) ?? '',
  });
  const badgeInput = h('input', {
    type: 'text',
    class: 'badge-input',
    maxlength: 2,
    inputmode: 'numeric',
    pattern: '[0-9]*',
    autocomplete: 'off',
    enterkeyhint: 'go',
    'aria-label': 'Your badge number',
    placeholder: '00',
    value: p.classBadge ? String(p.classBadge) : '',
  });
  const msg = h('p', { class: 'fine', role: 'status' }, note);
  const joinBtn = button('🏁 Join', () => void join(false), 'btn race-classmates');
  const confirmBox = h('div', { class: 'badge-confirm pop-in', hidden: true });
  const join = async (confirm: boolean): Promise<void> => {
    const code = normalizeCode(input.value);
    input.value = code;
    const badge = Number(badgeInput.value);
    if (!isClassCode(code)) {
      msg.textContent = 'A class code is 6 letters.';
      return;
    }
    if (!Number.isInteger(badge) || badge < 1 || badge > BADGE_MAX) {
      msg.textContent = 'Type the badge number your teacher gave you.';
      badgeInput.focus();
      return;
    }
    joinBtn.disabled = true;
    confirmBox.hidden = true;
    msg.textContent = 'Finding your class…';
    try {
      const res = await joinClassRider(seatFor(p, code, badge), confirm);
      joinBtn.disabled = false;
      if (res.status === 'none') {
        msg.textContent = 'No class has that code. Check each letter.';
        return;
      }
      if (res.status === 'taken') {
        // Another device already rides as this badge: the same kid on a new device, or a typo.
        msg.textContent = '';
        sfx.tap(2);
        confirmBox.replaceChildren(
          h('p', {}, 'Badge ', h('b', {}, `#${badge}`), ' is'),
          h('p', { class: 'bc-holder' }, res.holder),
          h('p', {}, 'Is that you?'),
          h('div', { class: 'row center' }, button('Yes, that’s me', () => void join(true)), button('No', () => {
            confirmBox.hidden = true;
            joinBtn.hidden = false;
            badgeInput.value = '';
            msg.textContent = 'Check your badge number with your teacher.';
            badgeInput.focus();
          }, 'btn ghost')),
        );
        confirmBox.hidden = false;
        joinBtn.hidden = true;
        return;
      }
    } catch {
      msg.textContent = 'Can’t reach the class. Check the Wi-Fi.';
      joinBtn.disabled = false;
      return;
    }
    setRiderSeat(p, code, badge);
    writeStore(LAST_CODE_KEY, code);
    sfx.coin();
    go(classLobby(code));
  };
  input.addEventListener('input', () => {
    const v = normalizeCode(input.value);
    if (v !== input.value) input.value = v;
    if (v.length === 6 && document.activeElement === input) badgeInput.focus();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') badgeInput.focus();
  });
  badgeInput.addEventListener('input', () => {
    const v = badgeInput.value.replace(/\D/g, '').slice(0, 2);
    if (v !== badgeInput.value) badgeInput.value = v;
  });
  badgeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void join(false);
  });
  root.append(
    topBar(() => go(raceMap)),
    h(
      'main',
      { class: 'class-join' },
      h('h1', {}, '🏫 Class race'),
      h(
        'div',
        { class: 'join-ticket pop-in' },
        h('label', { class: 'jt-field' }, h('span', { class: 'jt-label' }, 'Class code'), input),
        h('label', { class: 'jt-field jt-badge' }, h('span', { class: 'jt-label' }, 'Badge'), h('span', { class: 'badge-ring' }, h('span', { class: 'badge-hash', 'aria-hidden': 'true' }, '#'), badgeInput)),
      ),
      msg,
      confirmBox,
      h('div', { class: 'row center' }, joinBtn),
    ),
  );
  (isClassCode(input.value) ? badgeInput : input).focus();
}

/** The class lobby: who is here, a big Race button, and the class board. */
export function classLobby(code: string) {
  return (root: HTMLElement): (() => void) => {
    const main = h('main', { class: 'class-lobby' }, h('p', { class: 'fine' }, 'Connecting…'));
    root.append(topBar(() => go(raceMap)), main);
    let s: Session | null = null;
    let gather: number | undefined;
    let off: (() => void) | null = null;
    let gone = false;

    // Riders check in first: the class may have a new code, or the teacher may have
    // taken this badge out.
    const p = profile();
    const seat = riderSeat(p);
    const recheck = (note: string): void => {
      setRiderSeat(p, null, null);
      go(joinWithNote(note));
    };
    if (!seat || seat.code !== code) queueMicrotask(() => !gone && go(classJoin));
    else
      void joinClassRider(seat, null).then(
        (res) => {
          if (gone) return;
          if (res.status === 'none') {
            writeStore(LAST_CODE_KEY, null);
            recheck('That class code has changed. Ask your teacher for the new one.');
          } else if (res.status === 'taken' || res.status === 'removed') recheck('Type your class code and badge number.');
          else connect();
        },
        // Offline check-ins don't stop a race; the link reports its own trouble.
        () => connect(),
      );

    const connect = (): void => void startSession(code)
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
        h('div', { class: 'lobby-head' }, h('h1', {}, '🏫 Class race'), h('span', { class: 'lobby-chips' }, h('span', { class: 'class-code-chip' }, spacedCode(code)), h('span', { class: 'my-badge pop-in', 'aria-label': `Your badge ${profile().classBadge ?? ''}` }, `#${profile().classBadge ?? '?'}`))),
        h('div', { class: 'lobby-race' }, raceBtn, hint),
        h('h2', {}, 'Here now'),
        roster,
        board.el,
        h('p', { class: 'fine center' }, button('Leave class', () => {
          writeStore(LAST_CODE_KEY, null);
          setRiderSeat(profile(), null, null);
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

/** The class this device teaches, and the keys that keep its locked backup up to date. */
type TeacherSave = TeacherClass & { vault?: VaultKeys };

function readTeacher(): TeacherSave | null {
  try {
    const t = JSON.parse(readStore(TEACHER_KEY) ?? 'null') as TeacherSave | null;
    return t && isClassCode(t.code) && typeof t.key === 'string' ? t : null;
  } catch {
    return null;
  }
}

const writeTeacher = (t: TeacherSave): void => writeStore(TEACHER_KEY, JSON.stringify(t));

/** Behind the grown-up check on the title screen. */
export function openTeacher(root: HTMLElement): void {
  root.append(parentGate(() => go(teacherScreen)));
}

/** The illustrated banner on top of the teacher screens. */
function teacherHero(...content: HTMLElement[]): HTMLElement {
  return h(
    'div',
    { class: 'tm-hero' },
    svg(teacherHeroSvg(), 'th-bg'),
    h('div', { class: 'th-content' }, ...content),
    svg(heroEgg(), 'th-egg'),
    svg(heroDragon(), 'th-dragon-wrap'),
  );
}

const HOME_SCREEN_TIP = 'On an iPad, tap Share → Add to Home Screen so Safari doesn’t clear Keyflame’s saved data.';

function passwordInput(label: string, autocomplete: string): HTMLInputElement {
  return h('input', { type: 'password', class: 'label-input', minlength: MIN_PASSWORD, autocomplete, 'aria-label': label, placeholder: label });
}

export const teacherScreen = (root: HTMLElement): (() => void) => {
  // Grown-up screens get a calm dashboard look of their own.
  document.body.classList.add('teacher-mode');
  let link: ClassLink | null = null;
  let raf = 0;
  let tab: 'live' | 'progress' = 'live';
  let progress: { stop: () => void } | null = null;
  const back = h('header', { class: 'top-bar' }, button('← Back', () => go(title), 'btn ghost small'), h('strong', {}, 'Teacher'), h('span'));
  const main = h('main', { class: 'teacher' });
  root.append(svg(teacherBackdropSvg(), 'tm-backdrop-wrap'), back, main);

  // The locked backup follows every change to the student list.
  const backupNote = h('p', { class: 'fine backup-note', role: 'status' });
  let syncTimer: number | undefined;
  const syncNow = async (): Promise<void> => {
    const t = readTeacher();
    if (!t?.vault) {
      backupNote.textContent = 'No teacher password yet, so the student list is only on this device.';
      return;
    }
    try {
      if (!(await pushVault(t, t.vault, readRoster(), readRetired()))) throw new Error('refused');
      backupNote.textContent = `✓ Student list backed up (${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`;
    } catch {
      backupNote.textContent = 'Student list not backed up yet. It will try again after your next change. Check the Wi-Fi.';
    }
  };
  const syncSoon = (): void => {
    clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => void syncNow(), 800);
  };

  const makeClass = async (names: string[], password: string): Promise<void> => {
    main.replaceChildren(h('p', { class: 'fine' }, 'Making your class…'));
    try {
      const made = await createClass();
      const vault = await deriveKeys(password, newSalt());
      const t: TeacherSave = { ...made, vault };
      const roster: Roster = {};
      names.forEach((n, i) => (roster[i + 1] = n));
      writeRoster(roster);
      writeRetired([]);
      writeTeacher(t);
      writeStore(LAST_CODE_KEY, t.code);
      await syncNow();
      await show(t, 'progress');
      main.append(readySheet(t));
    } catch {
      main.replaceChildren(h('p', {}, 'Can’t reach Keyflame right now. Check the Wi-Fi.'), button('Try again', () => void makeClass(names, password)));
    }
  };

  /** Shown once after making a class: paper and file copies of the student list. */
  const readySheet = (t: TeacherSave): HTMLElement => {
    const sheet = h(
      'div',
      { class: 'modal-backdrop' },
      h(
        'div',
        { class: 'modal' },
        h('h2', {}, 'Your class is ready'),
        h('p', { class: 'teacher-code-inline' }, spacedCode(t.code)),
        h('p', {}, 'Print the class sheet and keep it somewhere safe. It has every student’s badge number.'),
        h('div', { class: 'row center' }, button('Print class sheet', () => classSheet(t, readRoster())), button('Badge cards', () => badgeCards(t, readRoster()), 'btn ghost')),
        h('p', { class: 'fine' }, 'Your list is also locked with your teacher password and backed up, so you can open the class on any device with the code and password.'),
        h('div', { class: 'row center' }, button('Save backup file', () => saveBackupFile(t), 'btn ghost small'), button('Done', () => sheet.remove(), 'btn small')),
      ),
    );
    return sheet;
  };

  const startForm = (): void => {
    const list = h('textarea', { class: 'student-list', rows: 8, placeholder: 'Ava\nBen\nCara\n…', 'aria-label': 'Your students, one per line' });
    const pw = passwordInput('Teacher password', 'new-password');
    const msg = h('p', { class: 'fine', role: 'status' });
    const make = (): void => {
      if (pw.value.length < MIN_PASSWORD) {
        msg.textContent = `Pick a teacher password of at least ${MIN_PASSWORD} characters.`;
        return pw.focus();
      }
      void makeClass(parseStudentList(list.value), pw.value);
    };

    const code = h('input', { type: 'text', class: 'label-input', maxlength: 8, autocapitalize: 'characters', autocomplete: 'off', 'aria-label': 'Class code', placeholder: 'Class code' });
    const pw2 = passwordInput('Teacher password', 'current-password');
    const msg2 = h('p', { class: 'fine', role: 'status' });
    const open = async (): Promise<void> => {
      const c = normalizeCode(code.value);
      if (!isClassCode(c)) return void (msg2.textContent = 'A class code is 6 letters.');
      msg2.textContent = 'Opening…';
      try {
        const res = await pullVault(c, pw2.value);
        if (!res.ok) {
          msg2.textContent = res.why === 'none' ? 'No class with a teacher password has that code.' : 'That password doesn’t match. Check it and try again.';
          return;
        }
        writeRoster(res.data.roster);
        writeRetired(res.data.retired ?? []);
        writeTeacher({ code: c, key: res.data.key, vault: res.keys });
        writeStore(LAST_CODE_KEY, c);
        void show(readTeacher()!, 'progress');
      } catch {
        msg2.textContent = 'Can’t open it right now. Check the Wi-Fi. After ten wrong passwords it waits an hour.';
      }
    };
    const file = h('input', { type: 'file', accept: '.json,application/json', class: 'file-input', 'aria-label': 'Backup file' });
    file.addEventListener('change', () => {
      const f = file.files?.[0];
      if (!f) return;
      void f.text().then((text) => {
        const b = readBackupFile(text);
        if (!b) return void (msg2.textContent = 'That isn’t a Keyflame class backup file.');
        writeRoster(b.roster);
        writeRetired(b.retired);
        writeTeacher({ code: b.code, key: b.key });
        writeStore(LAST_CODE_KEY, b.code);
        void show(readTeacher()!, 'progress');
      });
    });

    main.replaceChildren(
      teacherHero(h('h1', {}, 'Classroom'), h('p', { class: 'th-sub' }, 'Live races and typing progress for your class')),
      h('ol', { class: 'teacher-steps' }, h('li', {}, 'Type your students, one per line'), h('li', {}, 'Make the class and print the class sheet'), h('li', {}, 'Kids open Race → Class race and type the code and their badge number')),
      h('section', { class: 'board-panel teacher-form' },
        h('label', { class: 'rs-label' }, h('span', {}, 'Your students (you can add more later)'), list),
        h('label', { class: 'rs-label' }, h('span', {}, 'Teacher password'), pw, h('small', { class: 'fine' }, 'Locks your student list. You need it to open the class on another device.')),
        msg,
        h('div', { class: 'row center' }, button('Make a class', make)),
        h('p', { class: 'fine' }, 'Names stay on your device and in your locked backup. Keyflame only sees badge numbers and typing results.'),
      ),
      h('section', { class: 'board-panel teacher-form' },
        h('h2', {}, 'Already have a class?'),
        code,
        pw2,
        h('div', { class: 'row center' }, button('Open my class', () => void open(), 'btn ghost')),
        h('label', { class: 'fine file-label' }, 'Or open a backup file: ', file),
        msg2,
      ),
      h('p', { class: 'fine' }, HOME_SCREEN_TIP),
    );
  };

  const start = (): void => {
    const t = readTeacher();
    if (t) void show(t);
    else startForm();
  };

  async function show(t: TeacherSave, startTab: 'live' | 'progress' = tab): Promise<void> {
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
    const raceBtn = button('Start a race for everyone', () => {
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
    const board = boardPanel(t.code, undefined, clearBtn, 'Class board');

    const render = (): void => {
      const riders = l.members().filter((m) => m.role === 'rider');
      roster.replaceChildren(...riders.map((m) => rosterChip(m)));
      count.textContent = riders.length === 1 ? '1 rider here' : `${riders.length} riders here`;
      raceBtn.disabled = teacherRacers(l.members()).length < 1;
    };

    l.onRace((race) => races.prepend(watchRace(l, race, () => board.refresh())));

    const newCode = async (): Promise<void> => {
      if (!confirm('Give this class a new code? Students type the new code once, with the same badge numbers. Their progress stays.')) return;
      const code = await newClassCode(t).catch(() => null);
      if (!code) return alert('Can’t change the code right now. Check the Wi-Fi.');
      const next = { ...t, code };
      writeTeacher(next);
      writeStore(LAST_CODE_KEY, code);
      await show(next, 'progress');
      const note = h('div', { class: 'modal-backdrop' });
      note.append(
        h('div', { class: 'modal' },
          h('h2', {}, 'New class code'),
          h('p', { class: 'teacher-code-inline' }, spacedCode(code)),
          h('p', {}, 'Print a new class sheet with the new code. Badge numbers stay the same.'),
          h('div', { class: 'row center' }, button('Print class sheet', () => classSheet(next, readRoster())), button('Done', () => note.remove(), 'btn ghost')),
        ),
      );
      main.append(note);
    };

    const setPassword = (): void => {
      const pw = passwordInput('New teacher password', 'new-password');
      const msg = h('p', { class: 'fine', role: 'status' });
      const box = h('div', { class: 'modal-backdrop' }, h('div', { class: 'modal' },
        h('h2', {}, 'Teacher password'),
        h('p', {}, 'Locks your student list and backs it up, so you can open this class on any device with the code and this password.'),
        pw, msg,
        h('div', { class: 'row center' }, button('Cancel', () => box.remove(), 'btn ghost'), button('Save', () => {
          if (pw.value.length < MIN_PASSWORD) return void (msg.textContent = `At least ${MIN_PASSWORD} characters.`);
          void deriveKeys(pw.value, newSalt()).then((vault) => {
            t.vault = vault;
            writeTeacher(t);
            box.remove();
            void syncNow().then(() => passwordBtn.replaceChildren('Change teacher password'));
          });
        })),
      ));
      main.append(box);
      pw.focus();
    };
    const passwordBtn = button(t.vault ? 'Change teacher password' : 'Set a teacher password', setPassword, 'btn ghost small');

    progress?.stop();
    const prog = progressPanel(t, syncSoon);
    progress = prog;
    const live = h(
      'div',
      { class: 'tab-live' },
      h('div', { class: 'lobby-race' }, raceBtn, count),
      roster,
      races,
      board.el,
    );
    const manage = h(
      'section',
      { class: 'board-panel manage' },
      h('h2', {}, 'Class'),
      backupNote,
      h('div', { class: 'row center' },
        button('Class sheet', () => classSheet(t, readRoster()), 'btn ghost small'),
        button('Save backup file', () => saveBackupFile(t), 'btn ghost small'),
        passwordBtn,
      ),
      h('div', { class: 'row center' }, button('New class code', () => void newCode(), 'btn ghost small'), button('Clear class board', () => clearBtn.click(), 'btn ghost small')),
      h('p', { class: 'fine' }, 'A new code keeps every student, badge number and their progress. Use it if the code got out.'),
      h('p', { class: 'fine' }, HOME_SCREEN_TIP),
      h('p', { class: 'fine center' }, button('Make a new class', () => {
        if (confirm('Make a brand new class? To come back to this one later, use its code and your teacher password.')) {
          progress?.stop();
          link?.close();
          startForm();
        }
      }, 'link')),
    );
    const tabs = h('div', { class: 'seg tabs', role: 'tablist' });
    const showTab = (which: 'live' | 'progress'): void => {
      tab = which;
      live.hidden = which !== 'live';
      prog.el.hidden = which !== 'progress';
      manage.hidden = which !== 'progress';
      if (which === 'progress') prog.refresh();
      tabs.replaceChildren(
        button('Live', () => showTab('live'), `seg-btn${which === 'live' ? ' on' : ''}`, { role: 'tab', 'aria-selected': String(which === 'live') }),
        button('Progress', () => showTab('progress'), `seg-btn${which === 'progress' ? ' on' : ''}`, { role: 'tab', 'aria-selected': String(which === 'progress') }),
      );
    };

    main.replaceChildren(
      linkBanner(l),
      teacherHero(h('div', { class: 'teacher-code' }, h('small', {}, 'Class code'), h('strong', {}, spacedCode(t.code)), h('small', {}, 'Students: Race → Class race → code and badge number'))),
      tabs,
      live,
      prog.el,
      manage,
    );
    showTab(startTab);
    // Catch up on any list changes made while offline.
    void syncNow();
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
    document.body.classList.remove('teacher-mode');
    cancelAnimationFrame(raf);
    clearTimeout(syncTimer);
    progress?.stop();
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
