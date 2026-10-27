import { exportBackupCode, type Settings } from '../../save/store';
import { READING_LEVEL_LABEL, type ReadingLevel } from '../../content/facts';
import { parentGate } from './supporter';
import { applySettings, go, persist, persistNow, profile, saveData } from '../app';
import { button, h } from '../dom';
import { canInstall, installApp, isInstalled, isOfflineReady, onInstallChange } from '../install';
import { hub, topBar } from './hub';
import { title } from './title';

type BoolSetting = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

const TOGGLES: Array<[BoolSetting, string]> = [
  ['sound', 'Sound effects'],
  ['showKeyboard', 'Show the full on-screen keyboard'],
  ['largeText', 'Bigger text'],
  ['dyslexiaFont', 'Easier-to-read font'],
  ['reducedMotion', 'Less motion'],
  ['relaxed', 'Relaxed lessons: no clock, mistakes don’t stop you'],
];

export const settings = (root: HTMLElement): void => {
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
      ),
      h(
        'section',
        {},
        h('h2', {}, 'How do you type?'),
        (() => {
          const sel = h(
            'select',
            {
              onchange: () => {
                p.settings.input = sel.value as Settings['input'];
                persist();
              },
            },
            ...(
              [
                ['auto', 'Pick for me'],
                ['keyboard', 'A real keyboard'],
                ['touch', 'Tap the game’s keyboard (phones and tablets)'],
                ['device', 'My phone or tablet’s own keyboard'],
              ] as const
            ).map(([v, label]) => h('option', { value: v, selected: p.settings.input === v }, label)),
          );
          return sel;
        })(),
        h('p', { class: 'fine' }, 'Touch typing keeps its own records, so phone races and keyboard races are fair.'),
      ),
      h(
        'section',
        {},
        h('h2', {}, 'Fun facts in races'),
        (() => {
          const sel = h(
            'select',
            {
              onchange: () => {
                p.settings.readingLevel = sel.value as ReadingLevel;
                persist();
              },
            },
            ...(['younger', 'older'] as const).map((v) => h('option', { value: v, selected: (p.settings.readingLevel ?? 'younger') === v }, READING_LEVEL_LABEL[v])),
          );
          return sel;
        })(),
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
      ),
      offlineSection(),
      h(
        'section',
        { class: 'parents' },
        h('h2', {}, 'For parents'),
        h('p', {}, 'Keyflame keeps all progress in this browser. It does not ask for names, emails, or any personal information, and it does not track players. Rider and dragon names are picked from preset word lists.'),
        h('p', {}, 'Keyflame has no ads and nothing to buy. Later, an optional one-time supporter pack may add a special dragon skin; it never makes anyone faster.'),
        h('p', {}, h('a', { href: './privacy.html', target: '_blank', rel: 'noopener' }, 'Read the privacy policy')),
      ),
      h(
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
              save.activeId = null;
              void persistNow().then(() => go(title));
            }),
          );
        }, 'btn danger'),
      ),
    ),
  );
};

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
