// Minimal DOM helpers so screens read like markup without a framework.

export type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** An element whose inner markup is a trusted SVG string built by our own code. */
export function svg(markup: string, className = ''): HTMLDivElement {
  const el = h('div', { class: `art ${className}` });
  el.innerHTML = markup;
  return el;
}

export function button(label: Child, onClick: () => void, cls = 'btn', extra: Attrs = {}): HTMLButtonElement {
  return h('button', { class: cls, type: 'button', onclick: () => onClick(), ...extra }, label);
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** A finger that taps again and again, pointing at what to press next. */
export const tapHand = (): HTMLElement => h('span', { class: 'tap-hand', 'aria-hidden': 'true' }, '👆');

const replays = new WeakMap<Element, number>();
const play = (el: Element, cls: string): void => {
  el.classList.add(cls);
  // Take the class off when it has played, so the next time can start at once.
  el.addEventListener('animationend', () => replays.has(el) || el.classList.remove(cls), { once: true });
};
/**
 * Plays a one-shot CSS animation class again. The usual trick (remove the class, read
 * offsetWidth, add it back) forces the browser to lay out the whole page right then, on
 * every mistyped key, which made typing stutter on slower computers. Instead the class
 * comes off now and goes back on a frame later, after the browser has drawn without it.
 */
export function replay(el: Element, cls: string): void {
  const pending = replays.get(el);
  if (pending === undefined && !el.classList.contains(cls)) {
    // Not playing: it can start right away.
    play(el, cls);
    return;
  }
  cancelAnimationFrame(pending ?? 0);
  el.classList.remove(cls);
  replays.set(
    el,
    requestAnimationFrame(() =>
      replays.set(
        el,
        requestAnimationFrame(() => {
          replays.delete(el);
          play(el, cls);
        }),
      ),
    ),
  );
}
