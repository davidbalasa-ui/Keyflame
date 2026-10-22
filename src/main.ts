import './styles.css';
import { startApp } from './ui/app';
import { title } from './ui/screens/title';

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
