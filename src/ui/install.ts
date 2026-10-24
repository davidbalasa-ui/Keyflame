// Installing Keyflame as an app (Chrome and Edge on PC, Android) and telling
// players when the game is saved for offline play.

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: InstallPrompt | null = null;
let offlineReady = false;
// A listener returns false once its screen is gone, and is dropped.
const listeners = new Set<() => boolean | void>();

function notify(): void {
  for (const fn of listeners) if (fn() === false) listeners.delete(fn);
}

export function watchInstall(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep the browser's prompt for our own Install button.
    e.preventDefault();
    deferred = e as InstallPrompt;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    // The worker only turns active after every game file is saved on the device.
    void navigator.serviceWorker.ready.then(() => {
      offlineReady = true;
      notify();
    });
  }
}

export const canInstall = (): boolean => deferred !== null;
export const isOfflineReady = (): boolean => offlineReady;
export const isInstalled = (): boolean =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export async function installApp(): Promise<void> {
  const prompt = deferred;
  if (!prompt) return;
  deferred = null;
  await prompt.prompt();
  await prompt.userChoice.catch(() => undefined);
  notify();
}

export function onInstallChange(fn: () => boolean | void): void {
  listeners.add(fn);
}
