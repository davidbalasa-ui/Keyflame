// Usage counts: Keyflame keeps only daily totals of how it's used (visits, new riders,
// players, finished races and lessons), split by kind of player. Nothing names a player or
// a device: each count is a date, an event, a kind and a number. This file is the device's
// side of it: what to count, the per-day caps, and the little queue that waits for Wi-Fi.

export type UsageEvent = 'visit' | 'new_rider' | 'active' | 'race' | 'lesson' | 'kept';
export type UsageKind = 'guest' | 'saved' | 'class' | 'family';

export interface UsageCount {
  day: string;
  event: UsageEvent;
  kind: UsageKind;
  n: number;
}

/** What a device remembers between pings. Kept on the device only, never sent. */
export interface UsageState {
  day: string;
  /** Counts made today, by event, so one device can't run a total up. */
  made: Partial<Record<UsageEvent, number>>;
  /** Riders already counted as playing today (their ids on this device). */
  active: string[];
  /** Counts not sent yet, oldest first. */
  queue: UsageCount[];
}

/** The most of each event one device counts in a day. */
export const DAY_CAPS: Record<UsageEvent, number> = {
  visit: 5,
  new_rider: 6,
  active: 6,
  race: 40,
  lesson: 40,
  kept: 4,
};

/** The server takes counts up to a week old; older ones are dropped. */
export const QUEUE_DAYS = 7;
/** The server adds at most this much in one call. */
export const MAX_N = 50;

export const emptyUsage = (day: string): UsageState => ({ day, made: {}, active: [], queue: [] });

const daysBetween = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** Reads a saved state, starting a new day's caps when the date changed. */
export function loadUsage(raw: unknown, day: string): UsageState {
  const s = raw && typeof raw === 'object' ? (raw as Partial<UsageState>) : {};
  const queue = (Array.isArray(s.queue) ? s.queue : []).filter(
    (q): q is UsageCount =>
      !!q && typeof q.day === 'string' && typeof q.n === 'number' && q.n > 0 && q.event in DAY_CAPS && ['guest', 'saved', 'class', 'family'].includes(q.kind) && daysBetween(q.day, day) < QUEUE_DAYS,
  );
  if (s.day !== day) return { ...emptyUsage(day), queue };
  return {
    day,
    made: s.made && typeof s.made === 'object' ? s.made : {},
    active: Array.isArray(s.active) ? s.active.filter((x) => typeof x === 'string').slice(0, 20) : [],
    queue,
  };
}

/**
 * Counts one event if today's cap allows it. `rider` makes an "active" count happen once
 * per rider per day. Returns true when it was counted.
 */
export function addUsage(s: UsageState, event: UsageEvent, kind: UsageKind, rider?: string): boolean {
  if (event === 'active') {
    if (!rider || s.active.includes(rider)) return false;
  }
  const made = s.made[event] ?? 0;
  if (made >= DAY_CAPS[event]) return false;
  s.made[event] = made + 1;
  if (event === 'active' && rider) s.active.push(rider);
  const same = s.queue.find((q) => q.day === s.day && q.event === event && q.kind === kind && q.n < MAX_N);
  if (same) same.n++;
  else s.queue.push({ day: s.day, event, kind, n: 1 });
  return true;
}
