// Fonts ship with the game so it looks the same offline.
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './styles.css';
import { go, startApp } from './ui/app';
import { watchInstall } from './ui/install';
import { hub } from './ui/screens/hub';
import { wingScreen } from './ui/screens/wing';
import { JOIN_PARAM, joinFromUrl, type WingSeat } from './game/wing';
import { startArtSpeed } from './ui/artSpeed';

watchInstall();
startArtSpeed();
// Ask the browser to keep saves through storage clean-ups. Safari can otherwise
// clear a site's storage after days without a visit, which would wipe a class's progress.
void navigator.storage?.persist?.().catch(() => false);
// A badge's QR code opens keyflame.org/#join=CODE-BADGE-WORD (older cards: ?join=CODE-BADGE):
// join that wing straight away, then wipe it from the address bar and history.
// Everyone else lands on the home screen and plays.
/** Reads a join from the address and wipes it from the address bar and history. */
function takeJoin(): WingSeat | null {
  const url = new URL(location.href);
  const join = joinFromUrl(url);
  if (url.searchParams.has(JOIN_PARAM) || url.hash.includes(`${JOIN_PARAM}=`)) {
    url.searchParams.delete(JOIN_PARAM);
    url.hash = '';
    history.replaceState(null, '', url.toString());
  }
  return join;
}
const join = takeJoin();
// A card scanned while Keyflame is already open in this tab only changes the # part.
window.addEventListener('hashchange', () => {
  const next = takeJoin();
  if (next) go(wingScreen({ join: next }));
});
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
