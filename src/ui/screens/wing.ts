// My wing: where a rider joins their class or family with the code, badge number and secret
// word on their card (or by scanning its QR code), and keeps the QR code for next time.
// Joining picks the badge's own rider on this device, never whoever happened to be playing,
// so a shared iPad can't mix up classmates' nests.

import { CODE_LENGTH, isClassCode, normalizeCode, spacedCode } from '../../game/classroom';
import { BADGE_WORDS, normalizeWord, wordIndex } from '../../game/badgeWord';
import { BADGE_MAX, joinLink, leaveWing, planJoin, riderLabel, type WingSeat } from '../../game/wing';
import { createProfile, type Profile } from '../../save/store';
import { isDemoWing, joinBadge } from '../../net/classApi';
import { unlockEverything } from '../../game/demo';
import { riderSeat, seatFor, setRiderSeat } from '../classTrack';
import { go, isGuest, keepGuest, persist, playAsGuest, profile, randomRiderName, roomForRider, saveData, switchRider, type Screen } from '../app';
import { button, h } from '../dom';
import { badgeQr, qrDataUrl } from '../qr';
import { sfx } from '../sound';
import { withTabs } from '../tabBar';
import { LAST_CODE_KEY, classLobby, localRosterName, readStore, writeStore } from './classroom';
import { hub, topBar } from './hub';
import { parentGate } from './supporter';
import { riderAvatar } from './riders';

export const wing: Screen = (root) => wingScreen({})(root);

/**
 * The wing page. `note` explains why a rider is back here (their class code changed),
 * and `join` comes from a scanned QR code: it fills in the card and joins right away.
 */
export function wingScreen(opts: { note?: string; join?: WingSeat }): Screen {
  return (root) => {
    const p = profile();
    const seat = riderSeat(p);
    const ticket = joinTicket(opts.note ?? '', opts.join);
    const main = h('main', { class: 'wing' });
    // Leaving is a grown-up's job: it sits behind the grown-up question, and only takes this
    // rider out of the wing. Their dragons and progress stay on the device.
    const leaveBox = h(
      'div',
      { class: 'badge-confirm leave-confirm pop-in', hidden: true, role: 'group', 'aria-label': 'Leave wing', tabindex: -1 },
      h('p', {}, h('strong', {}, `Take ${riderLabel(p)} out of this wing?`)),
      h('p', { class: 'fine' }, 'Their dragons stay on this device.'),
      h(
        'div',
        { class: 'row center' },
        button('Leave wing', () => {
          leaveWing(p);
          persist();
          sfx.click();
          go(wingScreen({ note: 'Left the wing. The dragons are safe.' }));
        }, 'btn danger leave-yes'),
        button('Stay', () => {
          leaveBox.hidden = true;
        }, 'btn ghost leave-no'),
      ),
    );
    const others = riderSwitcher(() => {
      leaveBox.hidden = true;
      ticket.el.hidden = false;
      ticket.focus();
    }, !!seat && !opts.join);
    if (seat && !opts.join) {
      ticket.el.hidden = true;
      main.append(h('h1', {}, '🐉 My wing'), others ?? '', wingCard(p, seat.code, seat.badge), leaveBox);
      main.append(
        h('p', { class: 'fine center wing-links' }, button('Grown-ups: leave wing', () => {
          root.append(parentGate(() => {
            ticket.el.hidden = true;
            leaveBox.hidden = false;
            // The box, not a button: the Enter that passed the gate would press a focused button.
            leaveBox.focus();
            leaveBox.scrollIntoView({ block: 'center' });
          }));
        }, 'link leave-wing')),
      );
    } else main.append(h('h1', {}, '🐉 Join your wing'), others ?? '');
    main.append(ticket.el);
    root.append(topBar(() => go(hub), 'Home'), main);
    if (!ticket.el.hidden) ticket.focus();
    // After this screen is up: a join can switch screens, which mustn't happen mid-build.
    if (opts.join) queueMicrotask(() => void ticket.join());
    return withTabs(root, null);
  };
}

/**
 * Every rider saved on this device (and this visit's guest), so a kid taps their own rider
 * instead of typing their card again. Only shown when there's someone to swap to. With
 * `addNew`, a "New rider" chip opens the card form for a badge not on this device yet.
 */
function riderSwitcher(onNew: () => void, addNew: boolean): HTMLElement | null {
  const me = profile();
  const riders = [...saveData().profiles, ...(isGuest() ? [me] : [])];
  if (riders.length < 2 && !addNew) return null;
  const chip = (r: Profile): HTMLElement => {
    const on = r.id === me.id;
    const tag = r.classCode && r.classBadge ? h('small', { class: 'rider-chip-badge' }, `#${r.classBadge}`) : null;
    return button(
      h('span', { class: 'rider-chip-in' }, riderAvatar(r, 'rider-chip-art'), h('span', {}, riderLabel(r)), tag ?? ''),
      () => {
        if (on) return;
        sfx.click();
        switchRider(r);
        go(wing);
      },
      `rider-chip${on ? ' on' : ''}`,
      { 'aria-pressed': on ? 'true' : 'false' },
    );
  };
  return h(
    'section',
    { class: 'wing-riders', 'aria-label': 'Who’s playing?' },
    h('h2', {}, 'Who’s playing?'),
    h(
      'div',
      { class: 'rider-chips' },
      ...riders.map(chip),
      addNew ? button(h('span', { class: 'rider-chip-in' }, h('span', { class: 'rider-chip-plus', 'aria-hidden': 'true' }, '+'), h('span', {}, 'New rider')), () => (sfx.click(), onNew()), 'rider-chip new') : null,
    ),
  );
}

/** The rider's wing: their name, badge, a QR code to save, and the way into wing races. */
function wingCard(p: Profile, code: string, badge: number): HTMLElement {
  // Riders who joined before badge words have no word saved, so their QR code would stop at the word.
  const link = p.classWord ? joinLink(code, badge, p.classWord, p.wingName) : null;
  const saveQr = (): void => {
    if (!link) return;
    const a = h('a', { href: qrDataUrl(link, 10), download: `keyflame-${code}-${badge}.gif` });
    document.body.append(a);
    a.click();
    a.remove();
  };
  return h(
    'section',
    { class: 'wing-card pop-in' },
    h('strong', { class: 'wing-name' }, riderLabel(p)),
    h(
      'div',
      { class: 'wing-ids' },
      h('div', {}, h('small', {}, 'Code'), h('strong', {}, spacedCode(code))),
      h('div', { class: 'wing-badge' }, h('small', {}, 'Badge'), h('strong', {}, `#${badge}`)),
      p.classWord ? h('div', {}, h('small', {}, 'Word'), h('strong', {}, p.classWord)) : null,
    ),
    link ? badgeQr(link, `QR code to play as badge ${badge}`, 'wing-qr') : null,
    link ? h('small', { class: 'wing-qr-tip' }, '📷 Scan to play as you on another device') : null,
    isGuest() && !roomForRider() ? h('small', { class: 'wing-qr-tip' }, 'This device is full, so your dragons stay for this visit.') : null,
    h('div', { class: 'row center' }, button('🏁 Wing race', () => (sfx.click(), go(classLobby(code))), 'btn race-classmates'), link ? button('Save QR', saveQr, 'btn ghost') : null),
  );
}

/** Class or family code, badge number and secret word, as printed on the badge card. */
function joinTicket(note: string, prefill?: WingSeat): { el: HTMLElement; focus: () => void; join: () => Promise<void> } {
  const field = (attrs: Record<string, string | number>): HTMLInputElement =>
    h('input', { type: 'text', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', ...attrs }) as HTMLInputElement;
  const input = field({ class: 'class-code-input', maxlength: 8, autocapitalize: 'characters', enterkeyhint: 'next', 'aria-label': 'Wing code', placeholder: 'ABCDEF', value: prefill?.code ?? readStore(LAST_CODE_KEY) ?? '' });
  const badgeInput = field({ class: 'badge-input', maxlength: 2, inputmode: 'numeric', pattern: '[0-9]*', enterkeyhint: 'next', 'aria-label': 'Your badge number', placeholder: '00', value: prefill ? String(prefill.badge) : '' });
  const wordInput = field({ class: 'word-input', maxlength: 5, autocapitalize: 'characters', enterkeyhint: 'go', 'aria-label': 'Your secret word', placeholder: 'WORD', value: prefill?.word ?? '' });
  const msg = h('p', { class: 'fine', role: 'status' }, note);
  const joinBtn = button('🐉 Join', () => void join(), 'btn race-classmates');
  const askBox = h('div', { class: 'badge-confirm pop-in', hidden: true });

  const fail = (text: string, focus?: HTMLInputElement): void => {
    msg.textContent = text;
    joinBtn.disabled = false;
    focus?.focus();
  };

  /** `keep` answers "are these your dragons?" when a saved rider with no wing is playing. */
  const join = async (keep?: boolean): Promise<void> => {
    const code = normalizeCode(input.value);
    input.value = code;
    const badge = Number(badgeInput.value);
    const word = normalizeWord(wordInput.value);
    wordInput.value = word;
    if (!isClassCode(code)) return fail(code.length === CODE_LENGTH ? 'That isn’t a wing code. Check your card.' : 'The code is 6 letters.', input);
    if (!Number.isInteger(badge) || badge < 1 || badge > BADGE_MAX) return fail('Type your badge number.', badgeInput);
    const name = (prefill && prefill.code === code && prefill.badge === badge ? prefill.name : undefined) ?? localRosterName(code, badge);
    const now = profile();
    const plan = planJoin(saveData().profiles, now, isGuest(), { code, badge });
    if (plan.kind === 'switch' || plan.kind === 'same') {
      // This badge already rides on this device: no word needed.
      const rider = plan.kind === 'switch' ? plan.rider : now;
      if (plan.kind === 'switch') switchRider(rider);
      // A link can't prove its word here, so it only fills in a word (and name) this rider
      // doesn't have yet; it never overwrites the real one.
      const fresh = !rider.classWord || rider.classWord === word;
      if (name && fresh) rider.wingName = name;
      if (BADGE_WORDS.includes(word) && fresh) setRiderSeat(rider, code, badge, word);
      persist();
      writeStore(LAST_CODE_KEY, code);
      sfx.coin();
      go(wing);
      return;
    }
    if (!word) return fail('Type the secret word on your card.', wordInput);
    const index = wordIndex(word);
    if (index < 0) return fail('Check the secret word on your card.', wordInput);
    if (plan.kind === 'ask' && keep === undefined) {
      msg.textContent = '';
      sfx.tap(2);
      askBox.replaceChildren(
        riderAvatar(now, 'modal-egg'),
        h('p', {}, 'Are these your dragons?'),
        h('div', { class: 'row center' }, button('Yes, mine', () => void join(true)), button('New nest', () => void join(false), 'btn ghost')),
      );
      askBox.hidden = false;
      joinBtn.hidden = true;
      return;
    }
    askBox.hidden = true;
    joinBtn.hidden = false;
    // Who rides as the badge: the guest playing now, the saved rider who said these are
    // their dragons, or a brand new rider with a fresh nest.
    const target = plan.kind === 'guest' || keep ? now : createProfile(randomRiderName());
    joinBtn.disabled = true;
    msg.textContent = 'Finding your wing…';
    let status;
    try {
      status = await joinBadge(seatFor(target, code, badge), index);
    } catch {
      return fail('Can’t reach your wing. Check the Wi-Fi.');
    }
    if (status === 'none') return fail('No wing has that code. Check each letter.', input);
    if (status === 'wrong') return fail(`That word doesn’t match badge #${badge}. Check your card.`, wordInput);
    if (status === 'locked') return fail('Too many tries. Ask your grown-up, or try again in 15 minutes.');
    if (status === 'removed') return fail(`Badge #${badge} isn’t in this wing anymore. Ask your grown-up.`, badgeInput);
    if (status !== 'ok') return fail('Check your card and try again.');
    joinBtn.disabled = false;
    if (plan.kind === 'guest') keepGuest();
    else if (target !== now) {
      // A new rider is saved if there's room, or rides as this visit's guest.
      if (roomForRider()) {
        saveData().profiles.push(target);
        switchRider(target);
      } else playAsGuest(target);
    }
    const rider = profile();
    if (name) rider.wingName = name;
    setRiderSeat(rider, code, badge, word);
    // A demo wing opens everything, so a grown-up can look at every part of the game.
    if (!rider.demo && (await isDemoWing(seatFor(rider, code, badge)).catch(() => false))) unlockEverything(rider);
    persist();
    writeStore(LAST_CODE_KEY, code);
    sfx.coin();
    go(wing);
  };

  input.addEventListener('input', () => {
    const v = normalizeCode(input.value);
    if (v !== input.value) input.value = v;
    if (v.length === 6 && document.activeElement === input) badgeInput.focus();
  });
  input.addEventListener('keydown', (e) => e.key === 'Enter' && badgeInput.focus());
  badgeInput.addEventListener('input', () => {
    const v = badgeInput.value.replace(/\D/g, '').slice(0, 2);
    if (v !== badgeInput.value) badgeInput.value = v;
    if (v.length === 2 && document.activeElement === badgeInput) wordInput.focus();
  });
  badgeInput.addEventListener('keydown', (e) => e.key === 'Enter' && wordInput.focus());
  wordInput.addEventListener('input', () => {
    const v = normalizeWord(wordInput.value);
    if (v !== wordInput.value) wordInput.value = v;
  });
  wordInput.addEventListener('keydown', (e) => e.key === 'Enter' && void join());

  const el = h(
    'section',
    { class: 'wing-join' },
    h('p', { class: 'wing-qr-tip' }, h('span', { class: 'qr-cam', 'aria-hidden': 'true' }, '📷'), h('span', {}, h('strong', {}, 'Have a badge card? '), 'Scan it with the Camera app. Or type it below:')),
    h(
      'div',
      { class: 'join-ticket pop-in' },
      h('label', { class: 'jt-field jt-code' }, h('span', { class: 'jt-label' }, 'Code'), input),
      h('label', { class: 'jt-field jt-badge' }, h('span', { class: 'jt-label' }, 'Badge'), h('span', { class: 'badge-ring' }, h('span', { class: 'badge-hash', 'aria-hidden': 'true' }, '#'), badgeInput)),
      h('label', { class: 'jt-field jt-word' }, h('span', { class: 'jt-label' }, 'Secret word'), wordInput),
    ),
    msg,
    askBox,
    h('div', { class: 'row center' }, joinBtn),
  );
  const focus = (): void => (!isClassCode(input.value) ? input : !badgeInput.value ? badgeInput : wordInput).focus();
  return { el, focus, join: () => join() };
}
