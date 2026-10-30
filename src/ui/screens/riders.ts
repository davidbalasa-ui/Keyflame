// Who's playing: the riders saved on this device and this visit's guest. Tapping one swaps
// whose nest and dragons are showing. Joining a class or family happens on the wing page.

import { dragonSvg, eggSvg, stageFor } from '../../game/dragons';
import { activeDragon } from '../../game/progress';
import { riderLabel } from '../../game/wing';
import { NAME_ADJECTIVES, NAME_NOUNS, type Profile } from '../../save/store';
import { go, isGuest, keepGuest, playAsGuest, profile, roomForRider, saveData, switchRider } from '../app';
import { button, h, svg } from '../dom';
import { diceButton, randomOf, wordPicker } from '../picker';
import { sfx } from '../sound';
import { hub } from './hub';

export function riderAvatar(p: Profile, cls: string): HTMLElement {
  const d = activeDragon(p);
  if (d) return svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), '', d.skin, d.marking, d.stars), cls);
  return svg(eggSvg(p.nest?.tribe ?? 'emberback', 0, p.nest?.seed ?? 1), `${cls} egg`);
}

/** A sheet over the current screen with every rider on this device, plus the guest. */
export function openRiders(root: HTMLElement = document.getElementById('app') ?? document.body): void {
  const me = profile();
  const guest = isGuest();
  const close = (): void => modal.remove();
  const chip = (label: string, art: HTMLElement, on: boolean, pick: () => void, extra = ''): HTMLElement =>
    button(h('span', { class: 'rider-chip-in' }, art, h('span', {}, label)), () => (sfx.click(), pick()), `rider-chip${on ? ' on' : ''}${extra}`, { 'aria-pressed': on ? 'true' : 'false' });
  const ride = (fn: () => void): void => {
    fn();
    close();
    go(hub);
  };
  const modal = h(
    'div',
    { class: 'modal-backdrop', role: 'dialog', 'aria-label': 'Who’s playing?' },
    h(
      'div',
      { class: 'modal riders-sheet' },
      h('h2', {}, 'Who’s playing?'),
      h(
        'div',
        { class: 'rider-chips' },
        ...saveData().profiles.map((r) => chip(riderLabel(r), riderAvatar(r, 'rider-chip-art'), r.id === me.id, () => ride(() => switchRider(r)))),
        chip(guest ? `${me.name} (guest)` : 'Guest', guest ? riderAvatar(me, 'rider-chip-art') : h('span', { class: 'rider-chip-plus', 'aria-hidden': 'true' }, '👋'), guest, () => ride(() => playAsGuest())),
        guest && roomForRider() ? chip('Keep me', h('span', { class: 'rider-chip-plus', 'aria-hidden': 'true' }, '+'), false, () => (close(), keepPicker(root)), ' new') : null,
      ),
      h('div', { class: 'row' }, button('Close', close, 'btn ghost')),
    ),
  );
  modal.addEventListener('click', (e) => e.target === modal && close());
  root.append(modal);
}

/** Saves the guest as a rider on this device, with a name from preset words. */
function keepPicker(root: HTMLElement): void {
  // Names come from preset parts so kids never type personal information.
  const [a0, n0] = profile().name.split(' ');
  let adj = NAME_ADJECTIVES.includes(a0) ? a0 : randomOf(NAME_ADJECTIVES);
  let noun = NAME_NOUNS.includes(n0) ? n0 : randomOf(NAME_NOUNS);
  const preview = h('div', { class: 'name-preview', 'aria-live': 'polite' });
  const update = (): void => {
    preview.textContent = `${adj} ${noun}`;
  };
  const first = wordPicker({ words: NAME_ADJECTIVES, value: adj, label: 'First word', onChange: (v) => ((adj = v), update()), preview: (v) => `${v} ${noun}` });
  const second = wordPicker({ words: NAME_NOUNS, value: noun, label: 'Second word', onChange: (v) => ((noun = v), update()), preview: (v) => `${adj} ${v}` });
  const dice = diceButton(() => {
    first.set(randomOf(NAME_ADJECTIVES.filter((w) => w !== adj)));
    second.set(randomOf(NAME_NOUNS.filter((w) => w !== noun)));
  });
  update();
  const modal = h(
    'div',
    { class: 'modal-backdrop' },
    h(
      'div',
      { class: 'modal' },
      riderAvatar(profile(), 'modal-egg'),
      h('h2', {}, 'Keep your dragons here'),
      preview,
      h('div', { class: 'name-pickers' }, first.el, second.el),
      h('div', { class: 'name-dice' }, dice, h('span', { class: 'fine' }, 'Surprise me')),
      h(
        'div',
        { class: 'row' },
        button('Back', () => modal.remove(), 'btn ghost'),
        button('Keep me', () => {
          if (keepGuest(`${adj} ${noun}`)) {
            sfx.coin();
            modal.remove();
            go(hub);
          }
        }),
      ),
    ),
  );
  root.append(modal);
}
