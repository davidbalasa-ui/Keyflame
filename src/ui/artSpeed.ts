// Slow-device fallback. The detailed cel-shaded dragons are drawn as plain shapes,
// which iPads handle well, but an old or busy tablet can still struggle. On the first
// launch the game watches its frame rate for a few seconds; if it stays low, the
// device switches to the simple classic art. Settings can force either one.
// This is per device (localStorage), not per rider: it is about the hardware.

import { setSimpleArt } from '../game/dragons';

const KEY = 'kf-art';
type Choice = 'simple' | 'full' | 'auto-simple' | 'auto-full';

/**
 * Average frames per second below which the device gets the simple art. iPads in
 * Low Power Mode cap at 30, so the line sits below that.
 */
export const SLOW_FPS = 24;

function read(): Choice | null {
  try {
    return (localStorage.getItem(KEY) as Choice | null) ?? null;
  } catch {
    return null;
  }
}

function write(v: Choice): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* private mode: the choice lasts for this visit */
  }
}

export const simpleArtOn = (): boolean => {
  const v = read();
  return v === 'simple' || v === 'auto-simple';
};

/** The player's choice in Settings. */
export function chooseSimpleArt(on: boolean): void {
  write(on ? 'simple' : 'full');
  setSimpleArt(on);
}

/** Applies the saved choice, and runs the speed check once if there is none yet. */
export function startArtSpeed(): void {
  setSimpleArt(simpleArtOn());
  if (read() || typeof requestAnimationFrame !== 'function') return;
  // Give the first screen a moment to settle, then count frames for 3 seconds.
  // A hidden tab pauses frames, so a run that was hidden at any point doesn't count.
  setTimeout(() => {
    if (document.visibilityState !== 'visible') return;
    let hidden = false;
    const onHide = (): void => {
      hidden = true;
    };
    document.addEventListener('visibilitychange', onHide, { once: true });
    let frames = 0;
    const t0 = performance.now();
    const tick = (): void => {
      frames++;
      const ms = performance.now() - t0;
      if (ms < 3000 && !hidden) {
        requestAnimationFrame(tick);
        return;
      }
      document.removeEventListener('visibilitychange', onHide);
      if (hidden) return;
      const slow = (frames * 1000) / ms < SLOW_FPS;
      write(slow ? 'auto-simple' : 'auto-full');
      // The next screen draws with the new art; nothing on screen jumps now.
      setSimpleArt(slow);
    };
    requestAnimationFrame(tick);
  }, 2500);
}
