// Minimal DOM helpers so screens read like markup without a framework.

type Child = Node | string | number | null | undefined | false;
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
