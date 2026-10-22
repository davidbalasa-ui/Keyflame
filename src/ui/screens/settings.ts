import { exportBackupCode, type Settings } from '../../save/store';
import { applySettings, go, persist, persistNow, profile, saveData } from '../app';
import { button, h } from '../dom';
import { hub, topBar } from './hub';
import { title } from './title';

const TOGGLES: Array<[keyof Settings, string]> = [
  ['sound', 'Sound effects'],
  ['showKeyboard', 'Show the full on-screen keyboard'],
  ['largeText', 'Bigger text'],
  ['dyslexiaFont', 'Easier-to-read font'],
  ['reducedMotion', 'Less motion'],
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
      h(
        'section',
        { class: 'parents' },
        h('h2', {}, 'For parents'),
        h('p', {}, 'Keyflame keeps all progress in this browser. It does not ask for names, emails, or any personal information, and it does not track players. Rider and dragon names are picked from preset word lists.'),
      ),
      h(
        'section',
        {},
        h('h2', {}, 'Remove this rider'),
        h('p', { class: 'fine' }, 'This deletes this rider and all their dragons from this device. Make a backup code first if you might want them back.'),
        button('Remove rider', () => {
          if (!confirm(`Remove ${p.name} and all their dragons from this device?`)) return;
          const save = saveData();
          save.profiles = save.profiles.filter((x) => x.id !== p.id);
          save.activeId = null;
          void persistNow().then(() => go(title));
        }, 'btn danger'),
      ),
    ),
  );
};
