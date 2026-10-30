// My wing: where a rider joins their class or family with a code and badge number, keeps
// the QR code that does it for them next time, and swaps between the riders on this device.

import { dragonSvg, eggSvg, stageFor } from '../../game/dragons';
import { activeDragon } from '../../game/progress';
import { isClassCode, normalizeCode, spacedCode } from '../../game/classroom';
import { BADGE_MAX, joinLink, planJoin, type WingSeat } from '../../game/wing';
import { NAME_ADJECTIVES, NAME_NOUNS, createProfile, type Profile } from '../../save/store';
import { joinClassRider } from '../../net/classApi';
import { riderSeat, seatFor, setRiderSeat } from '../classTrack';
import { go, isGuest, keepGuest, playAsGuest, profile, randomRiderName, roomForRider, saveData, switchRider, type Screen } from '../app';
import { button, h, svg } from '../dom';
import { diceButton, randomOf, wordPicker } from '../picker';
import { badgeQr, qrDataUrl } from '../qr';
import { sfx } from '../sound';
import { withTabs } from '../tabBar';
import { LAST_CODE_KEY, classLobby, readStore, writeStore } from './classroom';
import { hub, topBar } from './hub';

function avatar(p: Profile, cls: string): HTMLElement {
  const d = activeDragon(p);
  if (d) return svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), '', d.skin, d.marking, d.stars), cls);
  return svg(eggSvg(p.nest?.tribe ?? 'emberback', 0, p.nest?.seed ?? 1), `${cls} egg`);
}

export const wing: Screen = (root) => wingScreen({})(root);

/**
 * The wing page. `note` explains why a rider is back here (their class code changed),
 * and `join` comes from a scanned QR code: it fills in the ticket and joins right away.
 */
export function wingScreen(opts: { note?: string; join?: WingSeat }): Screen {
  return (root) => {
    const p = profile();
    const seat = riderSeat(p);
    const ticket = joinTicket(opts.note ?? '', opts.join);
    const main = h('main', { class: 'wing' }, h('h1', {}, '🐉 My wing'));
    if (seat && !opts.join) {
      ticket.el.hidden = true;
      main.append(
        wingCard(seat.code, seat.badge),
        h('p', { class: 'fine center' }, button('Join another wing', () => {
          ticket.el.hidden = false;
          ticket.focus();
        }, 'link')),
      );
    }
    main.append(ticket.el, ridersRow(root));
    root.append(topBar(() => go(hub)), main);
    if (!ticket.el.hidden) ticket.focus();
    if (opts.join) void ticket.join(false);
    return withTabs(root, null);
  };
}

/** The rider's wing: code, badge, a QR code to save, and the way into wing races. */
function wingCard(code: string, badge: number): HTMLElement {
  const saveQr = (): void => {
    const a = h('a', { href: qrDataUrl(joinLink(code, badge), 10), download: `keyflame-${code}-${badge}.gif` });
    document.body.append(a);
    a.click();
    a.remove();
  };
  return h(
    'section',
    { class: 'wing-card pop-in' },
    h(
      'div',
      { class: 'wing-ids' },
      h('div', {}, h('small', {}, 'Code'), h('strong', {}, spacedCode(code))),
      h('div', { class: 'wing-badge' }, h('small', {}, 'Badge'), h('strong', {}, `#${badge}`)),
    ),
    badgeQr(code, badge, 'wing-qr'),
    h('small', { class: 'wing-qr-tip' }, '📷 Scan to join on any device'),
    isGuest() && !roomForRider() ? h('small', { class: 'wing-qr-tip' }, 'This device is full, so your dragons stay for this visit.') : null,
    h('div', { class: 'row center' }, button('🏁 Wing race', () => (sfx.click(), go(classLobby(code))), 'btn race-classmates'), button('Save QR', saveQr, 'btn ghost')),
  );
}

/** Class or family code plus badge number. */
function joinTicket(note: string, prefill?: WingSeat): { el: HTMLElement; focus: () => void; join: (confirm: boolean) => Promise<void> } {
  const p = profile();
  const input = h('input', {
    type: 'text',
    class: 'class-code-input',
    maxlength: 8,
    autocapitalize: 'characters',
    autocomplete: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'next',
    'aria-label': 'Wing code',
    placeholder: 'ABCDEF',
    value: prefill?.code ?? readStore(LAST_CODE_KEY) ?? '',
  });
  const badgeInput = h('input', {
    type: 'text',
    class: 'badge-input',
    maxlength: 2,
    inputmode: 'numeric',
    pattern: '[0-9]*',
    autocomplete: 'off',
    enterkeyhint: 'go',
    'aria-label': 'Your badge number',
    placeholder: '00',
    value: prefill ? String(prefill.badge) : p.classBadge ? String(p.classBadge) : '',
  });
  const msg = h('p', { class: 'fine', role: 'status' }, note);
  const joinBtn = button('🐉 Join', () => void join(false), 'btn race-classmates');
  const confirmBox = h('div', { class: 'badge-confirm pop-in', hidden: true });

  const askBox = (...content: HTMLElement[]): void => {
    msg.textContent = '';
    sfx.tap(2);
    confirmBox.replaceChildren(...content);
    confirmBox.hidden = false;
    joinBtn.hidden = true;
  };
  const resetAsk = (): void => {
    confirmBox.hidden = true;
    joinBtn.hidden = false;
  };

  /** `who` answers "is this you?" when the rider playing already belongs to another wing. */
  const join = async (confirm: boolean, who?: 'same' | 'new'): Promise<void> => {
    const code = normalizeCode(input.value);
    input.value = code;
    const badge = Number(badgeInput.value);
    if (!isClassCode(code)) {
      msg.textContent = 'A wing code is 6 letters.';
      return;
    }
    if (!Number.isInteger(badge) || badge < 1 || badge > BADGE_MAX) {
      msg.textContent = 'Type your badge number.';
      badgeInput.focus();
      return;
    }
    const now = profile();
    const plan = planJoin(saveData().profiles, now, isGuest(), { code, badge });
    if (plan.kind === 'switch') {
      // This badge already rides on this device.
      switchRider(plan.rider);
      writeStore(LAST_CODE_KEY, code);
      sfx.coin();
      go(wing);
      return;
    }
    if (plan.kind === 'ask' && !who) {
      askBox(
        h('p', {}, 'Move ', h('b', {}, now.name), ' to this wing?'),
        h('div', { class: 'row center' }, button('Yes, move', () => void join(confirm, 'same')), button('New rider', () => void join(confirm, 'new'), 'btn ghost')),
      );
      return;
    }
    // Who joins: the guest playing now, a brand new rider, or the saved rider playing now.
    const fresh = plan.kind === 'ask' && who === 'new';
    const target = fresh ? createProfile(randomRiderName()) : now;
    joinBtn.disabled = true;
    resetAsk();
    msg.textContent = 'Finding your wing…';
    try {
      const res = await joinClassRider(seatFor(target, code, badge), confirm);
      joinBtn.disabled = false;
      if (res.status === 'none') {
        msg.textContent = 'No wing has that code. Check each letter.';
        return;
      }
      if (res.status === 'taken') {
        // Another device already rides as this badge: the same kid on a new device, or a typo.
        askBox(
          h('p', {}, 'Badge ', h('b', {}, `#${badge}`), ' is'),
          h('p', { class: 'bc-holder' }, res.holder),
          h('p', {}, 'Is that you?'),
          h('div', { class: 'row center' }, button('Yes, that’s me', () => void join(true, who)), button('No', () => {
            resetAsk();
            badgeInput.value = '';
            msg.textContent = 'Check your badge number.';
            badgeInput.focus();
          }, 'btn ghost')),
        );
        return;
      }
    } catch {
      msg.textContent = 'Can’t reach your wing. Check the Wi-Fi.';
      joinBtn.disabled = false;
      return;
    }
    if (plan.kind === 'guest') keepGuest();
    else if (fresh) {
      // A new rider is saved if there's room, or rides as this visit's guest.
      if (roomForRider()) {
        saveData().profiles.push(target);
        switchRider(target);
      } else playAsGuest(target);
    }
    setRiderSeat(profile(), code, badge);
    writeStore(LAST_CODE_KEY, code);
    sfx.coin();
    go(wing);
  };

  input.addEventListener('input', () => {
    const v = normalizeCode(input.value);
    if (v !== input.value) input.value = v;
    if (v.length === 6 && document.activeElement === input) badgeInput.focus();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') badgeInput.focus();
  });
  badgeInput.addEventListener('input', () => {
    const v = badgeInput.value.replace(/\D/g, '').slice(0, 2);
    if (v !== badgeInput.value) badgeInput.value = v;
  });
  badgeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void join(false);
  });

  const el = h(
    'section',
    { class: 'wing-join' },
    h('h2', {}, 'Join a wing'),
    h(
      'div',
      { class: 'join-ticket pop-in' },
      h('label', { class: 'jt-field' }, h('span', { class: 'jt-label' }, 'Class or family code'), input),
      h('label', { class: 'jt-field jt-badge' }, h('span', { class: 'jt-label' }, 'Badge'), h('span', { class: 'badge-ring' }, h('span', { class: 'badge-hash', 'aria-hidden': 'true' }, '#'), badgeInput)),
    ),
    msg,
    confirmBox,
    h('div', { class: 'row center' }, joinBtn),
    h('small', { class: 'wing-qr-tip' }, '📷 Have a QR card? Scan it with the camera.'),
  );
  return { el, focus: () => (isClassCode(input.value) ? badgeInput : input).focus(), join };
}

/** Every rider on this device, plus the guest. Tap one to ride as them. */
function ridersRow(root: HTMLElement): HTMLElement {
  const me = profile();
  const guest = isGuest();
  const chip = (label: string, art: HTMLElement, on: boolean, pick: () => void, extra = ''): HTMLElement =>
    button(h('span', { class: 'rider-chip-in' }, art, h('span', {}, label)), () => (sfx.click(), pick()), `rider-chip${on ? ' on' : ''}${extra}`, { 'aria-pressed': on ? 'true' : 'false' });
  return h(
    'section',
    { class: 'wing-riders' },
    h('h2', {}, 'Riders'),
    h(
      'div',
      { class: 'rider-chips' },
      ...saveData().profiles.map((r) => chip(r.name, avatar(r, 'rider-chip-art'), r.id === me.id, () => (switchRider(r), go(hub)))),
      chip(guest ? `${me.name} (guest)` : 'Guest', guest ? avatar(me, 'rider-chip-art') : h('span', { class: 'rider-chip-plus', 'aria-hidden': 'true' }, '👋'), guest, () => (playAsGuest(), go(hub))),
      guest && roomForRider() ? chip('Keep me', h('span', { class: 'rider-chip-plus', 'aria-hidden': 'true' }, '+'), false, () => keepPicker(root), ' new') : null,
    ),
  );
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
      avatar(profile(), 'modal-egg'),
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
            go(hub);
          }
        }),
      ),
    ),
  );
  root.append(modal);
}
