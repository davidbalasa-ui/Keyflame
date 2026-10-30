// Lets a rider's class follow their progress: once a rider joins their class with the badge
// number their teacher gave them, each lesson and race they finish is sent to the class
// under that number and their preset-word rider name. Nothing else is sent.

import { classRiderName, newRiderKey } from '../game/classroom';
import { postClassActivity, type ActivityPost, type ClassSeat } from '../net/classApi';
import type { Profile } from '../save/store';
import { persist } from './app';

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
  p.classCode = code ?? undefined;
  p.classBadge = badge ?? undefined;
  p.classWord = w;
  persist();
}

/** Sends a finished lesson or race to the rider's class, if they're in one. Never blocks play. */
export function reportToClass(p: Profile, a: ActivityPost): void {
  const seat = riderSeat(p);
  if (!seat) return;
  void postClassActivity(seat, a)
    .then((status) => {
      // The class got a new code, or the teacher took this badge out of it.
      if ((status === 'none' || status === 'removed') && p.classCode === seat.code) setRiderSeat(p, null, null);
    })
    .catch(() => undefined);
}
