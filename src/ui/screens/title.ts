import { TRIBES, dragonSvg, eggSvg, stageFor } from '../../game/dragons';
import { activeDragon } from '../../game/progress';
import { MAX_PROFILES, NAME_ADJECTIVES, NAME_NOUNS, createProfile, importBackupCode, type Profile } from '../../save/store';
import { applyPendingSupporter, applySettings, go, persist, saveData } from '../app';
import { button, h, svg } from '../dom';
import { canInstall, installApp, onInstallChange } from '../install';
import { diceButton, randomOf, wordPicker } from '../picker';
import { sfx } from '../sound';
import { hub } from './hub';

function avatar(p: Profile): HTMLElement {
  const d = activeDragon(p);
  if (d) return svg(dragonSvg(d.tribe, d.palette, stageFor(d.xp), 'flap', d.skin, d.marking, d.stars), 'avatar');
  return svg(eggSvg(p.nest?.tribe ?? 'emberback', 0, p.nest?.seed ?? 1), 'avatar');
}

function choose(p: Profile): void {
  sfx.click();
  saveData().activeId = p.id;
  applyPendingSupporter();
  persist();
  applySettings();
  go(hub);
}

export const title = (root: HTMLElement): void => {
  const save = saveData();
  const hero = svg(dragonSvg('emberback', 0, 'adult', 'flap hero-dragon'), 'hero');

  const cards = h(
    'div',
    { class: 'profile-grid' },
    ...save.profiles.map((p) =>
      button(h('span', { class: 'profile-card-inner' }, avatar(p), h('strong', {}, p.name), h('small', {}, `${p.dragons.length} dragon${p.dragons.length === 1 ? '' : 's'}`)), () => choose(p), 'profile-card'),
    ),
    save.profiles.length < MAX_PROFILES ? button(h('span', { class: 'profile-card-inner' }, h('span', { class: 'plus' }, '+'), h('strong', {}, 'New rider')), () => newRider(root), 'profile-card new') : null,
  );

  root.append(
    h(
      'main',
      { class: 'title-screen' },
      hero,
      h('h1', { class: 'logo' }, 'Keyflame'),
      h('p', { class: 'tagline' }, 'Type to fly. Race to hatch.'),
      h('h2', {}, save.profiles.length ? 'Who is riding today?' : 'Start your first ride'),
      cards,
      h('p', { class: 'fine' }, button('Restore from a backup code', () => restore(root), 'link')),
      installLink(),
    ),
  );
};

/** Shown only where the browser can install the game as an app. */
function installLink(): HTMLElement {
  const p = h('p', { class: 'fine' }, button('Install Keyflame to play offline', () => void installApp(), 'link'));
  const render = (): boolean => {
    if (!p.isConnected && p.dataset.shown) return false;
    p.hidden = !canInstall();
    p.dataset.shown = '1';
    return true;
  };
  render();
  onInstallChange(render);
  return p;
}

function newRider(root: HTMLElement): void {
  // Names come from preset parts so kids never type personal information.
  let adj = randomOf(NAME_ADJECTIVES);
  let noun = randomOf(NAME_NOUNS);
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
      svg(eggSvg('emberback', 0, 7), 'modal-egg'),
      h('h2', {}, 'Pick your rider name'),
      preview,
      h('div', { class: 'name-pickers' }, first.el, second.el),
      h('div', { class: 'name-dice' }, dice, h('span', { class: 'fine' }, 'Surprise me')),
      h('p', { class: 'fine' }, `Your first egg is an ${TRIBES.emberback.name}. Type to keep it warm!`),
      h(
        'div',
        { class: 'row' },
        button('Back', () => modal.remove(), 'btn ghost'),
        button('Let’s fly', () => {
          const p = createProfile(`${adj} ${noun}`);
          saveData().profiles.push(p);
          choose(p);
        }),
      ),
    ),
  );
  root.append(modal);
}

function restore(root: HTMLElement): void {
  const input = h('textarea', { rows: 4, placeholder: 'Paste a code that starts with KF1-', class: 'code-box' });
  const msg = h('p', { class: 'fine' });
  const modal = h(
    'div',
    { class: 'modal-backdrop' },
    h(
      'div',
      { class: 'modal' },
      h('h2', {}, 'Restore a rider'),
      input,
      msg,
      h(
        'div',
        { class: 'row' },
        button('Cancel', () => modal.remove(), 'btn ghost'),
        button('Restore', () => {
          const p = importBackupCode(input.value);
          const save = saveData();
          if (!p) {
            msg.textContent = 'That code did not work. Check that you copied all of it.';
            return;
          }
          const existing = save.profiles.findIndex((x) => x.id === p.id);
          if (existing >= 0) save.profiles[existing] = p;
          else if (save.profiles.length >= MAX_PROFILES) {
            msg.textContent = 'This device already has 4 riders. Remove one in Settings first.';
            return;
          } else save.profiles.push(p);
          choose(p);
        }),
      ),
    ),
  );
  root.append(modal);
}
