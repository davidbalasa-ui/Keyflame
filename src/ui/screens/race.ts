import { buildRaceText } from '../../content/lessons';
import { COURSES, courseById, type Course } from '../../game/courses';
import { TRIBES, dragonSvg, eggSvg, stageFor, type Stage, type TribeId } from '../../game/dragons';
import { activeDragon, courseUnlocked, ghostProgress, ghostSpeeds, isTouch, knownLetters, recordRace, rivalSpeed } from '../../game/progress';
import { applyRaceKey, finishTime, newRaceState, perkTuning } from '../../game/raceRules';
import { UNITS } from '../../content/lessons';
import { go, inputMode, persist, profile } from '../app';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { createTypingView } from '../typingView';
import { AdSlot } from '../ads';
import { hub, refreshEmbers, topBar } from './hub';
import { nest } from './nest';

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

function mountainsUri(ground: string, peak: string): string {
  const svgText = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300' preserveAspectRatio='none'><path d='M0 300 L0 210 L60 160 L110 200 L170 120 L240 190 L300 150 L360 210 L420 140 L470 110 L520 170 L600 210 L600 300z' fill='${ground}' opacity='0.8'/><path d='M170 120 L185 135 L160 135z M470 110 L488 128 L455 128z' fill='${peak}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svgText)}")`;
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

function run(root: HTMLElement, course: Course): () => void {
  const p = profile();
  const me = activeDragon(p);
  const input = inputMode();
  const touch = isTouch(input);
  const tune = perkTuning(me?.tribe ?? null);
  const best = touch ? p.totals.bestTouchWpm : p.totals.bestWpm;
  const words = best < (touch ? 14 : 20) ? 14 : 22;
  const text = buildRaceText(knownLetters(p), words);
  const len = text.length;

  const lanes = h('div', { class: 'lanes' });
  const makeLane = (name: string, tribe: TribeId, palette: number, stage: Stage, cls = '', skin?: 'starfire'): HTMLElement => {
    const racer = h('div', { class: `racer ${cls}` }, svg(dragonSvg(tribe, palette, stage, 'flap', skin), 'racer-art'), h('span', { class: 'racer-name' }, name));
    lanes.append(h('div', { class: 'lane' }, racer));
    return racer;
  };

  const speeds = ghostSpeeds(p, input);
  const r = course.rival;
  const ghosts: Racer[] = [
    { name: r.name, wpm: rivalSpeed(course.id, input), phase: 0.4, rival: true, el: makeLane(r.name, r.tribe, r.palette, 'adult', 'rival') },
    ...speeds.map((wpm, i) => {
      const g = GHOST_NAMES[(i + COURSES.indexOf(course)) % GHOST_NAMES.length];
      return { name: g.name, wpm, phase: 1.7 + i * 1.9, el: makeLane(g.name, g.tribe, g.palette, 'adult') };
    }),
  ];
  if (best > 0) {
    ghosts.push({ name: 'Your best', wpm: best, phase: 4.2, el: makeLane('Your best', me?.tribe ?? 'emberback', me?.palette ?? 0, 'adult', 'ghost-best', me?.skin) });
  }
  const meEl = makeLane(me ? me.name : 'You', me?.tribe ?? 'emberback', me?.palette ?? 0, me ? stageFor(me.xp) : 'hatchling', 'you', me?.skin);

  const sky = h('div', { class: 'sky' }, h('div', { class: 'layer clouds' }), h('div', { class: 'layer mountains' }), h('div', { class: 'finish-line' }), lanes);
  sky.style.background = `linear-gradient(180deg, ${course.sky[0]} 0%, ${course.sky[1]} 45%, ${course.sky[2]} 100%)`;
  (sky.querySelector('.mountains') as HTMLElement).style.backgroundImage = mountainsUri(course.ground, course.peak);
  const countdown = h('div', { class: 'countdown' }, h('div', {}, h('small', { class: 'taunt' }, `${r.name}: “${r.taunt}”`), h('div', { class: 'count' }, '3')));
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

  const myProgress = (): number => Math.max(0, Math.min(1, (view.session.correct + st.bonus) / len));

  const view = createTypingView({
    text,
    input,
    showKeyboard: p.settings.showKeyboard,
    enabled: () => started && !finished,
    onKey: (res) => {
      const dashed = applyRaceKey(st, res, tune, myProgress());
      if (!res.correct) {
        meEl.classList.remove('wobble-once');
        void meEl.offsetWidth;
        meEl.classList.add('wobble-once');
      }
      if (dashed) {
        sfx.dash();
        meEl.classList.remove('dashing');
        void meEl.offsetWidth;
        meEl.classList.add('dashing');
      }
      (meter.firstChild as HTMLElement).style.width = pct(st.meter / tune.dashStreak);
      if (myProgress() >= 1) finish();
    },
    onFinish: () => finish(),
  });

  const place = (el: HTMLElement, prog: number): void => {
    el.style.left = `calc((100% - var(--rw)) * ${prog.toFixed(4)})`;
  };

  const frame = (now: number): void => {
    const dt = now - lastFrame;
    lastFrame = now;
    if (started && !finished) {
      const t = now - raceStart;
      for (const g of ghosts) place(g.el, Math.min(1, ghostProgress(g.wpm, t, len) + 0.004 * Math.sin(t / 900 + g.phase)));
      place(meEl, myProgress());
      stats.textContent = `${Math.round(view.session.wpm())} WPM · ${pct(view.session.accuracy())} accuracy`;
      bgOffset += (0.02 + view.session.rollingWpm(now) / 600) * dt;
      sky.style.setProperty('--bg', `${-bgOffset}px`);
    }
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
    place(meEl, 1);
    const myMs = performance.now() - raceStart;
    const sum = view.session.summary();
    // A ghost beats you only if it would have crossed the line first.
    const ahead = ghosts.filter((g) => finishTime(g.wpm, len) < myMs);
    const placeNum = ahead.length + 1;
    const beatRival = !ahead.some((g) => g.rival);
    const reward = recordRace(p, sum, placeNum, { input, courseId: course.id, beatRival });
    persist();
    refreshEmbers();
    if (placeNum === 1) sfx.win();

    const ord = ['1st', '2nd', '3rd', '4th', '5th'][placeNum - 1];
    const modal = h(
      'div',
      { class: 'modal-backdrop' },
      h(
        'div',
        { class: 'modal' },
        h('h2', {}, placeNum === 1 ? 'You won the race!' : `You finished ${ord} of ${ghosts.length + 1}`),
        reward.rivalFirstWin ? h('p', { class: 'reward' }, `You beat ${r.name}, the ${course.name} champion! +25 bonus embers`) : !beatRival ? h('p', { class: 'fine' }, `${r.name} flies at about ${Math.round(rivalSpeed(course.id, input))} WPM. You’ll catch them!`) : null,
        reward.newBest ? h('p', { class: 'reward' }, 'New personal best!') : null,
        h('p', {}, `${Math.round(sum.wpm)} WPM · ${pct(sum.accuracy)} accuracy`),
        h('p', {}, `+${reward.embers} embers${reward.warmthAdded ? ` · +${reward.warmthAdded} warmth for your egg` : ''}`),
        reward.grewTo && me ? h('p', { class: 'reward' }, `${me.name} grew into a ${reward.grewTo} dragon!`) : null,
        reward.newEgg ? h('div', { class: 'reward' }, svg(eggSvg(reward.newEgg, 0, 5), 'mini-egg'), `You earned a ${TRIBES[reward.newEgg].name} egg!`) : null,
        reward.eggReady ? h('p', { class: 'reward' }, 'Your egg is ready to hatch!') : null,
        h(
          'div',
          { class: 'row' },
          button('Map', () => go(raceMap), 'btn ghost'),
          reward.eggReady || reward.newEgg ? button('Go to nest', () => go(nest), 'btn ghost') : null,
          button('Race again', () => go(race(course.id))),
        ),
        AdSlot('results'),
      ),
    );
    root.append(modal);
  }

  root.append(
    topBar(() => go(raceMap)),
    h(
      'main',
      { class: 'race' },
      h('div', { class: 'race-head' }, h('h1', {}, course.name), stats, h('div', { class: 'meter-wrap' }, h('small', {}, 'Flame dash'), meter)),
      track,
      me ? h('p', { class: 'fine perk-line' }, `${me.name}’s perk: ${TRIBES[me.tribe].perk}`) : null,
      view.el,
    ),
  );

  return () => {
    cancelAnimationFrame(raf);
    clearInterval(cd);
    view.destroy();
  };
}
