// The typing panel used by lessons and races: text, finger hint, and keyboard.

import { FINGER_LABEL, ROWS, baseKey, fingerFor } from '../content/keyboard';
import { TypingSession, type KeystrokeResult } from '../engine/typing';
import { h } from './dom';
import { sfx } from './sound';

export interface TypingViewOptions {
  text: string;
  showKeyboard: boolean;
  /** When false, keys are ignored (for example during a countdown). */
  enabled?: () => boolean;
  onKey?: (r: KeystrokeResult, s: TypingSession) => void;
  onFinish?: (s: TypingSession) => void;
}

export interface TypingView {
  el: HTMLElement;
  session: TypingSession;
  destroy: () => void;
}

const SHIFT_MAP: Record<string, string> = { ';': ':', ',': '<', '.': '>', '/': '?' };

export function createTypingView(opts: TypingViewOptions): TypingView {
  const session = new TypingSession(opts.text);
  const chars = [...opts.text].map((c) => h('span', { class: c === ' ' ? 'ch space' : 'ch' }, c));
  const textEl = h('div', { class: 'type-text', 'aria-live': 'off' }, ...chars);
  const hint = h('div', { class: 'finger-hint' });
  const keyEls = new Map<string, HTMLElement>();
  let shiftOn = false;

  const press = (key: string): void => {
    if (opts.enabled && !opts.enabled()) return;
    const r = session.type(key);
    if (!r) return;
    if (r.correct) sfx.key();
    else {
      sfx.miss();
      textEl.classList.remove('shake');
      void textEl.offsetWidth;
      textEl.classList.add('shake');
    }
    render();
    opts.onKey?.(r, session);
    if (r.finished) opts.onFinish?.(session);
  };

  const shiftKey = h('button', { class: 'key key-shift', type: 'button', 'aria-label': 'Shift' }, '⇧');
  shiftKey.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    shiftOn = !shiftOn;
    shiftKey.classList.toggle('on', shiftOn);
  });

  const makeKey = (k: string, label = k.toUpperCase(), cls = ''): HTMLElement => {
    const el = h('button', { class: `key f-${fingerFor(k)} ${cls}`, type: 'button', 'aria-label': k === ' ' ? 'space' : k }, label);
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      let ch = k;
      if (shiftOn) {
        ch = SHIFT_MAP[k] ?? k.toUpperCase();
        shiftOn = false;
        shiftKey.classList.remove('on');
      }
      press(ch);
    });
    keyEls.set(k, el);
    return el;
  };

  const keyboard = h(
    'div',
    { class: 'keyboard', 'aria-hidden': 'true' },
    ...ROWS.map((row, i) =>
      h('div', { class: `kb-row kb-row-${i}` }, i === 2 ? shiftKey : null, ...row.map((k) => makeKey(k, k === ';' ? ';' : undefined, k === 'f' || k === 'j' ? 'bump' : ''))),
    ),
    h('div', { class: 'kb-row' }, makeKey(' ', 'space', 'key-space')),
  );
  if (!opts.showKeyboard) keyboard.classList.add('mini');

  function render(): void {
    const i = session.index;
    chars.forEach((el, j) => {
      el.classList.toggle('done', j < i);
      el.classList.toggle('current', j === i);
      el.classList.toggle('missed', session.missedAt.has(j) && j < i);
    });
    chars[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    keyEls.forEach((el) => el.classList.remove('next'));
    const next = session.expected;
    if (next) {
      keyEls.get(baseKey(next))?.classList.add('next');
      const upper = next !== next.toLowerCase() || SHIFT_MAP[baseKey(next)] === next;
      shiftKey.classList.toggle('next', upper);
      const name = next === ' ' ? 'space' : next;
      const finger = fingerFor(next);
      hint.textContent = `Next: “${name}” with ${finger === 'thumb' ? 'either thumb' : `your ${FINGER_LABEL[finger]}`}${upper ? ' (hold Shift with the other hand)' : ''}`;
    } else {
      hint.textContent = '';
    }
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1) return;
    e.preventDefault();
    press(e.key);
  };
  document.addEventListener('keydown', onKeyDown);
  render();

  const el = h('div', { class: 'typing-view' }, textEl, hint, keyboard);
  return {
    el,
    session,
    destroy: () => document.removeEventListener('keydown', onKeyDown),
  };
}
