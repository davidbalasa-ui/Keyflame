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
import { hub } from './ui/screens/hub';
import { wingScreen } from './ui/screens/wing';
import { JOIN_PARAM, parseJoin } from './game/wing';

watchInstall();
// Ask the browser to keep saves through storage clean-ups. Safari can otherwise
// clear a site's storage after days without a visit, which would wipe a class's progress.
void navigator.storage?.persist?.().catch(() => false);
// A badge's QR code opens keyflame.org/?join=CODE-BADGE: join that wing straight away.
// Everyone else lands on the home screen and plays.
const url = new URL(location.href);
const join = parseJoin(url.searchParams.get(JOIN_PARAM));
if (url.searchParams.has(JOIN_PARAM)) {
  url.searchParams.delete(JOIN_PARAM);
  history.replaceState(null, '', url.toString());
}
void startApp(document.getElementById('app')!, join ? wingScreen({ join }) : hub);

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
