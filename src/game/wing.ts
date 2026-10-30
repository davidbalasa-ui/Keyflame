// Wings: a class or a family that riders join with a code, their badge number and the
// badge's secret word. A family wing is made the same way a teacher makes a class, so both
// share one code format. Join links (and the QR codes that carry them) keep everything after
// a # so it never reaches a server: code, badge, word, and the name the grown-up typed.

import { isClassCode, normalizeCode } from './classroom';
import { BADGE_WORDS, normalizeWord } from './badgeWord';
import type { Profile } from '../save/store';

export const SITE_URL = 'https://keyflame.org/';
export const JOIN_PARAM = 'join';
export const NAME_PARAM = 'name';
export const BADGE_MAX = 99;
/** The longest name a grown-up can give a rider in their wing. */
export const WING_NAME_MAX = 40;

export interface WingSeat {
  code: string;
  badge: number;
  /** The badge's secret word. Old cards and links don't have one. */
  word?: string;
  /** The name the grown-up gave this badge. It stays on the devices that ride as it. */
  name?: string;
}

/** The link a badge's QR code opens: keyflame.org/#join=BCDFGH-7-FROG&name=Ava */
export function joinLink(code: string, badge: number, word?: string, name?: string, base = SITE_URL): string {
  const params = new URLSearchParams({ [JOIN_PARAM]: `${code}-${badge}${word ? `-${word}` : ''}` });
  const n = cleanWingName(name ?? '');
  if (n) params.set(NAME_PARAM, n);
  return `${base}#${params.toString()}`;
}

/** Reads a join value (CODE-BADGE or CODE-BADGE-WORD), forgiving lower case, spaces and dashes. */
export function parseJoin(value: string | null | undefined, name?: string | null): WingSeat | null {
  if (!value) return null;
  const m = /^([A-Za-z\s-]+?)[\s-]*(\d{1,2})(?:[\s-]+([A-Za-z]{3,5}))?$/.exec(value.trim());
  if (!m) return null;
  const code = normalizeCode(m[1]);
  const badge = Number(m[2]);
  if (!isClassCode(code) || badge < 1 || badge > BADGE_MAX) return null;
  const seat: WingSeat = { code, badge };
  const word = m[3] ? normalizeWord(m[3]) : '';
  if (BADGE_WORDS.includes(word)) seat.word = word;
  const n = cleanWingName(name ?? '');
  if (n) seat.name = n;
  return seat;
}

/** Finds a join in a page address: after the # (new cards) or as ?join= (older cards). */
export function joinFromUrl(url: URL): WingSeat | null {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  if (hash.has(JOIN_PARAM)) return parseJoin(hash.get(JOIN_PARAM), hash.get(NAME_PARAM));
  return parseJoin(url.searchParams.get(JOIN_PARAM));
}

/** A grown-up's name for a rider: plain text, one line, trimmed. */
export function cleanWingName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, WING_NAME_MAX);
}

/** The name a rider goes by on this device: the grown-up's name in their wing, else their rider name. */
export function riderLabel(p: Pick<Profile, 'name' | 'wingName'>): string {
  return p.wingName || p.name;
}

export type JoinPlan =
  /** A rider on this device already rides as this badge: switch to them. */
  | { kind: 'switch'; rider: Profile }
  /** The rider playing now already rides as this badge. */
  | { kind: 'same' }
  /** The guest playing this visit becomes this badge's rider. */
  | { kind: 'guest' }
  /** A saved rider with no wing is playing: ask whether these are their dragons. */
  | { kind: 'ask' }
  /** Everyone else (a rider from another wing or badge): a new rider with a fresh nest. */
  | { kind: 'new' };

/**
 * Who rides as a badge after joining. The badge is the identity: joining never hands one
 * rider's nest to another wing's badge, so a shared iPad can't mix up classmates.
 */
export function planJoin(saved: Profile[], active: Profile, guest: boolean, seat: WingSeat): JoinPlan {
  const local = saved.find((p) => p.classCode === seat.code && p.classBadge === seat.badge);
  if (local) return local.id === active.id ? { kind: 'same' } : { kind: 'switch', rider: local };
  if (guest) {
    if (active.classCode === seat.code && active.classBadge === seat.badge) return { kind: 'same' };
    // A guest already riding as another badge (a full shared iPad) is someone else: a new nest.
    return active.classCode && active.classBadge ? { kind: 'new' } : { kind: 'guest' };
  }
  if (!active.classCode || !active.classBadge) return { kind: 'ask' };
  return { kind: 'new' };
}
