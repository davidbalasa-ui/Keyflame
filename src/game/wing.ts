// Wings: a class or a family that riders join with a code and their badge number.
// A family wing is made the same way a teacher makes a class, so both share one code
// format. Joining links (and the QR codes that carry them) hold only the code and badge.

import { isClassCode, normalizeCode } from './classroom';
import type { Profile } from '../save/store';

export const SITE_URL = 'https://keyflame.org/';
export const JOIN_PARAM = 'join';
export const BADGE_MAX = 99;

export interface WingSeat {
  code: string;
  badge: number;
}

/** The link a badge's QR code opens: keyflame.org/?join=ABCDEF-7 */
export function joinLink(code: string, badge: number, base = SITE_URL): string {
  return `${base}?${JOIN_PARAM}=${code}-${badge}`;
}

/** Reads a ?join= value, forgiving lower case, spaces and dashes. */
export function parseJoin(value: string | null | undefined): WingSeat | null {
  if (!value) return null;
  const m = /^([A-Za-z\s-]+?)[\s-]*(\d{1,2})$/.exec(value.trim());
  if (!m) return null;
  const code = normalizeCode(m[1]);
  const badge = Number(m[2]);
  if (!isClassCode(code) || badge < 1 || badge > BADGE_MAX) return null;
  return { code, badge };
}

export type JoinPlan =
  /** A rider on this device already rides as this badge: switch to them. */
  | { kind: 'switch'; rider: Profile }
  /** The guest who is playing joins, and is kept on this device if there's room. */
  | { kind: 'guest' }
  /** The saved rider who is playing joins (they had no wing, or this is their wing). */
  | { kind: 'attach' }
  /** The saved rider who is playing is in another wing: ask whether this is them. */
  | { kind: 'ask' };

export function planJoin(saved: Profile[], active: Profile, guest: boolean, seat: WingSeat): JoinPlan {
  const local = saved.find((p) => p.classCode === seat.code && p.classBadge === seat.badge);
  if (local) return local.id === active.id ? { kind: 'attach' } : { kind: 'switch', rider: local };
  if (guest) return { kind: 'guest' };
  if (!active.classCode || !active.classBadge) return { kind: 'attach' };
  return { kind: 'ask' };
}
