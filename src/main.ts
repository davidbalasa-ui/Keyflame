// Fonts ship with the game so it looks the same offline.
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './styles.css';
import { startApp } from './ui/app';
import { watchInstall } from './ui/install';
import { title } from './ui/screens/title';

watchInstall();
void startApp(document.getElementById('app')!, title);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // When a new version's worker takes over, reload once so players never keep
  // playing an old build. The first install (no previous worker) doesn't reload.
  const hadWorker = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadWorker || reloaded) return;
    reloaded = true;
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`./sw.js?v=${__BUILD_ID__}`)
      .then((reg) => reg.update())
      .catch(() => undefined);
  });
}
