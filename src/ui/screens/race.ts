import { buildRaceText } from '../../content/lessons';
import { TRIBES, dragonSvg, stageFor, type TribeId } from '../../game/dragons';
import { activeDragon, ghostProgress, ghostSpeeds, knownLetters, recordRace } from '../../game/progress';
import { go, persist, profile } from '../app';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { createTypingView } from '../typingView';
import { hub, refreshEmbers, topBar } from './hub';
import { nest } from './nest';

interface Racer {
  name: string;
  tribe: TribeId;
  palette: number;
  wpm: number;
  el: HTMLElement;
  /** Small per-racer wobble so ghosts don't move like robots. */
  phase: number;
}

const RIVALS: Array<{ name: string; tribe: TribeId; palette: number }> = [
  { name: 'Brookdrift', tribe: 'tidefin', palette: 1 },
  { name: 'Sablestorm', tribe: 'stormcrest', palette: 0 },
  { name: 'Thistlefang', tribe: 'mossclaw', palette: 1 },
];

/** Flame meter: correct keys in a row needed for a dash. */
const DASH_STREAK = 20;
const DASH_BONUS = 6;

export interface PerkTuning {
  dashStreak: number;
  dashBonus: number;
  typoCost: number;
  longWordBonus: number;
}

export function perkTuning(tribe: TribeId | null): PerkTuning {
  return {
    dashStreak: tribe === 'emberback' ? 16 : DASH_STREAK,
    dashBonus: tribe === 'stormcrest' ? 9 : DASH_BONUS,
    typoCost: tribe === 'tidefin' ? 0.4 : 1,
    longWordBonus: tribe === 'mossclaw' ? 1 : 0,
  };
}

export const race = (root: HTMLElement): (() => void) => {
  const p = profile();
  const me = activeDragon(p);
  const tune = perkTuning(me?.tribe ?? null);
  const words = p.totals.bestWpm < 20 ? 16 : 24;
  const text = buildRaceText(knownLetters(p), words);
  const len = text.length;

  const speeds = ghostSpeeds(p);
  const lanes = h('div', { class: 'lanes' });
  const makeLane = (name: string, tribe: TribeId, palette: number, stage: Parameters<typeof dragonSvg>[2], you = false): HTMLElement => {
    const racer = h('div', { class: 'racer' + (you ? ' you' : '') }, svg(dragonSvg(tribe, palette, stage, 'flap'), 'racer-art'), h('span', { class: 'racer-name' }, name));
    lanes.append(h('div', { class: 'lane' }, racer));
    return racer;
  };

  const ghosts: Racer[] = RIVALS.map((r, i) => ({ ...r, wpm: speeds[i], phase: i * 1.7, el: makeLane(r.name, r.tribe, r.palette, 'adult') }));
  if (p.totals.bestWpm > 0) {
    ghosts.push({ name: 'Your best', tribe: me?.tribe ?? 'emberback', palette: me?.palette ?? 0, wpm: p.totals.bestWpm, phase: 4.2, el: makeLane('Your best', me?.tribe ?? 'emberback', me?.palette ?? 0, 'adult') });
    ghosts.at(-1)!.el.classList.add('ghost-best');
  }
  const meEl = makeLane(me ? me.name : 'You', me?.tribe ?? 'emberback', me?.palette ?? 0, me ? stageFor(me.xp) : 'hatchling', true);

  const sky = h('div', { class: 'sky' }, h('div', { class: 'layer clouds' }), h('div', { class: 'layer mountains' }), h('div', { class: 'finish-line' }), lanes);
  const countdown = h('div', { class: 'countdown' }, '3');
  const meter = h('div', { class: 'flame-meter' }, h('span', {}));
  const stats = h('div', { class: 'live-stats' });
  const track = h('div', { class: 'track' }, sky, countdown);

  let started = false;
  let finished = false;
  let raceStart = 0;
  let bonus = 0;
  let meterCount = 0;
  let wordLen = 0;
  let raf = 0;
  let bgOffset = 0;
  let lastFrame = performance.now();

  const myProgress = (): number => Math.max(0, Math.min(1, (view.session.correct + bonus) / len));

  const view = createTypingView({
    text,
    showKeyboard: p.settings.showKeyboard,
    enabled: () => started && !finished,
    onKey: (r) => {
      if (!r.correct) {
        bonus -= tune.typoCost;
        meterCount = 0;
        meEl.classList.remove('wobble-once');
        void meEl.offsetWidth;
        meEl.classList.add('wobble-once');
      } else {
        meterCount++;
        if (r.expected === ' ') {
          if (wordLen >= 6) bonus += tune.longWordBonus;
          wordLen = 0;
        } else wordLen++;
        if (meterCount >= tune.dashStreak) {
          meterCount = 0;
          bonus += tune.dashBonus;
          sfx.dash();
          meEl.classList.remove('dashing');
          void meEl.offsetWidth;
          meEl.classList.add('dashing');
        }
      }
      (meter.firstChild as HTMLElement).style.width = pct(meterCount / tune.dashStreak);
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
    if (started) {
      const t = finished ? 0 : now - raceStart;
      if (!finished) {
        for (const g of ghosts) place(g.el, Math.min(1, ghostProgress(g.wpm, t, len) + 0.004 * Math.sin(t / 900 + g.phase)));
        place(meEl, myProgress());
        stats.textContent = `${Math.round(view.session.wpm())} WPM · ${pct(view.session.accuracy())} accuracy`;
      }
      const speed = finished ? 0 : 0.02 + view.session.rollingWpm(now) / 600;
      bgOffset += speed * dt;
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
      countdown.textContent = String(n);
      sfx.click();
    } else {
      clearInterval(cd);
      countdown.textContent = 'Fly!';
      sfx.dash();
      started = true;
      raceStart = performance.now();
      setTimeout(() => countdown.remove(), 600);
    }
  }, 800);
  sfx.click();

  function finish(): void {
    if (finished) return;
    finished = true;
    place(meEl, 1);
    const myMs = performance.now() - raceStart;
    const sum = view.session.summary();
    // A ghost beats you only if it would have crossed the line first.
    const ahead = ghosts.filter((g) => (len / ((g.wpm * 5) / 60000)) < myMs).length;
    const placeNum = ahead + 1;
    const reward = recordRace(p, sum, placeNum);
    persist();
    refreshEmbers();
    if (placeNum === 1) sfx.win();
    showResult(placeNum, ghosts.length + 1, sum.wpm, sum.accuracy, reward.embers, reward.warmthAdded, reward.eggReady, reward.grewTo);
  }

  function showResult(placeNum: number, of: number, wpm: number, accuracy: number, embers: number, warmth: number, eggReady: boolean, grew: string | null): void {
    const ord = ['1st', '2nd', '3rd', '4th', '5th'][placeNum - 1];
    const best = wpm >= p.totals.bestWpm - 0.01 && p.totals.races > 1;
    const modal = h(
      'div',
      { class: 'modal-backdrop' },
      h(
        'div',
        { class: 'modal' },
        h('h2', {}, placeNum === 1 ? 'You won the race!' : `You finished ${ord} of ${of}`),
        best ? h('p', { class: 'reward' }, 'New personal best!') : null,
        h('p', {}, `${Math.round(wpm)} WPM · ${pct(accuracy)} accuracy`),
        h('p', {}, `+${embers} embers${warmth ? ` · +${warmth} warmth for your egg` : ''}`),
        grew && me ? h('p', { class: 'reward' }, `${me.name} grew into a ${grew} dragon!`) : null,
        eggReady ? h('p', { class: 'reward' }, 'Your egg is ready to hatch!') : null,
        h(
          'div',
          { class: 'row' },
          button('Hub', () => go(hub), 'btn ghost'),
          eggReady ? button('Go to nest', () => go(nest), 'btn ghost') : null,
          button('Race again', () => go(race)),
        ),
      ),
    );
    root.append(modal);
  }

  root.append(
    topBar(() => go(hub)),
    h('main', { class: 'race' }, h('div', { class: 'race-head' }, h('h1', {}, 'Volcano Canyon'), stats, h('div', { class: 'meter-wrap' }, h('small', {}, 'Flame dash'), meter)), track, view.el),
  );
  if (me) meEl.title = `${me.name} (${TRIBES[me.tribe].perk})`;

  return () => {
    cancelAnimationFrame(raf);
    clearInterval(cd);
    view.destroy();
  };
};
