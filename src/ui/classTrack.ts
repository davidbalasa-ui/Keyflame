// Lets a rider's class follow their progress: once a rider joins their class with the badge
// number their teacher gave them, each lesson and race they finish is sent to the class
// under that number and their preset-word rider name. Nothing else is sent. Results wait in
// the rider's outbox until the class has them, so no Wi-Fi never loses one.

import { classRiderName, newActivityId, newRiderKey, retryDelay } from '../game/classroom';
import { postClassActivity, type ActivityPost, type ClassSeat, type RiderStatus } from '../net/classApi';
import { OUTBOX_MAX, type Profile } from '../save/store';
import { allRiders, persist } from './app';

/** This rider's device key, made the first time they join a class. */
export function riderKey(p: Profile): string {
  if (!p.classKey) {
    p.classKey = newRiderKey();
    persist();
  }
  return p.classKey;
}

export function seatFor(p: Profile, code: string, badge: number): ClassSeat {
  return { code, badge, key: riderKey(p), name: classRiderName(p.name) };
}

/** The class and badge this rider joined, if any. */
export function riderSeat(p: Profile): ClassSeat | null {
  return p.classCode && p.classBadge ? seatFor(p, p.classCode, p.classBadge) : null;
}

/** Sets (or with nulls, clears) the rider's class, badge and badge word. */
export function setRiderSeat(p: Profile, code: string | null, badge: number | null, word?: string): void {
  const w = code ? word ?? (p.classCode === code && p.classBadge === badge ? p.classWord : undefined) : undefined;
  if ((p.classCode ?? null) === code && (p.classBadge ?? null) === badge && p.classWord === w) return;
  if ((p.classCode ?? null) !== code) delete p.wingKind;
  p.classCode = code ?? undefined;
  p.classBadge = badge ?? undefined;
  p.classWord = w;
  persist();
}

/**
 * Sends a finished lesson, race or placement check to the rider's class, if they're in one.
 * It goes into the rider's outbox first and leaves only once the class has it, so a lost
 * connection (or closing the app) never drops it. Never blocks play.
 */
export function reportToClass(p: Profile, a: ActivityPost): void {
  const seat = riderSeat(p);
  if (!seat) return;
  p.classOutbox = [...(p.classOutbox ?? []), { id: newActivityId(), at: Date.now(), code: seat.code, badge: seat.badge, a }].slice(-OUTBOX_MAX);
  persist();
  void flushClassOutbox();
}

let flushing = false;
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
/** The server takes one result per rider every three seconds. */
const BRAKE_MS = 3200;

/** Sends every rider's waiting results, oldest first. Tries again later if the class can't be reached. */
export async function flushClassOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  clearTimeout(retryTimer);
  try {
    for (const p of allRiders()) {
      let sent = false;
      while (p.classOutbox?.length) {
        const item = p.classOutbox[0];
        if (sent) await wait(BRAKE_MS);
        let status: RiderStatus;
        try {
          status = await postClassActivity(seatFor(p, item.code, item.badge), item.a, item.id, item.at);
        } catch {
          failures++;
          retryTimer = setTimeout(() => void flushClassOutbox(), retryDelay(failures));
          return;
        }
        failures = 0;
        if (status === 'slow') {
          sent = true;
          continue;
        }
        if (status === 'none' || status === 'removed') {
          // The class got a new code, or the teacher took this badge out of it.
          if (p.classCode === item.code && p.classBadge === item.badge) setRiderSeat(p, null, null);
          p.classOutbox = p.classOutbox.filter((x) => x.code !== item.code || x.badge !== item.badge);
        } else p.classOutbox = p.classOutbox.filter((x) => x.id !== item.id);
        if (!p.classOutbox.length) p.classOutbox = undefined;
        persist();
        sent = true;
      }
    }
  } finally {
    flushing = false;
  }
}

if (typeof window !== 'undefined') window.addEventListener('online', () => void flushClassOutbox());
