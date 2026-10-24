// The typing panel used by lessons and races: text, finger hint, and keyboard.

import { FINGER_LABEL, ROWS, SHIFT_SYMBOL, TOUCH_ROWS, baseKey, fingerFor, keyLabel, touchThumb } from '../content/keyboard';
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

/** Thumb typing: keys on the left half of the phone keyboard go to the left thumb. */
function thumbFor(ch: string): string {
  const t = touchThumb(ch);
  return t === 'either' ? 'either thumb' : `your ${t} thumb`;
}

const SHIFT_MAP = SHIFT_SYMBOL;

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
  let capsLock = false;

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
  // Keys read lowercase and switch to capitals and symbols while shift is on, like a phone keyboard.
  const showShifted = (on: boolean): void => {
    keyEls.forEach((el, k) => {
      if (k !== ' ') el.textContent = keyLabel(k, on);
    });
  };
  const setShift = (on: boolean): void => {
    shiftOn = on;
    shiftKey.classList.toggle('on', on);
    showShifted(on);
  };
  // preventDefault on pointerdown stops :active from showing, so pressed keys get a class instead.
  const flash = (el: HTMLElement): void => {
    el.classList.remove('down');
    void el.offsetWidth;
    el.classList.add('down');
  };
  // What each key does when tapped. Taps are matched to keys by the keyboard itself (below).
  const actions = new Map<HTMLElement, () => void>();
  actions.set(shiftKey, () => setShift(!shiftOn));

  const makeKey = (k: string, cls = '', w?: number): HTMLElement => {
    if (k === 'shift') {
      if (w) shiftKey.style.flex = `${w} 1 0`;
      return shiftKey;
    }
    const el = h('button', { class: `key f-${fingerFor(k)} ${k === 'f' || k === 'j' ? 'bump' : ''} ${k === ' ' ? 'key-space' : ''} ${cls}`, type: 'button', 'aria-label': k === ' ' ? 'space' : k }, keyLabel(k, false));
    if (w) el.style.flex = `${w} 1 0`;
    actions.set(el, () => {
      let ch = k;
      if (shiftOn) {
        ch = SHIFT_MAP[k] ?? k.toUpperCase();
        setShift(false);
      }
      press(ch);
    });
    keyEls.set(k, el);
    return el;
  };

  // On touch screens the keyboard is pinned to the bottom and laid out like a phone keyboard.
  // Elsewhere it mirrors a real keyboard, with shift left of Z.
  const pinned = opts.input === 'touch';
  const keyboard = h(
    'div',
    { class: `keyboard${pinned ? ' pinned' : ''}`, 'aria-hidden': 'true' },
    ...(pinned
      ? TOUCH_ROWS.map((row, i) => h('div', { class: `kb-row kb-row-${i}` }, ...row.map(({ k, w }) => makeKey(k, '', w))))
      : [
          ...ROWS.map((row, i) => h('div', { class: `kb-row kb-row-${i}` }, i === 2 ? shiftKey : null, ...row.map((k) => makeKey(k)))),
          h('div', { class: 'kb-row kb-row-space' }, makeKey(' ')),
        ]),
  );
  // A tap counts for the nearest key, so a thumb landing in the gap between two keys (or just
  // past the edge of the keyboard) still types instead of doing nothing, as on a phone keyboard.
  const nearestKey = (x: number, y: number): HTMLElement | null => {
    let best: HTMLElement | null = null;
    let bestD = Infinity;
    for (const el of actions.keys()) {
      const b = el.getBoundingClientRect();
      const dx = Math.max(b.left - x, 0, x - b.right);
      const dy = Math.max(b.top - y, 0, y - b.bottom);
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = el;
      }
    }
    return best;
  };
  keyboard.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const el = nearestKey(e.clientX, e.clientY);
    if (!el) return;
    flash(el);
    actions.get(el)?.();
  });
  if (!opts.showKeyboard && !pinned) keyboard.classList.add('mini');
  // Phone browsers are unreliable with position: fixed (toolbars that slide away,
  // transformed ancestors, rubber-band scrolling). Instead the whole app becomes a
  // column exactly as tall as the visible screen: the page scrolls inside, and the
  // keyboard is the last row of the column, so it can't drift or be covered.
  const fitViewport = (): void => {
    const vv = window.visualViewport;
    document.documentElement.style.setProperty('--vvh', `${Math.round(vv ? vv.height : window.innerHeight)}px`);
    if (window.scrollY) window.scrollTo(0, 0);
    requestAnimationFrame(keepTextVisible);
  };
  // On short screens (small phones, any phone turned sideways) the race track pushes the
  // text below the keyboard. Scroll the page just enough that the text and hint show;
  // the player's own dragon is in the bottom lane, so it stays in view too.
  const keepTextVisible = (): void => {
    if (!el.isConnected) return;
    const scroller = pinned ? el.closest('main') : document.scrollingElement;
    if (!scroller) return;
    const bottom = pinned ? scroller.getBoundingClientRect().bottom : window.innerHeight;
    const over = hint.getBoundingClientRect().bottom + 4 - bottom;
    if (over > 0) scroller.scrollTop += over;
  };
  let mountTimer = 0;
  if (pinned) {
    document.body.classList.add('kb-pinned');
    fitViewport();
    window.visualViewport?.addEventListener('resize', fitViewport);
    window.addEventListener('resize', fitViewport);
    window.addEventListener('orientationchange', fitViewport);
    // Move the keyboard out of the scrolling page into the app column once it's on screen.
    const mount = (): void => {
      const app = el.closest('#app') ?? document.getElementById('app');
      if (el.isConnected && app) {
        app.append(keyboard);
        keepTextVisible();
      } else mountTimer = requestAnimationFrame(mount);
    };
    mountTimer = requestAnimationFrame(mount);
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
      hint.textContent = capsLock
        ? 'Caps Lock is on. Press Caps Lock to turn it off.'
        : touch
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
  // Phone keyboards (Gboard, Samsung Keyboard) "compose" a word: the field goes t, th, the.
  // Clearing the field mid-word makes them type the word again, so read only what's new
  // since the last input, and clear the field only once the word is committed.
  let seen = '';
  const clearDevice = (): void => {
    deviceInput.value = '';
    seen = '';
  };
  deviceInput.addEventListener('input', (e) => {
    const value = deviceInput.value;
    let same = 0;
    while (same < seen.length && same < value.length && seen[same] === value[same]) same++;
    const added = value.slice(same);
    seen = value;
    for (const ch of added) press(ch === '\n' ? ' ' : ch);
    if (!(e as InputEvent).isComposing) clearDevice();
  });
  deviceInput.addEventListener('compositionend', () => setTimeout(() => {
    if (deviceInput.value === seen) clearDevice();
  }));
  const tapPrompt = h('div', { class: 'tap-prompt' }, 'Tap here to open your keyboard');
  const focus = (): void => {
    if (opts.input !== 'device') return;
    deviceInput.focus({ preventScroll: true });
    textEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  // Android's back button hides the keyboard but leaves the field focused, and focusing
  // a focused field does nothing. Blur first so a tap always brings the keyboard back.
  const reopen = (): void => {
    deviceInput.blur();
    focus();
  };
  textEl.addEventListener('click', reopen);
  tapPrompt.addEventListener('click', reopen);
  // The prompt hides only while the keyboard is really up (it shrinks the visible screen).
  const fullHeight = window.innerHeight;
  const syncPrompt = (): void => {
    const vv = window.visualViewport;
    const kbUp = document.activeElement === deviceInput && (!vv || vv.height < fullHeight - 120);
    tapPrompt.classList.toggle('hidden', kbUp);
  };
  deviceInput.addEventListener('focus', syncPrompt);
  deviceInput.addEventListener('blur', syncPrompt);
  if (opts.input === 'device') window.visualViewport?.addEventListener('resize', syncPrompt);

  // Holding a real Shift key shows capitals on the guide keyboard too.
  const onShift = (e: KeyboardEvent): void => {
    if (e.key === 'Shift' && !shiftOn) showShifted(e.type === 'keydown');
  };
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.target === deviceInput) return;
    onShift(e);
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const caps = e.getModifierState?.('CapsLock') ?? false;
    if (caps !== capsLock) {
      capsLock = caps;
      render();
    }
    if (e.key.length !== 1) return;
    e.preventDefault();
    // Holding a key down repeats it; count only the first press.
    if (e.repeat) return;
    press(e.key);
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onShift);
  render();
  if (!pinned) requestAnimationFrame(keepTextVisible);

  const device = opts.input === 'device';
  const el = h('div', { class: `typing-view input-${opts.input}` }, textEl, device ? tapPrompt : null, device ? deviceInput : null, hint, device || pinned ? null : keyboard);
  return {
    el,
    session,
    focus,
    destroy: () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onShift);
      window.visualViewport?.removeEventListener('resize', syncPrompt);
      if (pinned) {
        cancelAnimationFrame(mountTimer);
        keyboard.remove();
        document.body.classList.remove('kb-pinned');
        window.visualViewport?.removeEventListener('resize', fitViewport);
        window.removeEventListener('resize', fitViewport);
        window.removeEventListener('orientationchange', fitViewport);
      }
    },
  };
}
