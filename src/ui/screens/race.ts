import { buildRaceText } from '../../content/lessons';
import { COURSES, courseById, type Course } from '../../game/courses';
import { TRIBES, dragonSvg, eggSvg, stageFor, type Stage, type TribeId } from '../../game/dragons';
import { activeDragon, capitalsKnown, hidesHints, perkText, perkTribe, eggProgress, courseUnlocked, factsUnlocked, ghostProgress, ghostSpeeds, isTouch, knownLetters, recordFact, recordRace, rivalSpeed } from '../../game/progress';
import { FACTS, READING_LEVEL_LABEL, TOPIC_LABEL, factById, pickFact, type ReadingLevel } from '../../content/facts';
import { weakKeys } from '../../engine/typing';
import { applyRaceKey, finishTime, newRaceState, perkTuning } from '../../game/raceRules';
import { UNITS } from '../../content/lessons';
import { go, inputMode, persist, profile } from '../app';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { createTypingView } from '../typingView';
import { CONFETTI, ParticleField, TRAIL_COLORS } from '../particles';
import { celebration, crownSvg, flameSvg, type RewardCard } from '../celebrate';
import { claimNewAchievements, earnedIds } from '../../game/achievements';
import { medalSvg } from './achievementsPage';
import { hub, refreshEmbers, topBar } from './hub';
import { codex } from './codex';
import { nest } from './nest';
import { seasonAt } from '../../content/seasons';
import { CHALLENGE_EMBERS } from '../../game/seasons';
import { STARGLINT_LOOK, STARGLINT_LOOKS } from '../../game/starglintArt';
import type { Look } from '../../game/classroom';
import type { SessionSummary } from '../../engine/typing';
import { isStarglint, type InputMode } from '../../save/store';
import { classRaceEntry } from './classroom';
import { reportToClass } from '../classTrack';

/** A race against classmates on other devices, run by the classroom screens. */
export interface LiveRace {
  text: string;
  factId: string | null;
  rivals: Array<{ id: string; name: string; look: Look | null }>;
  /** Where to draw a classmate right now, 0 to 1. */
  progress(id: string, now: number): number;
  /** Riders in the race, this one included; more than get a lane. */
  racers: number;
  /** This rider's place for a finish time, counting classmates without a lane too. */
  place(ms: number): number;
  /** Called every frame while racing; the classroom side decides when to send. */
  report(progress: number, ms: number): void;
  finish(ms: number, sum: SessionSummary, place: number, input: InputMode): void;
  /** A list of finishers that keeps filling in as classmates cross the line. */
  results(): HTMLElement;
  back(): void;
  leave(): void;
}

interface Racer {
  name: string;
  wpm: number;
  el: HTMLElement;
  /** Small per-racer wobble so ghosts don't move like robots. */
  phase: number;
  rival?: boolean;
}

const GHOST_NAMES: Array<{ name: string; tribe: TribeId; palette: number }> = [
  { name: 'Quillspark', tribe: 'tidefin', palette: 0 },
  { name: 'Wrenshine', tribe: 'mossclaw', palette: 2 },
  { name: 'Runedrift', tribe: 'stormcrest', palette: 2 },
  { name: 'Pebbleflare', tribe: 'emberback', palette: 2 },
];

function hillsUri(ground: string): string {
  const svgText = `<svg xmlns='http://www.w3.org/2000/svg' width='520' height='120' preserveAspectRatio='none'><path d='M0 120 L0 70 C60 30 120 30 180 60 C240 90 300 20 380 40 C440 56 480 70 520 70 L520 120z' fill='${ground}'/><path d='M0 120 L0 70 C60 30 120 30 180 60 C240 90 300 20 380 40 C440 56 480 70 520 70 L520 120z' fill='#000' opacity='0.25'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svgText)}")`;
}

// Two mountain ridges: a pale far range and a nearer one with shaded faces and snow caps.
const RIDGE: Array<[number, number]> = [[0, 210], [60, 160], [110, 200], [170, 118], [240, 190], [300, 150], [360, 210], [420, 140], [470, 108], [520, 170], [600, 210]];
const FAR_RIDGE: Array<[number, number]> = [[0, 190], [80, 130], [150, 170], [230, 110], [320, 160], [390, 120], [500, 150], [560, 125], [600, 190]];

function ridgeSvg(points: Array<[number, number]>, fill: string, cap: string, opacity: number): string {
  const body = `M0 300 ${points.map(([x, y]) => `L${x} ${y}`).join(' ')} L600 300z`;
  let shade = '';
  let caps = '';
  points.forEach(([x, y], i) => {
    const l = points[i - 1];
    const r = points[i + 1];
    if (!l || !r || y > l[1] || y > r[1] || y > 165) return;
    shade += `M${x} ${y} L${r[0]} ${r[1]} L${r[0]} 300 L${x + (r[0] - x) * 0.2} 300z `;
    const f = 0.3;
    const lx = x + (l[0] - x) * f;
    const ly = y + (l[1] - y) * f;
    const rx = x + (r[0] - x) * f;
    const ry = y + (r[1] - y) * f;
    caps += `M${x} ${y} L${lx} ${ly} L${(lx + x) / 2} ${ly - 4} L${x} ${ly + 3} L${(rx + x) / 2} ${ry - 5} L${rx} ${ry}z `;
  });
  return `<g opacity='${opacity}'><path d='${body}' fill='${fill}'/><path d='${shade}' fill='#000' opacity='0.22'/><path d='${caps}' fill='${cap}' opacity='0.95'/></g>`;
}

function mountainsUri(ground: string, peak: string): string {
  const svgText = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300' preserveAspectRatio='none'>${ridgeSvg(FAR_RIDGE, '#ffffff', peak, 0.16)}${ridgeSvg(RIDGE, ground, peak, 0.85)}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svgText)}")`;
}

/** Asks once which facts to race with. It can be changed later in Settings. */
function readerPicker(done: () => void): HTMLElement {
  const p = profile();
  const choose = (level: ReadingLevel): void => {
    p.settings.readingLevel = level;
    persist();
    done();
  };
  return h(
    'section',
    { class: 'reader-pick' },
    h('h2', {}, 'You know every letter!'),
    h('p', {}, 'Races now use real fun facts, so you learn something every time you fly. Which facts should we use?'),
    h('div', { class: 'row' }, button(READING_LEVEL_LABEL.younger, () => choose('younger')), button(READING_LEVEL_LABEL.older, () => choose('older'))),
  );
}

/** Campaign map: pick a course; new courses open as lesson units are finished. */
export const raceMap = (root: HTMLElement): void => {
  const p = profile();
  root.append(
    topBar(() => go(hub)),
    h(
      'main',
      { class: 'race-map' },
      h('h1', {}, 'Choose a course'),
      h('p', { class: 'fine' }, 'Beat each course’s champion to earn a big ember bonus. Finish lesson units to open new courses.'),
      factsUnlocked(p) && !p.settings.readingLevel ? readerPicker(() => go(raceMap)) : null,
      button(h('span', { class: 'class-card-inner' }, h('span', { class: 'class-card-icon', 'aria-hidden': 'true' }, '🐉'), h('strong', {}, 'Wing race'), h('small', {}, 'Race your class or family')), () => (sfx.click(), go(classRaceEntry())), 'class-card'),
      h(
        'div',
        { class: 'course-grid' },
        ...COURSES.map((c) => {
          const open = courseUnlocked(p, c.id);
          const beaten = p.rivalsBeaten.includes(c.id);
          const unitName = UNITS.find((u) => u.id === c.unlockUnit)?.title;
          return button(
            h(
              'span',
              { class: 'course-inner' },
              svg(dragonSvg(c.rival.tribe, c.rival.palette, 'adult', open ? 'flap' : ''), 'course-rival'),
              h('strong', {}, c.name),
              h('small', {}, open ? c.blurb : `Finish ${unitName} lessons to open`),
              open ? h('small', { class: beaten ? 'beaten' : 'champion' }, beaten ? `Beat ${c.rival.name}!` : `Champion: ${c.rival.name}`) : null,
            ),
            () => go(race(c.id)),
            'course-card' + (open ? '' : ' locked'),
            { disabled: !open, style: `--s1:${c.sky[0]};--s2:${c.sky[1]};--s3:${c.sky[2]}` },
          );
        }),
      ),
    ),
  );
};

export function race(courseId: string) {
  return (root: HTMLElement): (() => void) => run(root, courseById(courseId));
}

/** A live class race on the given course. */
export function liveRace(courseId: string, live: LiveRace) {
  return (root: HTMLElement): (() => void) => run(root, courseById(courseId), live);
}

function run(root: HTMLElement, course: Course, live?: LiveRace): () => void {
  const p = profile();
  const me = activeDragon(p);
  const input = inputMode();
  const touch = isTouch(input);
  const tune = perkTuning(perkTribe(me));
  const best = touch ? p.totals.bestTouchWpm : p.totals.bestWpm;
  const words = best < (touch ? 14 : 20) ? 14 : 22;
  const known = knownLetters(p);
  // Once every letter is learned, races are real facts instead of practice sentences.
  const fact = live ? (live.factId ? factById(live.factId) ?? null : null) : factsUnlocked(p) ? pickFact(p.settings.readingLevel ?? 'younger', p.factsSeen, weakKeys(p.keyStats, [...known]), Math.random, touch) : null;
  const text = live ? live.text : fact ? (capitalsKnown(p) ? fact.text : fact.text.toLowerCase()) : buildRaceText(known, words, Math.random, weakKeys(p.keyStats, [...known]));
  const len = text.length;

  const lanes = h('div', { class: 'lanes' });
  const trailOf = new Map<HTMLElement, string[]>();
  const makeLane = (name: string, tribe: TribeId, palette: number, stage: Stage, cls = '', skin?: 'starglint', marking = 0, stars = 0): HTMLElement => {
    const racer = h('div', { class: `racer ${cls}` }, svg(dragonSvg(tribe, palette, stage, 'flap', skin, marking, stars, true), 'racer-art'), h('span', { class: 'racer-name' }, name));
    lanes.append(h('div', { class: 'lane' }, racer));
    trailOf.set(racer, skin === 'starglint' ? STARGLINT_LOOKS[STARGLINT_LOOK].trail : TRAIL_COLORS[tribe]);
    return racer;
  };

  const speeds = live ? [] : ghostSpeeds(p, input);
  const r = course.rival;
  const ghosts: Racer[] = live ? [] : [
    { name: r.name, wpm: rivalSpeed(course.id, input), phase: 0.4, rival: true, el: makeLane(r.name, r.tribe, r.palette, 'adult', 'rival') },
    ...speeds.map((wpm, i) => {
      const g = GHOST_NAMES[(i + COURSES.indexOf(course)) % GHOST_NAMES.length];
      return { name: g.name, wpm, phase: 1.7 + i * 1.9, el: makeLane(g.name, g.tribe, g.palette, 'adult') };
    }),
  ];
  const classmates = (live?.rivals ?? []).map((c) => ({
    id: c.id,
    el: makeLane(c.name, c.look?.tribe ?? 'emberback', c.look?.palette ?? 0, c.look?.stage ?? 'young', 'classmate', c.look?.skin, c.look?.marking ?? 0, c.look?.stars ?? 0),
  }));
  if (best > 0 && !live) {
    ghosts.push({ name: 'Your best', wpm: best, phase: 4.2, el: makeLane('Your best', me?.tribe ?? 'emberback', me?.palette ?? 0, 'adult', 'ghost-best', me?.skin, me?.marking) });
  }
  const meEl = makeLane(me ? me.name : 'You', me?.tribe ?? 'emberback', me?.palette ?? 0, me ? stageFor(me.xp) : 'hatchling', 'you', me?.skin, me?.marking, me?.stars);

  const fx = new ParticleField();
  fx.enabled = !p.settings.reducedMotion;
  const sky = h('div', { class: `sky sky-${course.id}` }, h('div', { class: 'layer sun' }), h('div', { class: 'layer clouds' }), h('div', { class: 'layer clouds-near' }), fx.canvas, h('div', { class: 'layer mountains' }), h('div', { class: 'layer hills' }), h('div', { class: 'layer speed-lines' }), h('div', { class: 'finish-line' }), lanes);
  // The month's season paints the sky; the course keeps its own hills and peaks.
  const skyColors = seasonAt()?.sky ?? course.sky;
  sky.style.background = `linear-gradient(180deg, ${skyColors[0]} 0%, ${skyColors[1]} 45%, ${skyColors[2]} 100%)`;
  (sky.querySelector('.mountains') as HTMLElement).style.backgroundImage = mountainsUri(course.ground, course.peak);
  (sky.querySelector('.hills') as HTMLElement).style.backgroundImage = hillsUri(course.ground);
  const countdown = h('div', { class: 'countdown' }, h('div', {}, h('small', { class: 'taunt' }, live ? 'Class race!' : `${r.name}: “${r.taunt}”`), h('div', { class: 'count' }, '3')));
  const countEl = countdown.querySelector('.count') as HTMLElement;
  const meter = h('div', { class: 'flame-meter' }, h('span', {}));
  const stats = h('div', { class: 'live-stats' });
  const track = h('div', { class: 'track' }, sky, countdown);

  let started = false;
  let finished = false;
  let raceStart = 0;
  const st = newRaceState();
  let raf = 0;
  let bgOffset = 0;
  let lastFrame = performance.now();

  // Where a racer's tail is, in the particle canvas's coordinates.
  const tailOf = (el: HTMLElement): { x: number; y: number; w: number; h: number } => {
    const a = el.getBoundingClientRect();
    const b = fx.canvas.getBoundingClientRect();
    return { x: a.left - b.left + a.width * 0.07, y: a.top - b.top + a.height * 0.62, w: a.width, h: a.height };
  };
  const trailDebt = new Map<HTMLElement, number>();
  const trail = (el: HTMLElement, perSecond: number, dt: number, size: number, speed: number): void => {
    const debt = (trailDebt.get(el) ?? 0) + (perSecond * dt) / 1000;
    const n = Math.floor(debt);
    trailDebt.set(el, debt - n);
    if (!n) return;
    const t = tailOf(el);
    const k = t.w / 140;
    fx.emit(t.x, t.y, { count: n, colors: trailOf.get(el) ?? CONFETTI, kind: 'ember', vx: -speed * k, vy: -6, spread: 36 * k, size: size * k, life: 0.75 });
  };

  const myProgress = (): number => Math.max(0, Math.min(1, (view.session.correct + st.bonus) / len));

  const view = createTypingView({
    text,
    input,
    showKeyboard: p.settings.showKeyboard,
    hideHints: hidesHints(me),
    enabled: () => started && !finished,
    onKey: (res) => {
      const dashed = applyRaceKey(st, res, tune, myProgress());
      if (!res.correct) {
        const t = tailOf(meEl);
        fx.emit(t.x + t.w * 0.4, t.y - t.h * 0.1, { count: 6, colors: ['#ffffff', '#ced4da'], kind: 'puff', vx: -30, spread: 50, size: 7, life: 0.6 });
        meEl.classList.remove('wobble-once');
        void meEl.offsetWidth;
        meEl.classList.add('wobble-once');
      }
      if (dashed) {
        sfx.dash();
        const t = tailOf(meEl);
        const colors = trailOf.get(meEl) ?? CONFETTI;
        fx.emit(t.x, t.y, { count: 26, colors, kind: 'streak', vx: -420, spread: 90, size: 5, life: 0.5 });
        fx.emit(t.x + t.w * 0.3, t.y - t.h * 0.1, { count: 40, colors, kind: 'ember', vx: -160, spread: 160, size: 7, life: 0.9 });
        meEl.classList.remove('dashing');
        void meEl.offsetWidth;
        meEl.classList.add('dashing');
      }
      (meter.firstChild as HTMLElement).style.width = pct(st.meter / tune.dashStreak);
      if (myProgress() >= 1) finish();
    },
    onFinish: () => finish(),
  });

  // Racers glide toward their target spot every frame instead of jumping per key,
  // and move with transforms so the browser never has to re-lay out the page.
  const shown = new Map<HTMLElement, number>();
  let trackW = 0;
  const place = (el: HTMLElement, prog: number, dt = 1000): void => {
    const prev = shown.get(el) ?? prog;
    const next = prev + (prog - prev) * (1 - Math.exp(-dt / 110));
    shown.set(el, next);
    el.style.transform = `translate3d(${(next * Math.max(0, trackW - el.offsetWidth)).toFixed(1)}px, 0, 0)`;
  };

  const frame = (now: number): void => {
    const dt = now - lastFrame;
    lastFrame = now;
    trackW = lanes.clientWidth - 14;
    fx.resize();
    if (started && !finished) {
      const t = now - raceStart;
      for (const g of ghosts) place(g.el, Math.min(1, ghostProgress(g.wpm, t, len) + 0.004 * Math.sin(t / 900 + g.phase)), dt);
      for (const c of classmates) place(c.el, live!.progress(c.id, now), dt);
      place(meEl, myProgress(), dt);
      live?.report(myProgress(), t);
      // Wings beat faster the faster you type.
      meEl.style.setProperty('--flap', `${Math.max(0.36, 0.75 - view.session.rollingWpm(now) / 90).toFixed(2)}s`);
      stats.textContent = `${Math.round(view.session.wpm())} WPM · ${pct(view.session.accuracy())} accuracy`;
      bgOffset += (0.02 + view.session.rollingWpm(now) / 600) * dt;
      sky.style.setProperty('--bg', `${-bgOffset}px`);
      const wpmNow = view.session.rollingWpm(now);
      sky.style.setProperty('--speed', Math.min(1, wpmNow / 40).toFixed(2));
      trail(meEl, 12 + Math.min(40, wpmNow) * 0.9, dt, 4 + Math.min(3, wpmNow / 15), 80 + Math.min(60, wpmNow) * 3);
      for (const g of ghosts) trail(g.el, 7, dt, 3.5, 60);
      for (const c of classmates) trail(c.el, 7, dt, 3.5, 60);
    } else if (finished) {
      place(meEl, 1, dt);
      for (const c of classmates) place(c.el, live!.progress(c.id, now), dt);
    }
    fx.step(dt);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  // Countdown, then the race clock starts for everyone at "Fly!".
  let n = 3;
  const cd = window.setInterval(() => {
    n--;
    if (n > 0) {
      countEl.textContent = String(n);
      sfx.click();
    } else {
      clearInterval(cd);
      countEl.textContent = 'Fly!';
      sfx.dash();
      started = true;
      raceStart = performance.now();
      setTimeout(() => countdown.remove(), 600);
    }
  }, 900);
  sfx.click();
  view.focus();

  function finish(): void {
    if (finished) return;
    finished = true;
    place(meEl, 1, 120);
    const myMs = performance.now() - raceStart;
    const sum = view.session.summary();
    // A ghost beats you only if it would have crossed the line first.
    const ahead = ghosts.filter((g) => finishTime(g.wpm, len) < myMs);
    const placeNum = live ? live.place(myMs) : ahead.length + 1;
    const beatRival = !live && !ahead.some((g) => g.rival);
    // A tap keyboard race switches to 'keyboard' if real keys were used, so records stay fair.
    const typedWith = view.input;
    const prevBest = isTouch(typedWith) ? p.totals.bestTouchWpm : p.totals.bestWpm;
    const before = earnedIds(p);
    const reward = recordRace(p, sum, placeNum, { input: typedWith, courseId: live ? 'class' : course.id, beatRival });
    if (live) live.finish(myMs, sum, placeNum, typedWith);
    else reportToClass(p, { kind: 'race', wpm: sum.wpm, accuracy: sum.accuracy, place: placeNum, racers: ghosts.length + 1, touch: isTouch(typedWith) });
    const newFact = fact ? recordFact(p, fact.id) : false;
    const fresh = claimNewAchievements(p, before);
    persist();
    refreshEmbers();
    if (placeNum === 1) sfx.win();
    {
      const { w } = fx.size;
      const t = tailOf(meEl);
      fx.emit(t.x + t.w * 0.6, t.y, { count: 60, colors: trailOf.get(meEl) ?? CONFETTI, kind: 'spark', vx: 60, spread: 360, size: 6, life: 1.1 });
      if (placeNum === 1) for (let i = 0; i < 6; i++) fx.emit((w * (i + 0.5)) / 6, -6, { count: 24, colors: CONFETTI, kind: 'confetti', vy: 40, spread: 220, size: 5, life: 2.4 });
    }

    const rewards: RewardCard[] = [{ art: flameSvg(), title: 'Embers', value: reward.embers, tone: 'ember' }];
    if (reward.rivalFirstWin) rewards.push({ art: crownSvg(), title: `${r.name} beaten!`, value: 'Champion!', note: '+25 bonus embers', tone: 'gold' });
    if (reward.warmthAdded && p.nest) {
      const ready = eggProgress(p) >= 1;
      rewards.push({ art: eggSvg(p.nest.tribe, eggProgress(p), p.nest.seed), title: ready ? 'Ready to hatch!' : 'Egg warmth', value: reward.warmthAdded, note: ready ? 'Visit your nest' : `${pct(eggProgress(p))} warm`, tone: 'warm' });
    }
    for (const c of reward.seasonDone ?? []) rewards.push({ art: medalSvg('gold', '🌟'), title: 'Season challenge', value: `+${CHALLENGE_EMBERS}`, note: c.text, tone: 'gold' });
    if (reward.newEgg) rewards.push({ art: eggSvg(reward.newEgg, 0, 5), title: `${TRIBES[reward.newEgg].name} egg`, value: 'New egg!', tone: 'egg' });
    // One achievement gets its own card; several share one card so the results stay short.
    if (fresh.length === 1) rewards.push({ art: medalSvg(fresh[0].medal, fresh[0].icon), title: `New title “${fresh[0].title}”`, value: 'Achievement!', note: fresh[0].how, tone: 'gold' });
    else if (fresh.length > 1) rewards.push({ art: medalSvg(fresh[0].medal, '🏅'), title: 'New achievements', value: `+${fresh.length}`, note: 'See them in Progress', tone: 'gold' });
    if (reward.grewTo && me) rewards.push({ art: dragonSvg(me.tribe, me.palette, reward.grewTo, '', me.skin, me.marking), title: `${me.name} grew!`, value: 'Grew up!', note: `Now a ${reward.grewTo} dragon`, tone: 'grow' });

    const lines: string[] = [];
    if (!reward.rivalFirstWin && !beatRival && !live) lines.push(`${r.name} flies at about ${Math.round(rivalSpeed(course.id, input))} WPM. You’ll catch them!`);

    const factCard = fact
      ? h(
          'div',
          { class: 'fact-card' },
          h('strong', {}, 'Did you know?'),
          h('p', {}, fact.text),
          h('small', { class: 'fine' }, `${TOPIC_LABEL[fact.topic]} · ${newFact ? `New in your Fact Book (${p.factsSeen.length} of ${FACTS.length})` : 'Already in your Fact Book'}`),
          p.settings.readingLevel === 'older' && fact.source.name ? h('small', { class: 'fine' }, `Source: ${fact.source.name}`) : null,
        )
      : null;

    const celebrate = celebration({
      place: placeNum,
      racers: live ? live.racers : ghosts.length + 1,
      wpm: sum.wpm,
      accuracy: sum.accuracy,
      prevBest,
      newBest: !!reward.newBest,
      lines,
      rewards,
      dragonArt: dragonSvg(me?.tribe ?? 'emberback', me?.palette ?? 0, me ? stageFor(me.xp) : 'hatchling', 'flap', me?.skin, me?.marking),
      trailColors: trailOf.get(meEl),
      extra: live ? h('div', {}, live.results(), factCard) : factCard,
      reducedMotion: p.settings.reducedMotion,
      actions: live
        ? h('div', { class: 'row' }, reward.eggReady || reward.newEgg ? button('Go to nest', () => go(nest), 'btn ghost') : null, button('Back to class', () => live.back()))
        : h(
        'div',
        { class: 'row' },
        button('Map', () => go(raceMap), 'btn ghost'),
        fact ? button('Fact Book', () => go(codex), 'btn ghost') : null,
        reward.eggReady || reward.newEgg ? button('Go to nest', () => go(nest), 'btn ghost') : null,
        button('Race again', () => go(race(course.id))),
      ),
    });
    // Let the finish burst on the track play for a moment first.
    window.setTimeout(() => {
      if (root.isConnected) root.append(celebrate);
    }, p.settings.reducedMotion ? 0 : 700);
  }

  root.append(
    topBar(() => (live ? live.back() : go(raceMap))),
    h(
      'main',
      { class: 'race' },
      h('div', { class: 'race-head' }, h('h1', {}, course.name), stats, h('div', { class: 'meter-wrap' }, h('small', {}, 'Flame dash'), meter)),
      track,
      me ? h('p', { class: 'fine perk-line' }, isStarglint(me) ? (hidesHints(me) ? 'Starglint’s special is on: no key hints!' : 'Starglint’s special is off. Turn it on in the nest.') : `${me.name}’s perk: ${perkText(me)}`) : null,
      view.el,
    ),
  );

  return () => {
    cancelAnimationFrame(raf);
    clearInterval(cd);
    view.destroy();
    live?.leave();
  };
}
