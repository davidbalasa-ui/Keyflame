import { exportBackupCode, importBackupCode, type Settings } from '../../save/store';
import { READING_LEVEL_LABEL, type ReadingLevel } from '../../content/facts';
import { parentGate } from './supporter';
import { applySettings, go, isGuest, persist, persistNow, playAsGuest, profile, roomForRider, saveData, switchRider } from '../app';
import { button, h } from '../dom';
import { choiceList } from '../picker';
import { canInstall, installApp, isInstalled, isOfflineReady, onInstallChange } from '../install';
import { hub, topBar } from './hub';
import { wing } from './wing';
import { feedbackPage } from './feedbackPage';
import { withTabs } from '../tabBar';
import { chooseSimpleArt, simpleArtOn } from '../artSpeed';

type BoolSetting = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

const TOGGLES: Array<[BoolSetting, string]> = [
  ['sound', 'Sound effects'],
  ['showKeyboard', 'Show the full on-screen keyboard'],
  ['largeText', 'Bigger text'],
  ['dyslexiaFont', 'Easier-to-read font'],
  ['reducedMotion', 'Less motion'],
  ['relaxed', 'Relaxed lessons: no clock, mistakes don’t stop you'],
];

/** Simple dragon art for slow tablets. It belongs to the device, so every rider on it shares it. */
function simpleArtToggle(): HTMLElement {
  const box = h('input', { type: 'checkbox', checked: simpleArtOn(), onchange: () => chooseSimpleArt(box.checked) });
  return h('label', { class: 'toggle' }, box, 'Simple dragon art (for slow tablets)');
}

export const settings = (root: HTMLElement): (() => void) => {
  const p = profile();
  const code = h('textarea', { class: 'code-box', rows: 4, readonly: true });
  const copied = h('span', { class: 'fine' });

  root.append(
    topBar(() => go(hub)),
    h(
      'main',
      { class: 'settings' },
      h('h1', {}, 'Settings'),
      h(
        'section',
        {},
        ...TOGGLES.map(([key, label]) => {
          const box = h('input', {
            type: 'checkbox',
            checked: p.settings[key],
            onchange: () => {
              p.settings[key] = box.checked;
              applySettings();
              persist();
            },
          });
          return h('label', { class: 'toggle' }, box, label);
        }),
        simpleArtToggle(),
      ),
      h(
        'section',
        {},
        h('h2', {}, 'How do you type?'),
        choiceList({
          label: 'How do you type?',
          value: p.settings.input,
          choices: [
            ['auto', 'Pick for me (a real keyboard as soon as you press one)'],
            ['keyboard', 'A real keyboard'],
            ['touch', 'Tap the game’s keyboard (phones and tablets)'],
            ['device', 'My phone or tablet’s own keyboard'],
          ],
          onChange: (v) => {
            p.settings.input = v;
            persist();
          },
        }),
        h('p', { class: 'fine' }, 'Touch typing keeps its own records, so phone races and keyboard races are fair.'),
      ),
      h(
        'section',
        {},
        h('h2', {}, 'Fun facts in races'),
        choiceList({
          label: 'Fun facts in races',
          value: p.settings.readingLevel ?? 'younger',
          choices: (['younger', 'older'] as const).map((v) => [v, READING_LEVEL_LABEL[v]] as const),
          onChange: (v: ReadingLevel) => {
            p.settings.readingLevel = v;
            persist();
          },
        }),
        h('p', { class: 'fine' }, 'Once you know every letter, races use real facts at this reading level.'),
      ),
      h(
        'section',
        {},
        h('h2', {}, 'Backup'),
        h('p', {}, 'Your progress is saved on this device only. Make a backup code to move it to another device, or to keep it safe if the browser is cleared.'),
        button('Make a backup code', () => {
          code.value = exportBackupCode(p);
          p.lastBackupAt = Date.now();
          persist();
        }),
        code,
        h(
          'div',
          { class: 'row' },
          button('Copy code', async () => {
            if (!code.value) code.value = exportBackupCode(p);
            try {
              await navigator.clipboard.writeText(code.value);
              copied.textContent = 'Copied!';
            } catch {
              code.select();
              copied.textContent = 'Select the code and copy it.';
            }
          }, 'btn ghost'),
          button('Download save file', () => {
            const blob = new Blob([exportBackupCode(p)], { type: 'text/plain' });
            const a = h('a', { href: URL.createObjectURL(blob), download: `keyflame-${p.name.replace(/\s+/g, '-').toLowerCase()}.txt` });
            a.click();
            URL.revokeObjectURL(a.href);
          }, 'btn ghost'),
          copied,
        ),
        h('div', { class: 'row' }, button('Restore from a backup code', () => restore(root), 'btn ghost')),
      ),
      offlineSection(),
      h(
        'section',
        {},
        h('h2', {}, 'More'),
        h('div', { class: 'row' }, button('💬 Send an idea or bug', () => go(feedbackPage('settings', settings)), 'btn ghost'), button('⇄ Switch rider', () => go(wing), 'btn ghost')),
      ),
      isGuest() ? null : h(
        'section',
        {},
        h('h2', {}, 'Remove this rider'),
        h('p', { class: 'fine' }, 'This deletes this rider and all their dragons from this device. Make a backup code first if you might want them back.'),
        button('Remove rider', () => {
          root.append(
            parentGate(() => {
              if (!confirm(`Remove ${p.name} and all their dragons from this device?`)) return;
              const save = saveData();
              save.profiles = save.profiles.filter((x) => x.id !== p.id);
              playAsGuest();
              void persistNow().then(() => go(hub));
            }),
          );
        }, 'btn danger'),
      ),
    ),
  );
  return withTabs(root, 'settings');
};

/** Brings back a rider from a backup code, including codes made on the old address. */
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
          else if (!roomForRider()) {
            msg.textContent = 'This device already has 4 riders. Remove one first.';
            return;
          } else save.profiles.push(p);
          switchRider(p);
          go(hub);
        }),
      ),
    ),
  );
  root.append(modal);
}

function offlineSection(): HTMLElement {
  const body = h('div');
  const render = (): boolean => {
    if (!body.isConnected && body.childNodes.length) return false;
    body.replaceChildren(
      isInstalled()
        ? h('p', {}, 'Keyflame is installed on this device.')
        : canInstall()
          ? h(
              'div',
              {},
              h('p', {}, 'Install Keyflame to open it like any other app on this computer, from the Start menu or the dock.'),
              button('Install Keyflame', () => void installApp()),
            )
          : h('p', { class: 'fine' }, 'To install it like an app: in Chrome or Edge, click the install icon at the right end of the address bar. In Safari on a Mac, choose File, then Add to Dock.'),
      h(
        'p',
        { class: 'fine' },
        isOfflineReady() ? 'The whole game is saved on this device, so it plays without internet.' : 'Saving the game for offline play…',
      ),
    );
    return true;
  };
  render();
  onInstallChange(render);
  return h('section', {}, h('h2', {}, 'Play offline'), body);
}
