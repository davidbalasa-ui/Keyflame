import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { DAY_CAPS, addUsage, emptyUsage, loadUsage } from '../src/game/usage';

describe('usage counts on the device', () => {
  it('counts a rider as playing once a day, and caps each event per day', () => {
    const s = emptyUsage('2026-11-18');
    expect(addUsage(s, 'active', 'guest', 'r1')).toBe(true);
    expect(addUsage(s, 'active', 'guest', 'r1')).toBe(false);
    expect(addUsage(s, 'active', 'saved', 'r2')).toBe(true);
    for (let i = 0; i < 100; i++) addUsage(s, 'race', 'saved');
    const races = s.queue.filter((q) => q.event === 'race').reduce((a, q) => a + q.n, 0);
    expect(races).toBe(DAY_CAPS.race);
    expect(s.queue.find((q) => q.event === 'active' && q.kind === 'guest')?.n).toBe(1);
  });

  it('starts fresh caps on a new day but keeps unsent counts for a week', () => {
    const s = emptyUsage('2026-11-10');
    addUsage(s, 'visit', 'guest');
    addUsage(s, 'active', 'guest', 'r1');
    const next = loadUsage(JSON.parse(JSON.stringify(s)), '2026-11-11');
    expect(next.made).toEqual({});
    expect(next.active).toEqual([]);
    expect(next.queue).toHaveLength(2);
    expect(addUsage(next, 'active', 'guest', 'r1')).toBe(true);
    expect(loadUsage(s, '2026-11-20').queue).toHaveLength(0);
  });

  it('survives junk in storage', () => {
    expect(loadUsage('nope', '2026-11-18').queue).toEqual([]);
    expect(loadUsage({ day: '2026-11-18', queue: [{ day: '2026-11-18', event: 'hack', kind: 'guest', n: 5 }] }, '2026-11-18').queue).toEqual([]);
  });
});

describe('usage counts migration', () => {
  async function db() {
    const pg = new PGlite();
    await pg.exec('create role anon; create role authenticated; grant usage on schema public to anon, authenticated;');
    const migrations = import.meta.glob<string>('../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true });
    for (const f of Object.keys(migrations).sort()) await pg.exec(migrations[f]);
    return pg;
  }
  const asAnon = <T>(pg: PGlite, sql: string, args: unknown[] = []) =>
    pg.transaction(async (tx) => {
      await tx.exec('set local role anon');
      return (await tx.query<T>(sql, args)).rows;
    });

  it('adds to daily totals, refuses bad input, and stays closed to the public key', async () => {
    const pg = await db();
    const [{ d }] = (await pg.query<{ d: string }>(`select current_date::text as d`)).rows;
    const count = (day: string, event: string, kind: string, n: number) => asAnon<{ count_usage: boolean }>(pg, 'select count_usage($1::date, $2, $3, $4)', [day, event, kind, n]);
    expect((await count(d, 'race', 'guest', 3))[0].count_usage).toBe(true);
    expect((await count(d, 'race', 'guest', 5000))[0].count_usage).toBe(true);
    expect((await count(d, 'race', 'nobody', 1))[0].count_usage).toBe(false);
    expect((await count('2020-01-01', 'race', 'guest', 1))[0].count_usage).toBe(false);
    const [{ n }] = (await pg.query<{ n: number }>(`select n from usage_daily where event = 'race' and kind = 'guest'`)).rows;
    expect(n).toBe(53);
    await expect(asAnon(pg, 'select * from usage_daily')).rejects.toThrow(/permission denied/);
    await expect(asAnon(pg, 'select * from stats.daily')).rejects.toThrow(/permission denied/);
    const [row] = (await pg.query<{ races: number }>('select races::int from stats.daily')).rows;
    expect(row.races).toBe(53);
  }, 30000);

  it('tells family wings from classes', async () => {
    const pg = await db();
    const [fam] = await asAnon<{ class_code: string; teacher_key: string }>(pg, `select * from create_class('family')`);
    const [cls] = await asAnon<{ class_code: string; teacher_key: string }>(pg, 'select * from create_class()');
    expect((await asAnon<{ k: string }>(pg, 'select wing_kind($1) as k', [fam.class_code]))[0].k).toBe('family');
    expect((await asAnon<{ k: string }>(pg, 'select wing_kind($1) as k', [cls.class_code]))[0].k).toBe('class');
    expect((await asAnon<{ ok: boolean }>(pg, 'select set_wing_kind($1, $2, $3) as ok', [cls.class_code, 'wrong', 'family']))[0].ok).toBe(false);
    expect((await asAnon<{ ok: boolean }>(pg, 'select set_wing_kind($1, $2, $3) as ok', [cls.class_code, cls.teacher_key, 'family']))[0].ok).toBe(true);
    const [w] = (await pg.query<{ family_wings: number }>('select family_wings::int from stats.wings')).rows;
    expect(w.family_wings).toBe(2);
  }, 30000);
});
