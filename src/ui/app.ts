// App state and screen switching.

import { LS_KEY, MAX_PROFILES, NAME_ADJECTIVES, NAME_NOUNS, createProfile, loadSave, normalizeProfile, writeSave, type InputMode, type Profile, type SaveData } from '../save/store';
import { setSoundEnabled } from './sound';
import { grantSupporter } from '../game/supporter';

export type Screen = (root: HTMLElement) => (() => void) | void;

interface AppState {
  save: SaveData;
  root: HTMLElement;
  cleanup: (() => void) | null;
  sessionStart: number;
  breakShown: boolean;
  /** The guest rider: anyone who just opens the game and plays. Kept for this visit only. */
  guest: Profile | null;
}

let state: AppState;

/** Minutes of play before the game suggests a break. */
export const BREAK_AFTER_MIN = 20;

export async function startApp(root: HTMLElement, first: Screen): Promise<void> {
  state = { save: await loadSave(), root, cleanup: null, sessionStart: Date.now(), breakShown: false, guest: null };
  const visit = readGuest();
  state.guest = visit?.guest ?? null;
  // Straight into the game: the guest of this visit, else the rider who played last,
  // else a brand new guest. Nobody has to pick or type anything to start flying.
  if (visit?.active && state.guest) state.save.activeId = state.guest.id;
  else if (!state.save.profiles.some((x) => x.id === state.save.activeId)) playAsGuest();
  claimSupporterReturn();
  applySettings();
  watchHardwareKeyboard();
  go(first);
}

export function saveData(): SaveData {
  return state.save;
}

export function profile(): Profile {
  const p = isGuest() ? state.guest : state.save.profiles.find((x) => x.id === state.save.activeId);
  if (!p) throw new Error('No active profile');
  return p;
}

export function hasProfile(): boolean {
  return isGuest() || state.save.profiles.some((x) => x.id === state.save.activeId);
}

/** True while the guest is playing: progress lasts for this visit only. */
export function isGuest(): boolean {
  return !!state.guest && state.save.activeId === state.guest.id;
}

const GUEST_KEY = 'keyflame-guest';

function readGuest(): { guest: Profile | null; active: boolean } | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(GUEST_KEY) ?? 'null') as { guest?: unknown; active?: boolean } | null;
    return raw ? { guest: normalizeProfile(raw.guest), active: raw.active === true } : null;
  } catch {
    return null;
  }
}

function writeGuest(): void {
  try {
    if (state.guest) sessionStorage.setItem(GUEST_KEY, JSON.stringify({ guest: state.guest, active: isGuest() }));
    else sessionStorage.removeItem(GUEST_KEY);
  } catch {
    // Blocked storage: the guest lasts until the page reloads.
  }
}

const anyOf = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
export const randomRiderName = (): string => `${anyOf(NAME_ADJECTIVES)} ${anyOf(NAME_NOUNS)}`;

/** Plays as this visit's guest (or as `next`, who becomes it), making one if there isn't one yet. */
export function playAsGuest(next?: Profile): Profile {
  if (next) state.guest = next;
  else if (!state.guest) state.guest = createProfile(randomRiderName());
  state.save.activeId = state.guest.id;
  writeGuest();
  applySettings();
  return state.guest;
}

/** Saves this visit's guest as a rider on the device. Null when the device is full. */
export function keepGuest(name?: string): Profile | null {
  const g = state.guest;
  if (!g || roomForRider() === false) return null;
  if (name) g.name = name;
  state.save.profiles.push(g);
  state.guest = null;
  state.save.activeId = g.id;
  writeGuest();
  persist();
  applyPendingSupporter();
  return g;
}

export const roomForRider = (): boolean => state.save.profiles.length < MAX_PROFILES;

/** Rides as one of the device's saved riders. */
export function switchRider(p: Profile): void {
  state.save.activeId = p.id;
  writeGuest();
  applyPendingSupporter();
  persist();
  applySettings();
}

let pending: number | undefined;
// Set once another tab saves: this tab's copy is old, so it stops saving (it would wipe out
// the other tab's progress) and reloads the save as soon as it's looked at again.
let stale = false;
/** Saves soon, batching bursts of changes into one write. */
export function persist(): void {
  writeGuest();
  clearTimeout(pending);
  if (stale) return;
  pending = window.setTimeout(() => void writeSave(state.save), 150);
}

export function persistNow(): Promise<void> {
  writeGuest();
  clearTimeout(pending);
  return stale ? Promise.resolve() : writeSave(state.save);
}

const reloadIfStale = (): void => {
  if (stale && document.visibilityState === 'visible') location.reload();
};
window.addEventListener('storage', (e) => {
  if (e.key !== LS_KEY || e.newValue === null || !state) return;
  stale = true;
  clearTimeout(pending);
  reloadIfStale();
});
document.addEventListener('visibilitychange', reloadIfStale);

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
  guardBack();
}

// The browser's back (Android's back gesture, an iPad swipe) steps back inside the game, the
// way the screen's own ← Back does, instead of leaving Keyflame. Home lets it leave.
let guarded = false;
let dropping = false;
function guardBack(): void {
  const home = !!state.root.querySelector('.hub.home');
  if (guarded && home) {
    // Back home by the game's own buttons: take the extra step off, so Back leaves from here.
    guarded = false;
    dropping = true;
    history.back();
  }
  if (guarded || home) return;
  history.pushState({ keyflame: true }, '');
  guarded = true;
}
window.addEventListener('popstate', () => {
  // A badge card scanned while the game is open changes the # part: that's a join, not a back.
  if (location.hash.includes('join=') || !state) return;
  if (dropping) {
    dropping = false;
    return;
  }
  guarded = false;
  const back = [...state.root.querySelectorAll<HTMLButtonElement>('.top-bar button')].find((b) => b.textContent?.startsWith('←'));
  if (back) back.click();
  else if (!state.root.querySelector('.hub.home')) void import('./screens/hub').then((m) => go(m.hub));
});

/** True once per session after enough play, so the hub can suggest a rest. */
export function breakDue(): boolean {
  if (state.breakShown) return false;
  if (Date.now() - state.sessionStart < BREAK_AFTER_MIN * 60000) return false;
  state.breakShown = true;
  return true;
}

window.addEventListener('pagehide', () => void persistNow());

/**
 * Picks how the player types: 'auto' means the tap keyboard on phones and tablets,
 * unless a real keyboard has been used (an iPad in a keyboard case, say).
 */
export function inputMode(): InputMode {
  const pick = hasProfile() ? profile().settings.input : 'auto';
  if (pick !== 'auto') return pick;
  if (hardwareKeys) return 'keyboard';
  return matchMedia('(pointer: coarse) and (hover: none)').matches ? 'touch' : 'keyboard';
}

const HARDWARE_KEY = 'keyflame-hardware-keyboard';
let hardwareKeys = false;
try {
  hardwareKeys = sessionStorage.getItem(HARDWARE_KEY) === '1';
} catch {
  // Private browsing can block storage; the next key press finds the keyboard again.
}

/** Remembers, for this visit, that a real keyboard is attached. */
export function noteHardwareKey(): void {
  if (hardwareKeys) return;
  hardwareKeys = true;
  try {
    sessionStorage.setItem(HARDWARE_KEY, '1');
  } catch {
    // Remembered in memory only.
  }
}

/**
 * A key press outside a text field can only come from a real keyboard: the on-screen
 * keyboard of a phone or tablet only opens inside one.
 */
export function isHardwareKey(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return false;
  return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
}

function watchHardwareKeyboard(): void {
  document.addEventListener('keydown', (e) => {
    if (isHardwareKey(e)) noteHardwareKey();
  }, true);
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
  // A guest's pack would vanish with the visit, so it waits for a saved rider.
  if (!pending || !hasProfile() || isGuest()) return;
  grantSupporter(profile());
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
  persist();
}
