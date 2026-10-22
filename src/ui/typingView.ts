// The typing panel used by lessons and races: text, finger hint, and keyboard.

import { FINGER_LABEL, ROWS, baseKey, fingerFor } from '../content/keyboard';
import { TypingSession, type KeystrokeResult } from '../engine/typing';
import type { InputMode } from '../save/store';
import { safeText } from '../content/safety';
import { h } from './dom';
import { sfx } from './sound';

export interface TypingViewOptions {
  text: string;
  showKeyboard: boolean;
  input: InputMode;
  relaxed?: boolean;
  /** When false, keys are ignored (for example during a countdown). */
  enabled?: () => boolean;
  onKey?: (r: KeystrokeResult, s: TypingSession) => void;
  onFinish?: (s: TypingSession) => void;
}

export interface TypingView {
  el: HTMLElement;
  session: TypingSession;
  destroy: () => void;
  focus: () => void;
}

/** Thumb typing: keys on the left half of the keyboard go to the left thumb. */
function thumbFor(ch: string): string {
  if (ch === ' ') return 'either thumb';
  const f = fingerFor(ch);
  return f.startsWith('left') ? 'your left thumb' : 'your right thumb';
}

const SHIFT_MAP: Record<string, string> = { ';': ':', ',': '<', '.': '>', '/': '?' };

export function createTypingView(opts: TypingViewOptions): TypingView {
  // Last safety net: nothing rude reaches the screen, whatever made the text.
  const text = safeText(opts.text) || 'fly high';
  const session = new TypingSession(text, { advanceOnError: opts.relaxed });
  const touch = opts.input !== 'keyboard';
  const chars = [...text].map((c) => h('span', { class: c === ' ' ? 'ch space' : 'ch' }, c));
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

  // On touch screens the keyboard is pinned to the bottom like a phone keyboard,
  // with shift beside the space bar so every letter row fits ten keys across.
  const pinned = opts.input === 'touch';
  const keyboard = h(
    'div',
    { class: `keyboard${pinned ? ' pinned' : ''}`, 'aria-hidden': 'true' },
    ...ROWS.map((row, i) =>
      h('div', { class: `kb-row kb-row-${i}` }, i === 2 && !pinned ? shiftKey : null, ...row.map((k) => makeKey(k, k === ';' ? ';' : undefined, k === 'f' || k === 'j' ? 'bump' : ''))),
    ),
    h('div', { class: 'kb-row kb-row-space' }, pinned ? shiftKey : null, makeKey(' ', 'space', 'key-space')),
  );
  if (!opts.showKeyboard && !pinned) keyboard.classList.add('mini');
  let resize: ResizeObserver | null = null;
  if (pinned) {
    document.body.classList.add('kb-pinned');
    if (typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(() => document.body.style.setProperty('--kb-h', `${keyboard.offsetHeight}px`));
      resize.observe(keyboard);
    }
  }

  let lastTop = -1;
  function render(): void {
    const i = session.index;
    chars.forEach((el, j) => {
      el.classList.toggle('done', j < i);
      el.classList.toggle('current', j === i);
      el.classList.toggle('missed', session.missedAt.has(j) && j < i);
    });
    // Keep the current line at the top of the text box. Scrolling only the box (not the page)
    // stops the page from sliding the text under a pinned keyboard.
    const cur = chars[i];
    if (cur && cur.offsetTop !== lastTop) {
      lastTop = cur.offsetTop;
      const style = getComputedStyle(textEl);
      const lineH = parseFloat(style.lineHeight) || 30;
      textEl.scrollTop = Math.floor((cur.offsetTop - parseFloat(style.paddingTop)) / lineH) * lineH;
    }
    keyEls.forEach((el) => el.classList.remove('next'));
    const next = session.expected;
    if (next) {
      keyEls.get(baseKey(next))?.classList.add('next');
      const upper = next !== next.toLowerCase() || SHIFT_MAP[baseKey(next)] === next;
      shiftKey.classList.toggle('next', upper);
      const name = next === ' ' ? 'space' : next;
      const finger = fingerFor(next);
      hint.textContent = touch
        ? `Next: “${name}” with ${thumbFor(next)}${upper ? ' (tap ⇧ first)' : ''}`
        : `Next: “${name}” with ${finger === 'thumb' ? 'either thumb' : `your ${FINGER_LABEL[finger]}`}${upper ? ' (hold Shift with the other hand)' : ''}`;
    } else {
      hint.textContent = '';
    }
  }

  // The phone's own keyboard types into a hidden field; we read each character and clear it.
  const deviceInput = h('textarea', {
    class: 'device-input',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    inputmode: 'text',
    enterkeyhint: 'next',
    'aria-label': 'Type here',
  });
  deviceInput.addEventListener('input', () => {
    const typed = deviceInput.value;
    deviceInput.value = '';
    for (const ch of typed) press(ch === '\n' ? ' ' : ch);
  });
  const tapPrompt = h('div', { class: 'tap-prompt' }, 'Tap here to open your keyboard');
  const focus = (): void => {
    if (opts.input !== 'device') return;
    deviceInput.focus({ preventScroll: true });
    textEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  textEl.addEventListener('click', focus);
  tapPrompt.addEventListener('click', focus);
  deviceInput.addEventListener('focus', () => tapPrompt.classList.add('hidden'));
  deviceInput.addEventListener('blur', () => tapPrompt.classList.remove('hidden'));

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.target === deviceInput) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1) return;
    e.preventDefault();
    press(e.key);
  };
  document.addEventListener('keydown', onKeyDown);
  render();

  const device = opts.input === 'device';
  const el = h('div', { class: `typing-view input-${opts.input}` }, textEl, device ? tapPrompt : null, device ? deviceInput : null, hint, device ? null : keyboard);
  return {
    el,
    session,
    focus,
    destroy: () => {
      document.removeEventListener('keydown', onKeyDown);
      resize?.disconnect();
      if (pinned) {
        document.body.classList.remove('kb-pinned');
        document.body.style.removeProperty('--kb-h');
      }
    },
  };
}
