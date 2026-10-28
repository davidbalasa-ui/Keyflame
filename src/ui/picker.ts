// In-game pickers that replace the browser's own <select>. A native select opens the phone's
// system list (white on slate grey on Android, a wheel on iPad), which looks nothing like the
// game. These stay in the game's colors, work with taps and with a keyboard, and never get
// wider than the screen.
import { button, h } from './dom';
import { sfx } from './sound';

const chevron = (dir: 'left' | 'right'): SVGSVGElement => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<path d="${dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  return el;
};

export interface WordPicker {
  el: HTMLElement;
  set(value: string): void;
}

/**
 * One part of a name: arrows step through the words, and tapping the word opens a sheet of
 * word chips to pick from. `preview` shows the whole name while a chip is hovered or focused.
 */
export function wordPicker(opts: { words: string[]; value: string; label: string; onChange: (v: string) => void; preview?: (v: string) => string }): WordPicker {
  let value = opts.value;
  const word = h('span', { class: 'wp-word' });
  const face = button(word, () => openSheet(), 'wp-face', { 'aria-haspopup': 'dialog' });
  const render = (): void => {
    word.textContent = value;
    face.setAttribute('aria-label', `${opts.label}: ${value}. Tap to see all.`);
  };
  const pick = (v: string, quiet = false): void => {
    if (v === value) return;
    value = v;
    render();
    word.classList.remove('wp-bump');
    void word.offsetWidth;
    word.classList.add('wp-bump');
    if (!quiet) sfx.click();
    opts.onChange(v);
  };
  const step = (by: number): void => {
    const i = opts.words.indexOf(value);
    pick(opts.words[(i + by + opts.words.length) % opts.words.length]);
  };
  face.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step(-1);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step(1);
    else return;
    e.preventDefault();
  });

  function openSheet(): void {
    sfx.click();
    const head = h('p', { class: 'ps-preview', 'aria-live': 'polite' });
    const showPreview = (v: string): void => {
      head.textContent = opts.preview ? opts.preview(v) : v;
    };
    const chips = opts.words.map((w) => {
      const b = button(w, () => (pick(w), close()), 'ps-chip' + (w === value ? ' on' : ''), { role: 'radio', 'aria-checked': String(w === value) });
      b.addEventListener('pointerenter', () => showPreview(w));
      b.addEventListener('focus', () => showPreview(w));
      return b;
    });
    const grid = h('div', { class: 'ps-grid', role: 'radiogroup', 'aria-label': opts.label }, ...chips);
    gridKeys(grid, chips);
    showPreview(value);
    const close = sheet(h('h2', { class: 'ps-title' }, opts.label), head, grid, face);
  }

  render();
  const el = h(
    'div',
    { class: 'word-picker' },
    button(chevron('left'), () => step(-1), 'wp-arrow', { 'aria-label': `Previous ${opts.label.toLowerCase()}`, tabindex: '-1' }),
    face,
    button(chevron('right'), () => step(1), 'wp-arrow', { 'aria-label': `Next ${opts.label.toLowerCase()}`, tabindex: '-1' }),
  );
  return { el, set: (v) => pick(v, true) };
}

/** A round dice button that rolls every picker in a name to a random word. */
export function diceButton(onRoll: () => void): HTMLButtonElement {
  const b = button(
    h('span', {
      class: 'die',
      html: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor"/><g fill="#2a1200"><circle cx="8" cy="8" r="1.8"/><circle cx="16" cy="8" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="8" cy="16" r="1.8"/><circle cx="16" cy="16" r="1.8"/></g></svg>',
    }),
    () => {
      b.classList.remove('rolling');
      void b.offsetWidth;
      b.classList.add('rolling');
      sfx.click();
      onRoll();
    },
    'dice-btn',
    { 'aria-label': 'Pick a random name', title: 'Surprise me' },
  );
  return b;
}

export const randomOf = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/**
 * A short list of choices shown all at once as cards (used for settings with 2 to 4 options),
 * so nothing has to open at all. Behaves like radio buttons for screen readers and arrow keys.
 */
export function choiceList<V extends string>(opts: { label: string; value: V; choices: ReadonlyArray<readonly [V, string]>; onChange: (v: V) => void }): HTMLElement {
  let value = opts.value;
  const cards = opts.choices.map(([v, text]) => {
    const card = button(h('span', { class: 'cl-dot', 'aria-hidden': 'true' }), () => choose(v), 'cl-card', { role: 'radio', 'data-value': v });
    card.append(h('span', { class: 'cl-text' }, text));
    return card;
  });
  const render = (): void =>
    cards.forEach((c) => {
      const on = c.dataset.value === value;
      c.classList.toggle('on', on);
      c.setAttribute('aria-checked', String(on));
      c.tabIndex = on ? 0 : -1;
    });
  function choose(v: V): void {
    if (v !== value) sfx.click();
    value = v;
    render();
    opts.onChange(v);
  }
  const group = h('div', { class: 'choice-list', role: 'radiogroup', 'aria-label': opts.label }, ...cards);
  group.addEventListener('keydown', (e) => {
    const i = cards.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const by = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    const next = cards[(i + by + cards.length) % cards.length];
    choose(next.dataset.value as V);
    next.focus();
  });
  render();
  return group;
}

/** Arrow keys move between chips in a wrapping grid, by row and column. */
function gridKeys(grid: HTMLElement, chips: HTMLButtonElement[]): void {
  grid.addEventListener('keydown', (e) => {
    const i = chips.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const cols = Math.max(1, Math.round(grid.clientWidth / chips[0].offsetWidth));
    const by = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    chips[Math.min(chips.length - 1, Math.max(0, i + by))].focus();
  });
}

/**
 * Opens a sheet over everything (a bottom sheet on phones, a floating card on wider screens).
 * Escape, a tap outside, or the close button shut it and hand focus back to `returnTo`.
 */
function sheet(title: HTMLElement, ...rest: Array<HTMLElement>): () => void {
  const returnTo = rest.pop() as HTMLElement;
  const closeBtn = button('Close', () => close(), 'btn ghost small ps-close');
  const card = h('div', { class: 'picker-sheet', role: 'dialog', 'aria-modal': 'true' }, title, ...rest, closeBtn);
  const backdrop = h('div', { class: 'picker-backdrop' }, card);
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      // Keep focus inside the sheet.
      const items = Array.from(card.querySelectorAll<HTMLElement>('button'));
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
    }
  };
  backdrop.addEventListener('pointerdown', (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey, true);
  document.body.append(backdrop);
  (card.querySelector<HTMLElement>('.ps-chip.on') ?? card.querySelector<HTMLElement>('.ps-chip'))?.focus({ preventScroll: true });
  card.querySelector('.ps-chip.on')?.scrollIntoView({ block: 'nearest' });
  let closed = false;
  function close(): void {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    backdrop.classList.add('closing');
    setTimeout(() => backdrop.remove(), 160);
    returnTo.focus({ preventScroll: true });
  }
  return close;
}
