// Sends the anonymous daily usage counts (see game/usage.ts). Every call here is fire and
// forget: a count that can't be sent waits on the device for up to a week, and nothing a
// player does ever waits on it or breaks because of it. No cookies are set.

import { CONFIG } from '../config';
import { addUsage, loadUsage, type UsageCount, type UsageEvent, type UsageKind, type UsageState } from '../game/usage';
import { wingKind } from '../net/classApi';
import { isStarglint, today, type Profile } from '../save/store';
import { isGuest, persist, profile } from './app';

const KEY = 'keyflame-usage';
/** Only the real site counts, so test runs and local builds never add to the totals. */
const counted = (): boolean => typeof location !== 'undefined' && /^(www\.)?keyflame\.org$/.test(location.hostname);
const VISIT_KEY = 'keyflame-visit';

function read(): UsageState {
  try {
    return loadUsage(JSON.parse(localStorage.getItem(KEY) ?? 'null'), today());
  } catch {
    return loadUsage(null, today());
  }
}

function write(s: UsageState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Blocked storage: the count is simply skipped.
  }
}

/** Which kind of player this is, for the totals. A wing rider counts as class or family. */
export function usageKind(p: Profile): UsageKind {
  if (p.classCode) {
    if (!p.wingKind) lookUpWing(p);
    return p.wingKind ?? 'class';
  }
  return isGuest() ? 'guest' : 'saved';
}

const looking = new Set<string>();
/** Asks the server once whether the rider's wing is a class or a family. */
function lookUpWing(p: Profile): void {
  const code = p.classCode;
  if (!code || looking.has(code)) return;
  looking.add(code);
  wingKind(code)
    .then((k) => {
      if (k && p.classCode === code) {
        p.wingKind = k;
        persist();
      }
    })
    .catch(() => looking.delete(code));
}

/** Counts one event for the rider playing now (or the given one). Never throws. */
export function countUsage(event: UsageEvent, p: Profile = profile()): void {
  if (!counted()) return;
  try {
    const s = read();
    if (addUsage(s, event, usageKind(p), event === 'active' ? p.id : undefined)) {
      write(s);
      flushSoon();
    }
  } catch {
    // Counting must never get in the way of playing.
  }
}

/** A visit: once per browser tab session. */
export function countVisit(): void {
  if (!counted()) return;
  try {
    if (sessionStorage.getItem(VISIT_KEY)) return;
    sessionStorage.setItem(VISIT_KEY, '1');
  } catch {
    return;
  }
  countUsage('visit');
}

/** A finished race or lesson, plus "played today" the first time for this rider today. */
export function countPlay(event: 'race' | 'lesson', p: Profile = profile()): void {
  countUsage('active', p);
  countUsage(event, p);
}

/** True when this hatch will be the rider's first dragon (Starglint doesn't count). */
export const firstHatch = (p: Profile): boolean => !p.dragons.some((d) => !isStarglint(d));

let timer: number | undefined;
let sending = false;
function flushSoon(): void {
  clearTimeout(timer);
  timer = window.setTimeout(() => void flushUsage(), 1500);
}

async function send(c: UsageCount): Promise<boolean> {
  const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/count_usage`, {
    method: 'POST',
    keepalive: true,
    credentials: 'omit',
    headers: { apikey: CONFIG.feedbackKey, Authorization: `Bearer ${CONFIG.feedbackKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_day: c.day, p_event: c.event, p_kind: c.kind, p_n: c.n }),
  });
  return res.ok;
}

/** Sends waiting counts. Each leaves the queue before it's sent, so another tab won't send it too. */
export async function flushUsage(): Promise<void> {
  if (sending || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  sending = true;
  try {
    for (;;) {
      const s = read();
      const c = s.queue.shift();
      if (!c) break;
      write(s);
      let ok = false;
      try {
        ok = await send(c);
      } catch {
        ok = false;
      }
      if (!ok) {
        const back = read();
        back.queue.unshift(c);
        write(back);
        break;
      }
    }
  } finally {
    sending = false;
  }
}

/** Sends what waited for Wi-Fi as soon as the device is back online. */
export function watchUsage(): void {
  if (!counted()) return;
  window.addEventListener('online', () => void flushUsage());
  void flushUsage();
}
