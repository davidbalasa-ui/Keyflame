// Class codes and the class board, through the KeyFlame Supabase project's functions.
// The public key can call these functions and nothing else on the class tables.

import { CONFIG } from '../config';

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: CONFIG.feedbackKey, Authorization: `Bearer ${CONFIG.feedbackKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn} failed: ${res.status}`);
  return (await res.json()) as T;
}

export interface TeacherClass {
  code: string;
  /** Lets this device clear the board. It never leaves the teacher's device. */
  key: string;
}

export async function createClass(): Promise<TeacherClass> {
  const rows = await rpc<Array<{ class_code: string; teacher_key: string }>>('create_class');
  return { code: rows[0].class_code, key: rows[0].teacher_key };
}

export function joinClass(code: string): Promise<boolean> {
  return rpc<boolean>('join_class', { p_code: code });
}

export interface BoardRow {
  rider: string;
  best_wpm: number;
  best_accuracy: number;
  races: number;
  wins: number;
  touch: boolean;
}

export function classBoard(code: string): Promise<BoardRow[]> {
  return rpc<BoardRow[]>('class_board', { p_code: code });
}

export function postClassRace(code: string, r: { rider: string; wpm: number; accuracy: number; place: number; racers: number; touch: boolean }): Promise<boolean> {
  return rpc<boolean>('post_class_race', {
    p_code: code,
    p_rider: r.rider,
    p_wpm: Math.min(250, Math.max(0, r.wpm)),
    p_accuracy: Math.min(1, Math.max(0, r.accuracy)),
    p_place: Math.min(40, r.place),
    p_racers: Math.min(40, r.racers),
    p_touch: r.touch,
  });
}

export function clearClassBoard(t: TeacherClass): Promise<boolean> {
  return rpc<boolean>('clear_class_board', { p_code: t.code, p_key: t.key });
}

// ---------- Following riders over time ----------

/** What the server says about a rider and the class: in it, no such class, removed by the teacher, or posting too fast. */
export type RiderStatus = 'ok' | 'none' | 'removed' | 'slow';

/** A badge number the teacher gave a kid, and this device's key for riding as it. */
export interface ClassSeat {
  code: string;
  badge: number;
  key: string;
  name: string;
}

/** ok, no such class, wrong word, too many wrong words lately, or (a check-in) this device no longer rides as the badge. */
export type JoinStatus = 'ok' | 'none' | 'wrong' | 'locked' | 'removed';

/**
 * Opens the class as a badge. A new device needs the badge's secret word (its place in the
 * word list); a null word is a check-in with a remembered badge, which never claims one.
 */
export function joinBadge(seat: ClassSeat, word: number | null): Promise<JoinStatus> {
  return rpc<JoinStatus>('join_badge', { p_code: seat.code, p_badge: seat.badge, p_word: word, p_rider_key: seat.key, p_name: seat.name });
}

export interface ActivityPost {
  kind: 'lesson' | 'race' | 'class';
  lesson?: string;
  stars?: number;
  /** Left out for relaxed lessons, which have no clock. */
  wpm: number | null;
  accuracy: number;
  place?: number;
  racers?: number;
  touch: boolean;
}

/** One finished lesson or race. A class race also goes on the class board. */
export function postClassActivity(seat: ClassSeat, a: ActivityPost): Promise<RiderStatus> {
  return rpc<RiderStatus>('post_class_activity', {
    p_code: seat.code,
    p_badge: seat.badge,
    p_rider_key: seat.key,
    p_name: seat.name,
    p_kind: a.kind,
    p_lesson: a.lesson ?? null,
    p_stars: a.stars ?? null,
    p_wpm: a.wpm === null ? null : Math.min(250, Math.max(0, a.wpm)),
    p_accuracy: Math.min(1, Math.max(0, a.accuracy)),
    p_place: a.place === undefined ? null : Math.min(40, a.place),
    p_racers: a.racers === undefined ? null : Math.min(40, a.racers),
    p_touch: a.touch,
  });
}

export interface RiderRow {
  id: string;
  badge: number;
  name: string;
  joined_at: string;
  last_seen: string;
  lessons_passed: number;
  lessons: number;
  races: number;
  class_races: number;
  wins: number;
  best_wpm: number | null;
  recent_wpm: number | null;
  prev_wpm: number | null;
  recent_accuracy: number | null;
  touch: boolean | null;
  active_days: number;
}

export interface ActivityRow {
  kind: 'lesson' | 'race' | 'class';
  lesson: string | null;
  stars: number | null;
  wpm: number | null;
  accuracy: number;
  place: number | null;
  racers: number | null;
  touch: boolean;
  created_at: string;
}

export interface WeekRow {
  week: string;
  riders: number;
  sessions: number;
  avg_wpm: number | null;
  avg_accuracy: number;
}

export function teacherRiders(t: TeacherClass): Promise<RiderRow[]> {
  return rpc<RiderRow[]>('teacher_riders', { p_code: t.code, p_key: t.key });
}

export function teacherRiderActivity(t: TeacherClass, riderId: string): Promise<ActivityRow[]> {
  return rpc<ActivityRow[]>('teacher_rider_activity', { p_code: t.code, p_key: t.key, p_rider: riderId });
}

export function teacherWeeks(t: TeacherClass): Promise<WeekRow[]> {
  return rpc<WeekRow[]>('teacher_weeks', { p_code: t.code, p_key: t.key });
}

export function removeRider(t: TeacherClass, riderId: string): Promise<boolean> {
  return rpc<boolean>('teacher_remove_rider', { p_code: t.code, p_key: t.key, p_rider: riderId });
}

/** A new code for the same class. Null when this device isn't the class's teacher. */
export function newClassCode(t: TeacherClass): Promise<string | null> {
  return rpc<string | null>('teacher_new_code', { p_code: t.code, p_key: t.key });
}

// ---------- The teacher's locked backup ----------

export function saveVault(t: TeacherClass, salt: string, proof: string, vault: string): Promise<boolean> {
  return rpc<boolean>('teacher_save_vault', { p_code: t.code, p_key: t.key, p_salt: salt, p_proof: proof, p_vault: vault });
}

export function vaultSalt(code: string): Promise<string | null> {
  return rpc<string | null>('class_vault_salt', { p_code: code });
}

/** The locked backup for the right password proof, else null. Throws after too many tries. */
export function restoreVault(code: string, proof: string): Promise<string | null> {
  return rpc<string | null>('teacher_restore', { p_code: code, p_proof: proof });
}
