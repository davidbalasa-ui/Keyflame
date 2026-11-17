import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

// KF-06: only the teacher's device can pull the whole class into a race.
describe('teacher-only race starts (server)', () => {
  let db: PGlite;
  let code = '';
  let key = '';
  const one = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
    const names = Object.keys(args);
    return db.transaction(async (tx) => {
      await tx.exec('set local role anon');
      const out = await tx.query<Record<string, unknown>>(`select * from public.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(', ')})`, names.map((n) => args[n]));
      return Object.values(out.rows[0])[0] as T;
    });
  };

  beforeAll(async () => {
    db = new PGlite();
    await db.exec('create role anon; create role authenticated; grant usage on schema public to anon, authenticated;');
    const migrations = import.meta.glob<string>('../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true });
    for (const f of Object.keys(migrations).sort()) await db.exec(migrations[f]);
    const out = await db.transaction(async (tx) => {
      await tx.exec('set local role anon');
      return (await tx.query<{ class_code: string; teacher_key: string }>('select * from public.create_class()')).rows[0];
    });
    code = out.class_code;
    key = out.teacher_key;
  }, 30000);

  it('records a start only with the teacher key', async () => {
    expect(await one('start_class_race', { p_code: code, p_key: 'not-the-key', p_race_id: 'abc123', p_racers: ['kid1'] })).toBe(false);
    expect(await one('class_race_ok', { p_code: code, p_race_id: 'abc123', p_member: 'kid1' })).toBe(false);
    expect(await one('start_class_race', { p_code: code, p_key: key, p_race_id: 'abc123', p_racers: ['kid1', 'kid2'] })).toBe(true);
  });

  it('confirms the race only for riders the teacher put in it', async () => {
    expect(await one('class_race_ok', { p_code: code.toLowerCase(), p_race_id: 'abc123', p_member: 'kid1' })).toBe(true);
    expect(await one('class_race_ok', { p_code: code, p_race_id: 'abc123', p_member: 'kid3' })).toBe(false);
    expect(await one('class_race_ok', { p_code: code, p_race_id: 'zzz999', p_member: 'kid1' })).toBe(false);
  });

  it('keeps the table closed to direct reads', async () => {
    let blocked = false;
    try {
      await db.transaction(async (tx) => {
        await tx.exec('set local role anon');
        return tx.query('select * from public.class_race_starts');
      });
    } catch {
      blocked = true;
    }
    expect(blocked).toBe(true);
  });
});
