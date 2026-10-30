import { CONFIG } from '../../config';
import { grownUpYear } from '../../game/gate';
import { dragonSvg } from '../../game/dragons';
import { redeemSupporterCode } from '../../game/supporter';
import { go, isGuest, keepGuest, persist, profile, roomForRider } from '../app';
import { ensureStarglint } from '../../save/store';
import { button, h, svg } from '../dom';
import { sfx } from '../sound';
import { achievementsPage } from './achievementsPage';
import { topBar } from './hub';
import { grownUps } from './grownUps';
import { nest } from './nest';
import { withTabs } from '../tabBar';

/**
 * A grown-up check before purchases, sending things out and the grown-up screens: the year
 * you were born. It is a speed bump, not a lock: the class itself is locked with the teacher
 * password on shared devices, and the supporter pack needs a card.
 */
export function parentGate(onPass: () => void): HTMLElement {
  const input = h('input', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 4, autocomplete: 'off', class: 'gate-input', 'aria-label': 'Year you were born', placeholder: 'YYYY' });
  const msg = h('p', { class: 'fine', role: 'status' });
  const submit = (): void => {
    // Checked here and forgotten: the year is never saved or sent.
    const ok = grownUpYear(input.value);
    input.value = '';
    if (ok) {
      modal.remove();
      onPass();
    } else msg.textContent = 'This part is for grown-ups.';
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
  const modal = h(
    'div',
    { class: 'modal-backdrop' },
    h(
      'div',
      { class: 'modal' },
      h('h2', {}, 'Grown-ups only'),
      h('p', {}, 'What year were you born?'),
      input,
      msg,
      h('div', { class: 'row' }, button('Cancel', () => modal.remove(), 'btn ghost'), button('Continue', submit)),
    ),
  );
  queueMicrotask(() => input.focus());
  return modal;
}

export const supporter = (root: HTMLElement): (() => void) => {
  const p = profile();
  const ready = !!CONFIG.supporterCheckoutUrl;

  const codeBox = (): HTMLElement => {
    const input = h('input', { type: 'text', class: 'sup-code-input', placeholder: 'KF-XXXX-XXXX-XXXX', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Supporter code' });
    const msg = h('p', { class: 'fine' });
    const unlock = (): void => {
      // A guest's pack would end with the visit, so a full device asks for a saved rider first.
      if (isGuest() && !roomForRider()) {
        msg.textContent = 'This device has 4 riders. Pick yours in My wing first, so the pack stays.';
        return;
      }
      if (!redeemSupporterCode(p, input.value)) {
        msg.textContent = 'That code doesn’t look right. Check each letter and try again.';
        return;
      }
      sfx.coin();
      // A supporter pack is kept: the guest becomes a saved rider.
      if (isGuest()) keepGuest();
      persist();
      go(supporter);
    };
    input.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && unlock());
    return h('section', { class: 'sup-code' }, h('h2', {}, 'Have a supporter code?'), h('p', { class: 'fine' }, 'Bought the pack on another device, or for another rider? Type the code here.'), h('div', { class: 'row center' }, input, button('Unlock', unlock)), msg);
  };

  const owned = (): HTMLElement =>
    h(
      'section',
      { class: 'supporter-owned' },
      h('p', { class: 'reward' }, 'You are a Keyflame supporter. Thank you!'),
      p.supporterCode
        ? h('div', { class: 'sup-code-show' }, h('p', {}, 'Your supporter code'), h('strong', { class: 'sup-code-value' }, p.supporterCode), h('p', { class: 'fine' }, 'Write it down. It unlocks the pack for another rider or on another device. Each code is for your family only.'))
        : null,
      h('div', { class: 'row center' }, button('Fly with Starglint', () => {
          const d = ensureStarglint(p);
          if (d) p.activeDragonId = d.id;
          persist();
          go(nest);
        }), button('Pick the Supporter title', () => go(achievementsPage), 'btn ghost')),
    );

  root.append(
    topBar(() => go(grownUps)),
    h(
      'main',
      { class: 'supporter' },
      h('h1', {}, p.supporter ? 'Your supporter pack' : 'Support Keyflame'),
      svg(dragonSvg('emberback', 0, 'adult', 'flap bob', 'starglint'), 'supporter-dragon'),
      p.supporter ? null : h('p', {}, `Keyflame is made to be free and fun. There are no ads. A one-time ${CONFIG.supporterPrice} supporter pack helps pay for the website, and says thank you with:`),
      h(
        'ul',
        { class: 'pack-list' },
        h('li', {}, h('strong', {}, 'Starglint, a dragon of your own: '), 'an extra-detailed storm dragon with glowing lightning, crackling sparks, and a lightning bolt on its tail. It hatches into your nest and grows as you type.'),
        h('li', {}, h('strong', {}, 'The Keyflame Supporter title '), 'to show under your name.'),
        h('li', {}, h('strong', {}, 'A supporter code '), 'that unlocks the pack on other devices. No account needed.'),
      ),
      h('p', { class: 'fine' }, 'Starglint never flies faster. Its special is a challenge: switch off the key hints and type from memory. Everyone races on the same skill.'),
      p.supporter
        ? owned()
        : ready
          ? h('div', { class: 'row center' }, button(`For grown-ups: get the pack (${CONFIG.supporterPrice})`, () => root.append(parentGate(() => (location.href = CONFIG.supporterCheckoutUrl)))))
          : h('p', { class: 'reward' }, 'The supporter pack is coming soon!'),
      p.supporter ? null : codeBox(),
    ),
  );
  return withTabs(root, 'grownups');
};
