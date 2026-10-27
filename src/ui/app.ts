// App state and screen switching.

import { loadSave, writeSave, type InputMode, type Profile, type SaveData } from '../save/store';
import { setSoundEnabled } from './sound';
import { grantSupporter } from '../game/supporter';

export type Screen = (root: HTMLElement) => (() => void) | void;

interface AppState {
  save: SaveData;
  root: HTMLElement;
  cleanup: (() => void) | null;
  sessionStart: number;
  breakShown: boolean;
}

let state: AppState;

/** Minutes of play before the game suggests a break. */
export const BREAK_AFTER_MIN = 20;

export async function startApp(root: HTMLElement, first: Screen): Promise<void> {
  state = { save: await loadSave(), root, cleanup: null, sessionStart: Date.now(), breakShown: false };
  claimSupporterReturn();
  applySettings();
  go(first);
}

export function saveData(): SaveData {
  return state.save;
}

export function profile(): Profile {
  const p = state.save.profiles.find((x) => x.id === state.save.activeId);
  if (!p) throw new Error('No active profile');
  return p;
}

export function hasProfile(): boolean {
  return state.save.profiles.some((x) => x.id === state.save.activeId);
}

let pending: number | undefined;
/** Saves soon, batching bursts of changes into one write. */
export function persist(): void {
  clearTimeout(pending);
  pending = window.setTimeout(() => void writeSave(state.save), 150);
}

export function persistNow(): Promise<void> {
  clearTimeout(pending);
  return writeSave(state.save);
}

export function applySettings(): void {
  const s = hasProfile() ? profile().settings : null;
  const body = document.body.classList;
  body.toggle('reduced-motion', !!s?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches);
  body.toggle('dyslexia-font', !!s?.dyslexiaFont);
  body.toggle('large-text', !!s?.largeText);
  setSoundEnabled(s?.sound ?? true);
}

export function go(screen: Screen): void {
  state.cleanup?.();
  state.cleanup = null;
  state.root.replaceChildren();
  window.scrollTo(0, 0);
  state.cleanup = screen(state.root) ?? null;
}

/** True once per session after enough play, so the hub can suggest a rest. */
export function breakDue(): boolean {
  if (state.breakShown) return false;
  if (Date.now() - state.sessionStart < BREAK_AFTER_MIN * 60000) return false;
  state.breakShown = true;
  return true;
}

window.addEventListener('pagehide', () => void persistNow());

/** Picks how the player types: 'auto' means the tap keyboard on phones and tablets. */
export function inputMode(): InputMode {
  const pick = hasProfile() ? profile().settings.input : 'auto';
  if (pick !== 'auto') return pick;
  return matchMedia('(pointer: coarse) and (hover: none)').matches ? 'touch' : 'keyboard';
}

const PENDING_KEY = 'keyflame-supporter-pending';

/**
 * The checkout sends buyers back to ?supporter=thanks. This is an honor system:
 * there are no accounts to check a receipt against yet.
 */
function claimSupporterReturn(): void {
  const url = new URL(location.href);
  if (url.searchParams.get('supporter') === 'thanks') {
    url.searchParams.delete('supporter');
    history.replaceState(null, '', url.toString());
    try {
      localStorage.setItem(PENDING_KEY, '1');
    } catch {
      // ignore
    }
  }
  applyPendingSupporter();
}

/** Gives the supporter pack to the rider who is playing, once one is chosen. */
export function applyPendingSupporter(): void {
  let pending = false;
  try {
    pending = localStorage.getItem(PENDING_KEY) === '1';
  } catch {
    return;
  }
  if (!pending || !hasProfile()) return;
  grantSupporter(profile());
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
  persist();
}
