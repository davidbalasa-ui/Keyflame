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
