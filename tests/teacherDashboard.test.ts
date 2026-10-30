import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { lastActive, mergeRoster, newRiderKey, nextBadge, parseStudentList, riderNotes, ridersCsv, speedTrend, weekCompare } from '../src/game/classroom';
import { readBackupFile } from '../src/ui/screens/teacherDashboard';
import { deriveKeys, lock, newSalt, unlock } from '../src/net/teacherVault';
import { normalizeProfile, createProfile } from '../src/save/store';
import { badgeWord, wordIndex } from '../src/game/badgeWord';

describe('teacher dashboard helpers', () => {
  it('makes 32-character hex rider keys', () => {
    const k = newRiderKey();
    expect(k).toMatch(/^[0-9a-f]{32}$/);
    expect(newRiderKey()).not.toBe(k);
  });

  it('reads speed trends with a small dead zone', () => {
    expect(speedTrend(null, 10)).toBeNull();
    expect(speedTrend(12, 10)).toBe('up');
    expect(speedTrend(10.4, 10)).toBe('flat');
    expect(speedTrend(8, 10)).toBe('down');
    expect(speedTrend(41, 40)).toBe('flat');
  });

  it('says when a rider was last active', () => {
    const now = new Date(2026, 9, 29, 15);
    expect(lastActive(new Date(2026, 9, 29, 8).toISOString(), now)).toBe('Today');
    expect(lastActive(new Date(2026, 9, 28, 23).toISOString(), now)).toBe('Yesterday');
    expect(lastActive(new Date(2026, 9, 24, 12).toISOString(), now)).toBe('5 days ago');
    expect(lastActive(new Date(2026, 9, 1, 12).toISOString(), now)).toBe('4 weeks ago');
  });

  it('flags riders who could use a hand', () => {
    const now = new Date('2026-10-29T12:00:00Z');
    expect(riderNotes({ last_seen: '2026-10-20T12:00:00Z', recent_accuracy: 0.8, lessons: 2, races: 2 }, now)).toEqual(['Not seen this week', 'Accuracy under 85%']);
    expect(riderNotes({ last_seen: '2026-10-29T10:00:00Z', recent_accuracy: 0.8, lessons: 1, races: 0 }, now)).toEqual([]);
  });

  it('finds this week and last week (weeks start Monday)', () => {
    const weeks = [{ week: '2026-10-19' }, { week: '2026-10-26' }];
    const { thisWeek, lastWeek } = weekCompare(weeks, new Date('2026-10-29T12:00:00Z'));
    expect(thisWeek?.week).toBe('2026-10-26');
    expect(lastWeek?.week).toBe('2026-10-19');
  });

  it('turns a pasted class list into badge numbers', () => {
    expect(parseStudentList('Ava\n\n  Ben Li \r\n3. Cara\n4) Dev\nSmith, Emma\n')).toEqual(['Ava', 'Ben Li', 'Cara', 'Dev', 'Smith, Emma']);
    expect(parseStudentList('a\n'.repeat(120)).length).toBe(99);
  });

  it('gives the next badge after every used one', () => {
    expect(nextBadge([])).toBe(1);
    expect(nextBadge([1, 2, 5])).toBe(6);
    expect(nextBadge([99])).toBeNull();
  });

  it('lists every badge on the teacher list and every badge that joined', () => {
    const rows = mergeRoster({ 1: 'Ava', 3: 'Cara' }, [{ badge: 3, name: 'Brave Comet' }, { badge: 7, name: 'Swift Ember' }]);
    expect(rows.map((r) => [r.badge, r.student, r.rider?.name ?? null])).toEqual([[1, 'Ava', null], [3, 'Cara', 'Brave Comet'], [7, '', 'Swift Ember']]);
  });

  it('writes a safe spreadsheet', () => {
    const rider = { name: 'Brave Comet', last_seen: '2026-10-29T10:00:00Z', lessons_passed: 3, lessons: 5, races: 2, best_wpm: 21.4, recent_wpm: 18.6, recent_accuracy: 0.934, active_days: 2 };
    const csv = ridersCsv([{ badge: 4, student: '=Sam, "S"', rider }, { badge: 5, student: 'Ava', rider: null }], 20);
    const [head, row, waiting] = csv.trim().split('\n');
    expect(head.startsWith('Badge,Student,Rider name')).toBe(true);
    expect(row).toBe(`4,"'=Sam, ""S""",Brave Comet,2026-10-29,3/20,5,2,21,19,93%,2`);
    expect(waiting).toBe('5,Ava,Not joined yet,,,,,,,,');
  });

  it('reads only real teacher backup files', () => {
    const good = JSON.stringify({ keyflame: 'teacher-backup', v: 1, code: 'BCDFGH', key: 'k'.repeat(32), roster: { 1: 'Ava', 200: 'Nope', 2: 5 } });
    expect(readBackupFile(good)).toEqual({ code: 'BCDFGH', key: 'k'.repeat(32), roster: { 1: 'Ava' }, retired: [] });
    expect(readBackupFile(JSON.stringify({ ...JSON.parse(good), retired: [3, 'x', 400] }))?.retired).toEqual([3]);
    expect(readBackupFile('{"code":"BCDFGH"}')).toBeNull();
    expect(readBackupFile('not json')).toBeNull();
  });

  it('locks the student list so only the teacher password opens it', async () => {
    const salt = newSalt();
    const keys = await deriveKeys('apple tree', salt);
    expect(keys.proof).toMatch(/^[0-9a-f]{64}$/);
    const blob = await lock({ key: 'teacher', roster: { 1: 'Ava' } }, keys);
    expect(blob).not.toContain('Ava');
    expect(await unlock(blob, await deriveKeys('apple tree', salt))).toEqual({ key: 'teacher', roster: { 1: 'Ava' } });
    await expect(unlock(blob, await deriveKeys('apple trees', salt))).rejects.toThrow();
    expect((await deriveKeys('apple tree', newSalt())).proof).not.toBe(keys.proof);
  });

  it('keeps a valid class key and code in saves and backup codes', () => {
    const p = { ...createProfile('Brave Comet'), classKey: 'a'.repeat(32), classCode: 'BCDFGH', classBadge: 7 };
    expect(normalizeProfile(p)).toMatchObject({ classKey: 'a'.repeat(32), classCode: 'BCDFGH', classBadge: 7 });
    expect(normalizeProfile({ ...p, classKey: 'nope', classCode: 'bad', classBadge: 100 })).toMatchObject({ classKey: undefined, classCode: undefined, classBadge: undefined });
  });
});

describe('classroom database functions', () => {
  let db: PGlite;
  const call = async <T = Record<string, unknown>>(fn: string, args: Record<string, unknown> = {}): Promise<T[]> => {
    const names = Object.keys(args);
    return db.transaction(async (tx) => {
      await tx.exec('set local role anon');
      const out = await tx.query<T>(`select * from public.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(', ')})`, names.map((n) => args[n]));
      return out.rows;
    });
  };
  const one = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => Object.values((await call(fn, args))[0])[0] as T;
  const K1 = '1'.repeat(32);
  const K2 = '2'.repeat(32);
  const K3 = '3'.repeat(32);
  let code = '';
  let key = '';
  /** Joins with the badge's real word unless another word number (or null, a check-in) is given. */
  const join = async (badge: number, k: string, name: string, word?: number | null) =>
    one<string>('join_badge', { p_code: code, p_badge: badge, p_word: word === undefined ? wordIndex(badgeWord(key, badge)) : word, p_rider_key: k, p_name: name });
  const wrongWord = (badge: number) => (wordIndex(badgeWord(key, badge)) + 1) % 256;
  const post = (badge: number, k: string, name: string, extra: Record<string, unknown>) =>
    one<string>('post_class_activity', {
      p_code: code, p_badge: badge, p_rider_key: k, p_name: name, p_kind: 'lesson', p_lesson: null, p_stars: null, p_wpm: 10, p_accuracy: 0.9, p_place: null, p_racers: null, p_touch: false, ...extra,
    });
  // The 3-second flood brake: move earlier activity into the past between posts.
  const age = () => db.exec(`update class_activity set created_at = created_at - interval '1 day'`);

  beforeAll(async () => {
    db = new PGlite();
    await db.exec('create role anon; create role authenticated; grant usage on schema public to anon, authenticated;');
    const migrations = import.meta.glob<string>('../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true });
    for (const f of Object.keys(migrations).sort()) await db.exec(migrations[f]);
    const [c] = await call<{ class_code: string; teacher_key: string }>('create_class');
    code = c.class_code;
    key = c.teacher_key;
  }, 30000);

  it('lets a device ride as a badge only with the badge word', async () => {
    expect(await join(3, K1, 'Brave Comet')).toBe('ok');
    // A device that already rides as the badge never needs the word again.
    expect(await join(3, K1, 'Brave Comet', null)).toBe('ok');
    expect(await join(3, K1, 'Brave Comet', wrongWord(3))).toBe('ok');
    // A classmate who types badge 3 without its word gets nowhere.
    expect(await join(3, K2, 'Swift Ember', wrongWord(3))).toBe('wrong');
    expect(await join(3, K2, 'Swift Ember', null)).toBe('removed');
    // The same kid on a shared iPad, with their card.
    expect(await join(3, K3, 'Brave Comet')).toBe('ok');
    expect(await join(7, K2, 'Swift Ember')).toBe('ok');
    expect(await one('join_badge', { p_code: 'BBBBBB', p_badge: 1, p_word: 0, p_rider_key: K1, p_name: 'Brave Comet' })).toBe('none');
    await expect(join(100, K1, 'Brave Comet')).rejects.toThrow();
  });

  it('locks a badge for 15 minutes after five wrong words', async () => {
    const K4 = '4'.repeat(32);
    for (let i = 0; i < 4; i++) expect(await join(9, K4, 'Bold Scout', wrongWord(9))).toBe('wrong');
    // Getting it right resets the count.
    expect(await join(9, K4, 'Bold Scout')).toBe('ok');
    const K5 = '5'.repeat(32);
    for (let i = 0; i < 5; i++) expect(await join(9, K5, 'Bold Scout', wrongWord(9))).toBe('wrong');
    expect(await join(9, K5, 'Bold Scout')).toBe('locked');
    // Devices that already ride as the badge aren't locked out.
    expect(await join(9, K4, 'Bold Scout', null)).toBe('ok');
    // Other badges are fine.
    expect(await join(10, K5, 'Bold Scout')).toBe('ok');
    await db.exec(`update badge_tries set fail_at = now() - interval '16 minutes'`);
    expect(await join(9, K5, 'Bold Scout')).toBe('ok');
    const riders = await call<{ id: string; badge: number }>('teacher_riders', { p_code: code, p_key: key });
    for (const r of riders.filter((x) => x.badge >= 9)) await one('teacher_remove_rider', { p_code: code, p_key: key, p_rider: r.id });
  });

  it('keeps the old join working only for devices that already joined', async () => {
    const old = async (badge: number, k: string, confirm: boolean | null) =>
      (await call<{ status: string; holder: string | null }>('join_class_rider', { p_code: code, p_badge: badge, p_rider_key: k, p_name: 'Brave Comet', p_confirm: confirm }))[0];
    expect(await old(3, K1, null)).toEqual({ status: 'ok', holder: null });
    expect(await old(3, '6'.repeat(32), true)).toEqual({ status: 'none', holder: null });
    expect(await old(3, '6'.repeat(32), null)).toEqual({ status: 'removed', holder: null });
  });

  it('keeps lessons and races per badge from any device, and puts class races on the board', async () => {
    expect(await post(3, K1, 'Brave Comet', { p_lesson: 'L1', p_stars: 2, p_wpm: 12 })).toBe('ok');
    expect(await post(3, K1, 'Brave Comet', { p_wpm: 14 })).toBe('slow');
    await age();
    expect(await post(3, K3, 'Brave Comet', { p_lesson: 'L2', p_stars: 0, p_wpm: null })).toBe('ok');
    await age();
    expect(await post(3, K1, 'Brave Comet', { p_kind: 'class', p_wpm: 20, p_accuracy: 0.95, p_place: 1, p_racers: 2 })).toBe('ok');
    await age();
    expect(await post(7, K2, 'Swift Ember', { p_kind: 'race', p_wpm: 30, p_place: 2, p_racers: 4, p_touch: true })).toBe('ok');
    // A device that never joined as badge 7 can't add to it.
    expect(await post(7, K1, 'Brave Comet', {})).toBe('removed');

    const board = await call<{ rider: string }>('class_board', { p_code: code });
    expect(board.map((r) => r.rider)).toEqual(['Brave Comet']);

    const riders = await call<{ id: string; badge: number; name: string; lessons_passed: number; lessons: number; races: number; wins: number; best_wpm: number; recent_wpm: number; touch: boolean }>('teacher_riders', { p_code: code, p_key: key });
    expect(riders.map((r) => r.badge)).toEqual([3, 7]);
    const [a, b] = riders;
    expect(a).toMatchObject({ name: 'Brave Comet', lessons_passed: 1, lessons: 2, races: 1, wins: 1, best_wpm: 20, recent_wpm: 16 });
    expect(b).toMatchObject({ lessons_passed: 0, races: 1, wins: 0, touch: true });

    const acts = await call<{ kind: string }>('teacher_rider_activity', { p_code: code, p_key: key, p_rider: a.id });
    expect(acts.map((x) => x.kind)).toEqual(['class', 'lesson', 'lesson']);
    const weeks = await call<{ sessions: number }>('teacher_weeks', { p_code: code, p_key: key });
    expect(weeks.reduce((n, w) => n + w.sessions, 0)).toBe(4);
  });

  it('only lets the teacher key read or manage the class', async () => {
    await expect(call('teacher_riders', { p_code: code, p_key: 'wrong' })).rejects.toThrow();
    await expect(call('teacher_weeks', { p_code: code, p_key: '' })).rejects.toThrow();
    expect(await one('teacher_new_code', { p_code: code, p_key: 'wrong' })).toBeNull();
    expect(await one('teacher_save_vault', { p_code: code, p_key: 'wrong', p_salt: 'c2FsdHNhbHRzYWx0c2FsdA==', p_proof: 'p'.repeat(64), p_vault: 'x' })).toBe(false);
    for (const table of ['class_activity', 'class_riders', 'classes']) {
      await expect(db.transaction(async (tx) => {
        await tx.exec('set local role anon');
        await tx.query(`select * from ${table}`);
      })).rejects.toThrow();
    }
  });

  it('removes a badge with its history, and its card never works again', async () => {
    const [a] = await call<{ id: string }>('teacher_riders', { p_code: code, p_key: key });
    expect(await one('teacher_remove_rider', { p_code: code, p_key: key, p_rider: a.id })).toBe(true);
    expect((await call('teacher_riders', { p_code: code, p_key: key })).length).toBe(1);
    expect((await call('class_board', { p_code: code })).length).toBe(0);
    expect(await post(3, K1, 'Brave Comet', {})).toBe('removed');
    // Its device checking in doesn't quietly claim the number again.
    expect(await join(3, K1, 'Brave Comet', null)).toBe('removed');
    // Nor does the removed student's card on a new device: the number stays retired.
    expect(await join(3, K2, 'Swift Ember')).toBe('removed');
  });

  it('keeps two kids with the same rider name on separate board rows', async () => {
    expect(await join(11, K3, 'Brave Rider')).toBe('ok');
    expect(await join(12, '8'.repeat(32), 'Brave Rider')).toBe('ok');
    await age();
    expect(await post(11, K3, 'Brave Rider', { p_kind: 'class', p_wpm: 18, p_place: 1, p_racers: 2 })).toBe('ok');
    expect(await post(12, '8'.repeat(32), 'Brave Rider', { p_kind: 'class', p_wpm: 15, p_place: 2, p_racers: 2 })).toBe('ok');
    const board = await call<{ rider: string; wins: number }>('class_board', { p_code: code });
    expect(board.map((r) => [r.rider, r.wins])).toEqual([['Brave Rider', 1], ['Brave Rider', 0]]);
  });

  it('keeps the locked student list and hands it back only for the right proof', async () => {
    const salt = 'c2FsdHNhbHRzYWx0c2FsdA==';
    expect(await one('class_vault_salt', { p_code: code })).toBeNull();
    expect(await one('teacher_save_vault', { p_code: code, p_key: key, p_salt: salt, p_proof: 'p'.repeat(64), p_vault: 'v1.locked' })).toBe(true);
    expect(await one('class_vault_salt', { p_code: code })).toBe(salt);
    expect(await one('teacher_restore', { p_code: code, p_proof: 'p'.repeat(64) })).toBe('v1.locked');
    for (let i = 0; i < 10; i++) expect(await one('teacher_restore', { p_code: code, p_proof: 'q'.repeat(64) })).toBeNull();
    await expect(call('teacher_restore', { p_code: code, p_proof: 'p'.repeat(64) })).rejects.toThrow(/Too many tries/);
    await db.exec(`update classes set vault_fail_at = now() - interval '2 hours'`);
    expect(await one('teacher_restore', { p_code: code, p_proof: 'p'.repeat(64) })).toBe('v1.locked');
  });

  it('gives the class a new code and keeps everything', async () => {
    const before = await call('teacher_riders', { p_code: code, p_key: key });
    const next = await one<string>('teacher_new_code', { p_code: code, p_key: key });
    expect(next).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ]{6}$/);
    expect(await join(7, K2, 'Swift Ember', null)).toBe('none');
    code = next;
    expect(await call('teacher_riders', { p_code: code, p_key: key })).toEqual(before);
    // Same words under the new code: they come from the teacher key, not the code.
    expect(await join(7, K2, 'Swift Ember', null)).toBe('ok');
    expect(await join(7, '7'.repeat(32), 'Swift Ember')).toBe('ok');
    // A deleted badge stays deleted under the new code.
    expect(await join(3, '9'.repeat(32), 'Swift Ember')).toBe('removed');
    expect(await one('teacher_restore', { p_code: code, p_proof: 'p'.repeat(64) })).toBe('v1.locked');
  });
});
