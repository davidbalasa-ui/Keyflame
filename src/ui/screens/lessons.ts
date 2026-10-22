import { LESSONS, UNITS, buildLessonText, lessonsInUnit, starsFor, type Lesson } from '../../content/lessons';
import { weakKeys } from '../../engine/typing';
import { TRIBES, eggSvg } from '../../game/dragons';
import { lessonUnlocked, recordLesson } from '../../game/progress';
import { go, persist, profile } from '../app';
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
    const view = createTypingView({
      text,
      showKeyboard: p.settings.showKeyboard,
      onFinish: (s) => {
        clearInterval(timer);
        const sum = s.summary();
        const stars = starsFor(lesson, sum.wpm, sum.accuracy);
        const reward = recordLesson(p, lesson, sum, stars);
        persist();
        refreshEmbers();
        if (stars > 0) sfx.win();
        showResult(root, lesson, sum.wpm, sum.accuracy, stars, reward.embers, reward.newEgg ? TRIBES[reward.newEgg].name : null, reward.eggReady);
      },
    });
    const tick = (): void => {
      const s = view.session;
      stats.textContent = `${Math.round(s.wpm())} WPM · ${pct(s.accuracy())} accuracy`;
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
          ? h('p', { class: 'new-keys' }, 'New keys: ', ...lesson.newKeys.filter((k) => k !== ' ').map((k) => h('kbd', {}, k.toUpperCase())), lesson.id === 'L1' ? ' Rest your pointer fingers on the bumps on F and J.' : '')
          : h('p', { class: 'new-keys' }, 'Keep your eyes on the screen, not your fingers.'),
        stats,
        view.el,
      ),
    );
    return () => {
      clearInterval(timer);
      view.destroy();
    };
  };
}

function showResult(root: HTMLElement, lesson: Lesson, wpm: number, accuracy: number, stars: number, embers: number, newEgg: string | null, eggReady: boolean): void {
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
      h('p', {}, `${Math.round(wpm)} WPM · ${pct(accuracy)} accuracy · +${embers} embers`),
      stars === 0 ? h('p', { class: 'fine' }, 'Reach 90% accuracy to pass. Slow down a little; accuracy comes first, speed follows.') : null,
      stars > 0 && stars < 3 ? h('p', { class: 'fine' }, stars === 1 ? 'Get 95% accuracy for the second star.' : `Reach ${lesson.starWpm} WPM at 95% accuracy for the third star.`) : null,
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
