import { LESSONS, UNITS, buildLessonText, lessonsInUnit, starsFor, type Lesson } from '../../content/lessons';
import { weakKeys } from '../../engine/typing';
import { TRIBES, eggSvg } from '../../game/dragons';
import { applyPlacement, lessonUnlocked, recordLesson, recordPractice } from '../../game/progress';
import { PASSAGES } from '../../content/words';
import { go, inputMode, persist, profile } from '../app';
import { button, h, pct, svg } from '../dom';
import { sfx } from '../sound';
import { createTypingView } from '../typingView';
import { hub, refreshEmbers, topBar } from './hub';
import { nest } from './nest';

const starText = (n: number): string => '★'.repeat(n) + '☆'.repeat(3 - n);

export const lessons = (root: HTMLElement): void => {
  const p = profile();
  const weak = weakKeys(p.keyStats, 'abcdefghijklmnopqrstuvwxyz;,./'.split(''));
  root.append(
    topBar(() => go(hub)),
    h(
      'main',
      { class: 'lessons' },
      h('h1', {}, 'Lessons'),
      Object.keys(p.lessons).length < 3
        ? h('div', { class: 'placement-cta' }, h('span', {}, 'Already know some typing? '), button('Take the 1-minute check', () => go(placement), 'btn small'))
        : null,
      weak.length ? h('p', { class: 'tricky' }, 'Tricky keys to practice: ', ...weak.map((k) => h('kbd', {}, k.toUpperCase()))) : null,
      ...UNITS.map((u) => {
        const list = lessonsInUnit(u.id);
        const earned = p.unitsRewarded.includes(u.id);
        return h(
          'section',
          { class: 'unit' },
          h(
            'div',
            { class: 'unit-head' },
            h('div', {}, h('h2', {}, u.title), h('p', {}, u.blurb)),
            h('div', { class: 'unit-reward' + (earned ? ' earned' : '') }, svg(eggSvg(u.reward, 0, 3), 'mini-egg'), h('small', {}, earned ? 'Egg earned' : `Finish to earn a ${TRIBES[u.reward].name} egg`)),
          ),
          h(
            'div',
            { class: 'lesson-grid' },
            ...list.map((l) => {
              const idx = LESSONS.indexOf(l);
              const open = lessonUnlocked(p, idx);
              const res = p.lessons[l.id];
              return button(
                h('span', {}, h('strong', {}, l.title), h('small', { class: 'stars' }, open ? starText(res?.stars ?? 0) : 'Locked')),
                () => go(playLesson(l)),
                'lesson-tile' + (open ? '' : ' locked') + (res?.stars ? ' passed' : ''),
                { disabled: !open },
              );
            }),
          ),
        );
      }),
    ),
  );
};

export function playLesson(lesson: Lesson) {
  return (root: HTMLElement): (() => void) => {
    const p = profile();
    const text = buildLessonText(lesson, weakKeys(p.keyStats, lesson.keys));
    const stats = h('div', { class: 'live-stats' });
    let timer = 0;
    const relaxed = p.settings.relaxed;
    const input = inputMode();
    const view = createTypingView({
      text,
      input,
      relaxed,
      showKeyboard: p.settings.showKeyboard,
      onFinish: (s) => {
        clearInterval(timer);
        const sum = s.summary();
        // Relaxed mode has no clock, so it can earn up to two stars.
        const stars = starsFor(lesson, relaxed ? 0 : sum.wpm, sum.accuracy);
        const reward = recordLesson(p, lesson, sum, stars);
        persist();
        refreshEmbers();
        if (stars > 0) sfx.win();
        showResult(root, lesson, relaxed ? null : sum.wpm, sum.accuracy, stars, reward.embers, reward.newEgg ? TRIBES[reward.newEgg].name : null, reward.eggReady);
      },
    });
    const tick = (): void => {
      const s = view.session;
      stats.textContent = relaxed ? `Relaxed mode · ${pct(s.accuracy())} accuracy` : `${Math.round(s.wpm())} WPM · ${pct(s.accuracy())} accuracy`;
    };
    timer = window.setInterval(tick, 250);
    tick();
    root.append(
      topBar(() => go(lessons)),
      h(
        'main',
        { class: 'play-lesson' },
        h('h1', {}, lesson.title),
        lesson.newKeys.filter((k) => k !== ' ').length
          ? h('p', { class: 'new-keys' }, 'New keys: ', ...lesson.newKeys.filter((k) => k !== ' ').map((k) => h('kbd', {}, k.toUpperCase())), lesson.id === 'L1' ? (input === 'keyboard' ? ' Rest your pointer fingers on the bumps on F and J.' : ' Hold your device with both hands and tap with your thumbs.') : '')
          : h('p', { class: 'new-keys' }, 'Keep your eyes on the screen, not your fingers.'),
        stats,
        view.el,
      ),
    );
    view.focus();
    return () => {
      clearInterval(timer);
      view.destroy();
    };
  };
}

function showResult(root: HTMLElement, lesson: Lesson, wpm: number | null, accuracy: number, stars: number, embers: number, newEgg: string | null, eggReady: boolean): void {
  const idx = LESSONS.indexOf(lesson);
  const next = LESSONS[idx + 1];
  const modal = h(
    'div',
    { class: 'modal-backdrop' },
    h(
      'div',
      { class: 'modal' },
      h('h2', {}, stars > 0 ? 'Lesson passed!' : 'Almost there'),
      h('p', { class: 'big-stars' }, starText(stars)),
      h('p', {}, `${wpm === null ? '' : `${Math.round(wpm)} WPM · `}${pct(accuracy)} accuracy · +${embers} embers`),
      stars === 0 ? h('p', { class: 'fine' }, 'Reach 90% accuracy to pass. Slow down a little; accuracy comes first, speed follows.') : null,
      stars > 0 && stars < 3 ? h('p', { class: 'fine' }, stars === 1 ? 'Get 95% accuracy for the second star.' : wpm === null ? 'Turn off relaxed mode in Settings to go for the third star.' : `Reach ${lesson.starWpm} WPM at 95% accuracy for the third star.`) : null,
      newEgg ? h('p', { class: 'reward' }, `You earned a ${newEgg} egg! It is waiting in your nest.`) : null,
      eggReady ? h('p', { class: 'reward' }, 'Your egg is ready to hatch!') : null,
      h(
        'div',
        { class: 'row' },
        button('Try again', () => go(playLesson(lesson)), 'btn ghost'),
        eggReady || newEgg ? button('Go to nest', () => go(nest), 'btn ghost') : null,
        stars > 0 && next ? button('Next lesson', () => go(playLesson(next))) : button('All lessons', () => go(lessons)),
      ),
    ),
  );
  root.append(modal);
}

/** A one-minute check that skips lessons the player already knows. */
export const placement = (root: HTMLElement): (() => void) => {
  const p = profile();
  const text = PASSAGES.slice(0, 4).join(' ');
  const LIMIT = 60000;
  const stats = h('div', { class: 'live-stats' }, 'The clock starts on your first key.');
  let done = false;
  const view = createTypingView({ text, input: inputMode(), showKeyboard: p.settings.showKeyboard, onFinish: () => finish() });
  const timer = window.setInterval(() => {
    const s = view.session;
    if (s.startedAt === null) return;
    const left = Math.max(0, LIMIT - s.elapsedMs());
    stats.textContent = `${Math.ceil(left / 1000)} seconds left · ${Math.round(s.wpm())} WPM`;
    if (left === 0) finish();
  }, 200);

  function finish(): void {
    if (done) return;
    done = true;
    clearInterval(timer);
    const sum = view.session.summary();
    recordPractice(p, sum);
    const units = applyPlacement(p, sum.wpm, sum.accuracy);
    persist();
    const msg =
      units === 0
        ? sum.accuracy < 0.88
          ? 'Accuracy comes first, so let’s start from the home row and build it up.'
          : 'Let’s start from the home row. You’ll fly through it!'
        : `You skipped ${units} lesson unit${units === 1 ? '' : 's'}, and earned the eggs that come with them!`;
    root.append(
      h(
        'div',
        { class: 'modal-backdrop' },
        h('div', { class: 'modal' }, h('h2', {}, 'Check complete'), h('p', {}, `${Math.round(sum.wpm)} WPM · ${pct(sum.accuracy)} accuracy`), h('p', {}, msg), h('div', { class: 'row' }, button('See lessons', () => go(lessons)))),
      ),
    );
  }

  root.append(
    topBar(() => go(lessons)),
    h('main', { class: 'play-lesson' }, h('h1', {}, 'One-minute typing check'), h('p', { class: 'new-keys' }, 'Type as much as you can, as accurately as you can. No pressure!'), stats, view.el),
  );
  view.focus();
  return () => {
    clearInterval(timer);
    view.destroy();
  };
};
