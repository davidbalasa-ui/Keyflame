import { CONFIG } from '../../config';
import { dragonSvg } from '../../game/dragons';
import { go, profile } from '../app';
import { button, h, svg } from '../dom';
import { hub, topBar } from './hub';

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** A grown-up check: a sum written in words is easy for adults and slows young kids down. */
export function parentGate(onPass: () => void): HTMLElement {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  const input = h('input', { type: 'text', inputmode: 'numeric', class: 'gate-input', 'aria-label': 'Answer' });
  const msg = h('p', { class: 'fine' });
  const modal = h(
    'div',
    { class: 'modal-backdrop' },
    h(
      'div',
      { class: 'modal' },
      h('h2', {}, 'Grown-ups only'),
      h('p', {}, 'Please ask a parent or guardian to continue.'),
      h('p', {}, `What is ${NUMBER_WORDS[a]} times ${NUMBER_WORDS[b]}?`),
      input,
      msg,
      h(
        'div',
        { class: 'row' },
        button('Cancel', () => modal.remove(), 'btn ghost'),
        button('Continue', () => {
          if (Number(input.value.trim()) === a * b) {
            modal.remove();
            onPass();
          } else msg.textContent = 'That’s not quite right.';
        }),
      ),
    ),
  );
  return modal;
}

export const supporter = (root: HTMLElement): void => {
  const p = profile();
  const ready = !!CONFIG.supporterCheckoutUrl;
  root.append(
    topBar(() => go(hub)),
    h(
      'main',
      { class: 'supporter' },
      h('h1', {}, 'Support Keyflame'),
      svg(dragonSvg('emberback', 0, 'adult', 'flap bob', 'starfire'), 'supporter-dragon'),
      h('p', {}, `Keyflame is made to be free and fun. A one-time ${CONFIG.supporterPrice} supporter pack helps pay for the website, and says thank you with:`),
      h('ul', {}, h('li', {}, 'No ads, ever, on this device'), h('li', {}, 'The Starfire skin, which any of your dragons can wear')),
      h('p', { class: 'fine' }, 'It never makes your dragons faster. Everyone races on the same skill.'),
      p.supporter
        ? h('p', { class: 'reward' }, 'You are a supporter. Thank you!')
        : ready
          ? button(`Ask a grown-up to buy it (${CONFIG.supporterPrice})`, () => root.append(parentGate(() => (location.href = CONFIG.supporterCheckoutUrl))))
          : h('p', { class: 'reward' }, 'The supporter pack is coming soon!'),
    ),
  );
};
