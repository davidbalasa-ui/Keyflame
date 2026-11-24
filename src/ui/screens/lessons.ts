import { LESSONS, UNITS, buildLessonText, buildTrickyText, buildWarmUp, warmUpDue, lessonsInUnit, starsFor, type Lesson } from '../../content/lessons';
import { weakKeys, type KeyStats } from '../../engine/typing';
import { TRIBES, eggSvg } from '../../game/dragons';
import { claimNewAchievements, earnedIds, type Achievement } from '../../game/achievements';
import { medalSvg } from './achievementsPage';
import { challengesOpen, recordChallenge, knownLetters, activeDragon, applyPlacement, isTouch, placedThrough, keysToHatch, lessonUnlocked, recordLesson, recordPractice } from '../../game/progress';
import { reportToClass } from '../classTrack';
import { PASSAGES } from '../../content/words';
import { go, inputMode, persist, profile } from '../app';
import { button, h, pct, svg, type Child } from '../dom';
import { finishBar } from '../finishBar';
import { CHALLENGES, PACKS, asLesson, buildChallengeText, challengeOpen, levelName, packById, type Challenge } from '../../content/challenges';
import { payImprovements, type Improvement } from '../../game/improve';
import { improvementArt, improvementTitle } from '../improveArt';
import { withTabs } from '../tabBar';
import { sfx } from '../sound';
import { createTypingView } from '../typingView';
import { createLessonFlight } from '../lessonFlight';
import { eggMeter } from '../eggMeter';
import { seasonAt } from '../../content/seasons';
import { hub, refreshEmbers, topBar } from './hub';
import { CHALLENGE_EMBERS } from '../../game/seasons';
import { countPlay } from '../usage';

const starText = (n: number): string => '★'.repeat(n) + '☆'.repeat(3 - n);

export const lessons = (root: HTMLElement): (() => void) => {
  const p = profile();
  root.append(
    topBar(() => go(hub), 'Home'),
    h(
      'main',
      { class: 'lessons' },
      h('h1', {}, 'Lessons'),
      Object.keys(p.lessons).length === 0
        ? h('div', { class: 'first-lesson' }, button(`▶ Start ${LESSONS[0].title}`, () => go(playLesson(LESSONS[0])), 'btn big glow-btn first-lesson-btn'))
        : null,
      Object.keys(p.lessons).length < 3
        ? h('div', { class: 'placement-cta' }, h('span', {}, 'Already know some typing? '), button('Take the 1-minute check', () => go(placement), 'btn small ghost'))
        : null,
      trickyButton(),
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
            h('div', { class: 'unit-reward' + (earned ? ' earned' : '') }, svg(eggSvg(u.reward, 0, 3), 'mini-egg'), h('small', {}, earned ? '✓ Egg earned' : `${TRIBES[u.reward].name} egg`)),
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
      challengeSection(),
    ),
  );
  return withTabs(root, 'home');
};

export function playLesson(lesson: Lesson) {
  return (root: HTMLElement): (() => void) => {
    const p = profile();
    const idx = LESSONS.indexOf(lesson);
    // Every few lessons, a few blue warm-up rings with keys from two or more lessons back.
    const review = idx >= 2 ? new Set(LESSONS[idx - 2].keys.filter((k) => k !== ' ')) : null;
    const warm = review && warmUpDue(idx, p.totals.lessons, lesson.kind) ? buildWarmUp(review, weakKeys(p.keyStats, [...review])) : null;
    const main = buildLessonText(lesson, weakKeys(p.keyStats, lesson.keys));
    const text = warm ? `${warm} ${main}` : main;
    const warmRings = warm ? warm.split(' ').length : 0;
    const stats = h('div', { class: 'live-stats' });
    const egg = eggMeter(p);
    let timer = 0;
    const relaxed = p.settings.relaxed;
    const input = inputMode();
    const view = createTypingView({
      text,
      input,
      relaxed,
      // The first lesson shows the finger picture on every key; later lessons on their new keys.
      coach: lesson.id === LESSONS[0].id ? 'all' : lesson.newKeys.filter((k) => k !== ' '),
      showKeyboard: p.settings.showKeyboard,
      onKey: (r, s) => flight.update(s, r.correct),
      onFinish: (s) => {
        clearInterval(timer);
        egg.update(s.correct);
        // Show the last key's ring too: the counter refreshes only every 250 ms.
        tick();
        const sum = s.summary();
        // Relaxed mode has no clock, so it can earn up to two stars.
        const stars = starsFor(lesson, relaxed ? 0 : sum.wpm, sum.accuracy);
        const before = earnedIds(p);
        // Earlier speeds on this lesson, newest first; relaxed runs have no clock.
        const prevWpms = relaxed ? null : (p.lessonLog ?? []).filter((x) => x.lesson === lesson.id && x.wpm !== null).map((x) => x.wpm as number);
        const reward = recordLesson(p, lesson, sum, stars, relaxed);
        countPlay('lesson', p);
        const better = payImprovements(p, sum, prevWpms);
        reportToClass(p, { kind: 'lesson', lesson: lesson.id, stars, wpm: relaxed ? null : sum.wpm, accuracy: sum.accuracy, touch: isTouch(view.input) });
        const fresh = claimNewAchievements(p, before);
        persist();
        refreshEmbers();
        if (stars > 0) sfx.win();
        showResult(root, lesson, relaxed ? null : sum.wpm, sum.accuracy, stars, reward.embers, reward.newEgg ? TRIBES[reward.newEgg].name : null, reward.eggReady, fresh, reward.seasonDone?.map((c) => c.text), better, missedKeys(sum.keyStats, new Set(lesson.keys)));
      },
    });
    // The flight follows the text the typing view really shows.
    const flight = createLessonFlight(view.session.text, activeDragon(p), seasonAt()?.sky, warmRings);
    const tick = (): void => {
      const s = view.session;
      // No speed on screen during a lesson: accuracy is what counts here.
      stats.textContent = `◎ ${flight.clean}/${flight.rings} rings · ${pct(s.accuracy())} accuracy${relaxed ? ' · Relaxed' : ''}`;
      egg.update(s.correct);
    };
    timer = window.setInterval(tick, 250);
    tick();
    root.append(
      topBar(() => go(lessons), 'Lessons'),
      h(
        'main',
        { class: 'play-lesson' },
        h('h1', {}, lesson.title, warm ? h('span', { class: 'warm-tag' }, 'Warm-up: keys you know') : null),
        lesson.newKeys.filter((k) => k !== ' ').length
          ? h('p', { class: 'new-keys' }, 'New keys: ', ...lesson.newKeys.filter((k) => k !== ' ').map((k) => h('kbd', {}, k.toUpperCase())), lesson.id === 'L1' ? (input === 'keyboard' ? ' Rest your pointer fingers on the bumps on F and J.' : ' Hold your device with both hands and tap with your thumbs.') : '')
          : h('p', { class: 'new-keys' }, 'Keep your eyes on the screen, not your fingers.'),
        flight.el,
        egg.el ? h('div', { class: 'lesson-stats-row' }, stats, egg.el) : stats,
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

/** The (up to two) letters missed most in this run, for a short practice after a missed lesson. */
function missedKeys(stats: KeyStats, known: Set<string>): string[] {
  return Object.entries(stats)
    .filter(([k, st]) => st.misses > 0 && known.has(k) && /^[a-z]$/.test(k))
    .sort((a, b) => b[1].misses - a[1].misses)
    .slice(0, 2)
    .map(([k]) => k);
}

function showResult(root: HTMLElement, lesson: Lesson, wpm: number | null, accuracy: number, stars: number, embers: number, newEgg: string | null, eggReady: boolean, fresh: Achievement[] = [], seasonDone: string[] = [], better: Improvement[] = [], missed: string[] = []): void {
  const idx = LESSONS.indexOf(lesson);
  const next = LESSONS[idx + 1];
  const eggLeft = keysToHatch(profile());
  // Picture cards instead of sentences: one card per thing earned.
  const card = (icon: Child, value: string, label: string, cls = ''): HTMLElement =>
    h('div', { class: `lr-card ${cls}` }, h('span', { class: 'lr-icon', 'aria-hidden': 'true' }, icon), h('strong', {}, value), h('small', {}, label));
  const cards = [
    card('🔥', `+${embers}`, 'Embers'),
    card('🎯', pct(accuracy), 'Correct'),
    wpm === null ? null : card('⚡', String(Math.round(wpm)), 'WPM'),
    newEgg ? card('🥚', 'New egg!', newEgg, 'gold') : null,
    eggReady ? card('🐣', 'Ready!', 'Egg can hatch', 'gold') : eggLeft > 0 ? card('🥚', String(eggLeft), 'Keys to hatch') : null,
    // A key mastered from earlier typing, not one this lesson teaches, says so.
    ...better.map((b) => card(svg(improvementArt(b), 'lr-art'), `+${b.embers}`, b.key && !lesson.keys.includes(b.key) ? `Bonus: ${improvementTitle(b)}` : improvementTitle(b), 'gold')),
    ...seasonDone.map((t) => card('🌟', `+${CHALLENGE_EMBERS}`, t, 'gold')),
    fresh.length === 1 ? card(svg(medalSvg(fresh[0].medal, fresh[0].icon), 'ach-mini'), `“${fresh[0].title}”`, 'New title', 'gold') : null,
    fresh.length > 1 ? card(svg(medalSvg(fresh[0].medal, fresh[0].icon), 'ach-mini'), `+${fresh.length}`, 'Achievements', 'gold') : null,
  ];
  // One short line on how to get the next star, only when there is one to get.
  const hint =
    stars === 0
      ? 'Get 90% correct to pass. Go slow!'
      : stars === 1
        ? '95% correct = second star'
        : stars === 2
          ? wpm === null
            ? 'Relaxed mode off = third star'
            : `${lesson.starWpm} WPM at 95% = third star`
          : null;
  // A missed lesson offers a short drill on the letters missed most, which then comes back here.
  const practice = stars === 0 && missed.length ? button(`🎯 Practice ${missed.map((k) => k.toUpperCase()).join(' and ')}`, () => go(keyPractice(missed, lesson))) : null;
  // Far from passing: the practice comes first. Close: another try comes first.
  const practiceFirst = !!practice && accuracy < 0.85;
  const primary =
    stars > 0 && next
      ? button('▶ Next lesson', () => go(playLesson(next)))
      : stars === 0
        ? practiceFirst
          ? practice!
          : button('↻ Try again', () => go(playLesson(lesson)))
        : button('📚 All lessons', () => go(lessons));
  if (practice && !practiceFirst) practice.className = 'btn ghost small';
  const modal = h(
    'div',
    { class: 'modal-backdrop' },
    h(
      'div',
      { class: 'modal lesson-result' },
      h('h2', {}, stars > 0 ? 'Lesson passed!' : 'Almost there'),
      h('p', { class: 'big-stars' }, starText(stars)),
      h('div', { class: 'lr-cards' }, ...cards),
      hint ? h('p', { class: 'fine lr-hint' }, hint) : null,
      finishBar(
        primary,
        [stars > 0 || practiceFirst ? button('↻ Try again', () => go(playLesson(lesson)), 'btn ghost small') : null, practice && !practiceFirst ? practice : null, stars > 0 && next ? button('📚 All lessons', () => go(lessons), 'btn ghost small') : null, stars === 0 ? button('📚 All lessons', () => go(lessons), 'btn ghost small') : null],
        { nestGlow: !!newEgg },
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
  // Time is up the moment the minute ends, even between ticks of the clock below.
  const timeUp = (): boolean => view.session.startedAt !== null && view.session.elapsedMs() >= LIMIT;
  const view = createTypingView({
    text,
    input: inputMode(),
    showKeyboard: p.settings.showKeyboard,
    // Keys stop counting once the check is over, or once the minute is up.
    enabled: () => {
      if (done) return false;
      if (timeUp()) {
        finish();
        return false;
      }
      return true;
    },
    onFinish: () => finish(),
  });
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
    stats.textContent = 'Time’s up!';
    // Count no more than the minute, however late the clock noticed.
    const sum = view.session.summary(Math.min(performance.now(), (view.session.startedAt ?? performance.now()) + LIMIT));
    recordPractice(p, sum);
    const units = applyPlacement(p, sum.wpm, sum.accuracy);
    // The class sees the check as its own line, never as lessons played.
    reportToClass(p, { kind: 'placement', lesson: placedThrough(units) ?? undefined, wpm: sum.wpm, accuracy: sum.accuracy, touch: isTouch(view.input) });
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
        h('div', { class: 'modal' }, h('h2', {}, 'Check complete'), h('p', {}, `${Math.round(sum.wpm)} WPM · ${pct(sum.accuracy)} accuracy`), h('p', {}, msg), finishBar(button('📚 Lessons', () => go(lessons)))),
      ),
    );
  }

  root.append(
    topBar(() => go(lessons), 'Lessons'),
    h('main', { class: 'play-lesson' }, h('h1', {}, 'One-minute typing check'), h('p', { class: 'new-keys' }, 'Type as much as you can, as accurately as you can. No pressure!'), stats, view.el),
  );
  view.focus();
  return () => {
    clearInterval(timer);
    view.destroy();
  };
};

/** The rider's tricky keys among the letters they have learned, worst first. */
export function trickyKeysOf(p = profile()): string[] {
  return weakKeys(p.keyStats, [...knownLetters(p)]);
}

/** "Practice tricky keys" with the keys on it, or nothing when no key is tricky yet. */
export function trickyButton(): HTMLElement | null {
  const weak = trickyKeysOf();
  if (!weak.length) return null;
  return button(
    h('span', { class: 'tricky-in' }, h('span', { class: 'tricky-icon', 'aria-hidden': 'true' }, '🎯'), h('strong', {}, 'Tricky keys'), h('span', { class: 'tricky-keys' }, ...weak.map((k) => h('kbd', {}, k.toUpperCase()))), h('span', { class: 'tricky-go', 'aria-hidden': 'true' }, '▶')),
    () => (sfx.click(), go(trickyKeys)),
    'tricky-btn',
    { 'aria-label': `Practice your tricky keys: ${weak.map((k) => k.toUpperCase()).join(', ')}` },
  );
}

/** A 30-second-ish drill on the rider's tricky keys. It warms the egg but pays no embers. */
export const trickyKeys = (root: HTMLElement): (() => void) => keyPractice()(root);

/**
 * The tricky-keys drill. With `focus`, it drills just those keys (the ones missed in a lesson);
 * with `then`, its main button goes back to that lesson for another try.
 */
export const keyPractice = (focus?: string[], then?: Lesson) => (root: HTMLElement): (() => void) => {
  const p = profile();
  const weak = focus?.length ? focus : trickyKeysOf(p);
  const keys = weak.length ? weak : ['f', 'j'];
  // After a missed lesson, the drill sticks to that lesson's own letters.
  const text = buildTrickyText(then ? new Set(then.keys.filter((k) => /[a-z;,./]/.test(k))) : knownLetters(p), keys);
  const stats = h('div', { class: 'live-stats' });
  let timer = 0;
  const view = createTypingView({
    text,
    input: inputMode(),
    showKeyboard: p.settings.showKeyboard,
    onKey: (r, s) => flight.update(s, r.correct),
    onFinish: (s) => {
      clearInterval(timer);
      // Show the last key's ring too: the counter refreshes only every 250 ms.
      tick();
      const sum = s.summary();
      const reward = recordPractice(p, sum);
      const better = payImprovements(p, sum, null);
      persist();
      refreshEmbers();
      sfx.win();
      const card = (icon: Child, value: string, label: string, cls = ''): HTMLElement =>
        h('div', { class: `lr-card ${cls}` }, h('span', { class: 'lr-icon', 'aria-hidden': 'true' }, icon), h('strong', {}, value), h('small', {}, label));
      const keyCard = (k: string): HTMLElement => {
        const st = sum.keyStats[k];
        const tries = st ? st.hits + st.misses : 0;
        return card(h('kbd', {}, k.toUpperCase()), tries ? pct(st!.hits / tries) : '–', 'Correct');
      };
      root.append(
        h(
          'div',
          { class: 'modal-backdrop' },
          h(
            'div',
            { class: 'modal lesson-result' },
            h('h2', {}, 'Nice practice!'),
            h(
              'div',
              { class: 'lr-cards' },
              ...keys.map(keyCard),
              reward.warmthAdded ? card('🥚', `+${reward.warmthAdded}`, 'Egg warmth') : null,
              ...better.map((b) => card(svg(improvementArt(b), 'lr-art'), `+${b.embers}`, b.key && !keys.includes(b.key) ? `Bonus: ${improvementTitle(b)}` : improvementTitle(b), 'gold')),
            ),
            then
              ? finishBar(button(`▶ ${then.title}`, () => go(playLesson(then))), [button('↻ Again', () => go(keyPractice(focus, then)), 'btn ghost small'), button('📚 Lessons', () => go(lessons), 'btn ghost small')])
              : finishBar(button('↻ Again', () => go(trickyKeys)), [button('📚 Lessons', () => go(lessons), 'btn ghost small')]),
          ),
        ),
      );
    },
  });
  const flight = createLessonFlight(view.session.text, activeDragon(p), seasonAt()?.sky);
  const tick = (): void => {
    stats.textContent = `◎ ${flight.clean}/${flight.rings} rings · ${pct(view.session.accuracy())} accuracy`;
  };
  timer = window.setInterval(tick, 250);
  tick();
  root.append(
    topBar(() => go(lessons), 'Lessons'),
    h(
      'main',
      { class: 'play-lesson' },
      h('h1', {}, '🎯 Tricky keys'),
      h('p', { class: 'new-keys' }, ...keys.map((k) => h('kbd', {}, k.toUpperCase()))),
      flight.el,
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

/** Word challenges: themed word packs after the 20 lessons (KF-12). */
function challengeSection(): HTMLElement {
  const p = profile();
  const open = challengesOpen(p);
  const res = p.challenges ?? {};
  return h(
    'section',
    { class: 'unit challenges' + (open ? '' : ' locked') },
    h('div', { class: 'unit-head' }, h('div', {}, h('h2', {}, '🏆 Word challenges'), h('p', {}, open ? 'Pick a pack. Pass a level to open the next.' : 'Pass every lesson to open'))),
    h(
      'div',
      { class: 'pack-grid' },
      ...PACKS.map((pack) =>
        h(
          'div',
          { class: 'pack-card' },
          h('div', { class: 'pack-head' }, h('span', { class: 'pack-icon', 'aria-hidden': 'true' }, pack.icon), h('strong', {}, pack.title)),
          h(
            'div',
            { class: 'pack-levels' },
            ...CHALLENGES.filter((c) => c.pack === pack.id).map((c) => {
              const can = open && challengeOpen(res, c);
              return button(
                h('span', {}, h('strong', {}, levelName(c.level)), h('small', { class: 'stars' }, can ? starText(res[c.id]?.stars ?? 0) : '🔒')),
                () => go(playChallenge(c)),
                'lesson-tile pack-level' + (can ? '' : ' locked') + (res[c.id]?.stars ? ' passed' : ''),
                { disabled: !can, 'aria-label': `${pack.title}, ${levelName(c.level)}${can ? '' : ', locked'}` },
              );
            }),
          ),
        ),
      ),
    ),
  );
}

/** The next challenge to play: the first open one not passed yet. */
export function nextChallenge(p = profile()): Challenge | null {
  if (!challengesOpen(p)) return null;
  const res = p.challenges ?? {};
  return CHALLENGES.find((c) => challengeOpen(res, c) && !(res[c.id]?.stars ?? 0)) ?? null;
}

export function playChallenge(c: Challenge) {
  return (root: HTMLElement): (() => void) => {
    const p = profile();
    const pack = packById(c.pack);
    const relaxed = p.settings.relaxed;
    const stats = h('div', { class: 'live-stats' });
    let timer = 0;
    const view = createTypingView({
      text: buildChallengeText(c),
      input: inputMode(),
      relaxed,
      showKeyboard: p.settings.showKeyboard,
      onKey: (r, s) => flight.update(s, r.correct),
      onFinish: (s) => {
        clearInterval(timer);
        // Show the last key's ring too: the counter refreshes only every 250 ms.
        tick();
        const sum = s.summary();
        const stars = starsFor(asLesson(c), relaxed ? 0 : sum.wpm, sum.accuracy);
        const before = earnedIds(p);
        const reward = recordChallenge(p, c, sum, stars, relaxed);
        countPlay('lesson', p);
        const better = payImprovements(p, sum, null);
        const fresh = claimNewAchievements(p, before);
        persist();
        refreshEmbers();
        if (stars > 0) sfx.win();
        const card = (icon: Child, value: string, label: string, cls = ''): HTMLElement =>
          h('div', { class: `lr-card ${cls}` }, h('span', { class: 'lr-icon', 'aria-hidden': 'true' }, icon), h('strong', {}, value), h('small', {}, label));
        const next = stars > 0 ? nextChallenge(p) : null;
        const primary = next ? button('▶ Next challenge', () => go(playChallenge(next))) : stars === 0 ? button('↻ Try again', () => go(playChallenge(c))) : button('📚 Lessons', () => go(lessons));
        root.append(
          h(
            'div',
            { class: 'modal-backdrop' },
            h(
              'div',
              { class: 'modal lesson-result' },
              h('h2', {}, stars > 0 ? 'Challenge done!' : 'Almost there'),
              h('p', { class: 'big-stars' }, starText(stars)),
              h(
                'div',
                { class: 'lr-cards' },
                card('🔥', `+${reward.embers}`, 'Embers'),
                card('🎯', pct(sum.accuracy), 'Correct'),
                relaxed ? null : card('⚡', String(Math.round(sum.wpm)), 'WPM'),
                reward.newEgg ? card('🥚', 'New egg!', TRIBES[reward.newEgg].name, 'gold') : null,
                ...better.map((b) => card(svg(improvementArt(b), 'lr-art'), `+${b.embers}`, improvementTitle(b), 'gold')),
                fresh.length ? card(svg(medalSvg(fresh[0].medal, fresh[0].icon), 'ach-mini'), `+${fresh.length}`, 'Achievements', 'gold') : null,
              ),
              stars === 0 ? h('p', { class: 'fine lr-hint' }, 'Get 90% correct to pass. Go slow!') : null,
              finishBar(primary, [stars > 0 ? button('↻ Try again', () => go(playChallenge(c)), 'btn ghost small') : null, next || stars === 0 ? button('📚 Lessons', () => go(lessons), 'btn ghost small') : null], { nestGlow: !!reward.newEgg }),
            ),
          ),
        );
      },
    });
    const flight = createLessonFlight(view.session.text, activeDragon(p), seasonAt()?.sky);
    const tick = (): void => {
      stats.textContent = `◎ ${flight.clean}/${flight.rings} rings · ${pct(view.session.accuracy())} accuracy${relaxed ? ' · Relaxed' : ''}`;
    };
    timer = window.setInterval(tick, 250);
    tick();
    root.append(
      topBar(() => go(lessons), 'Lessons'),
      h('main', { class: 'play-lesson' }, h('h1', {}, `${pack.icon} ${pack.title}`, h('span', { class: 'warm-tag' }, levelName(c.level))), flight.el, stats, view.el),
    );
    view.focus();
    return () => {
      clearInterval(timer);
      view.destroy();
    };
  };
}
