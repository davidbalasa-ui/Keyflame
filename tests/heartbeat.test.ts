import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
// @ts-expect-error plain JS script
import { report } from '../scripts/heartbeat.mjs';
import MIGRATION from '../supabase/migrations/20261029010000_heartbeat.sql?raw';

async function db() {
  const pg = new PGlite();
  await pg.exec('create role anon; create role authenticated; grant usage on schema public to anon, authenticated;');
  await pg.exec(MIGRATION);
  return pg;
}

async function asAnon<T>(pg: PGlite, sql: string, args: unknown[] = []) {
  return pg.transaction(async (tx) => {
    await tx.exec('set local role anon');
    return (await tx.query<T>(sql, args)).rows;
  });
}

type Row = { source: string; last_day: string; last_at: string; beats: number };

describe('heartbeat migration', () => {
  it('writes today once per source and counts repeat beats', async () => {
    const pg = await db();
    await asAnon(pg, 'select * from heartbeat($1)', ['github']);
    await asAnon(pg, 'select * from heartbeat($1)', ['routine']);
    const rows = await asAnon<Row>(pg, 'select * from heartbeat($1)', ['github']);
    const github = rows.find((r) => r.source === 'github')!;
    expect(github.beats).toBe(2);
    expect(rows.map((r) => r.source).sort()).toEqual(['github', 'routine']);
    const [{ today }] = (await pg.query<{ today: Date }>('select current_date as today')).rows;
    expect(new Date(github.last_day).getTime()).toBe(new Date(today).getTime());
  }, 30000);

  it('returns only the newest day per source and drops old history', async () => {
    const pg = await db();
    await pg.exec(`insert into heartbeats (day, source) values (current_date - 3, 'routine'), (current_date - 500, 'github')`);
    const rows = await asAnon<Row>(pg, 'select * from heartbeat($1)', ['github']);
    expect(rows).toHaveLength(2);
    const [{ n }] = (await pg.query<{ n: number }>(`select count(*)::int as n from heartbeats where day < current_date - 400`)).rows;
    expect(n).toBe(0);
  }, 30000);

  it('refuses unknown sources and keeps the table closed to the public key', async () => {
    const pg = await db();
    await expect(asAnon(pg, 'select * from heartbeat($1)', ['anyone'])).rejects.toThrow(/Unknown heartbeat source/);
    await expect(asAnon(pg, 'select * from heartbeats')).rejects.toThrow(/permission denied/);
    await expect(asAnon(pg, `insert into heartbeats (source) values ('github')`)).rejects.toThrow(/permission denied/);
  }, 30000);
});

describe('heartbeat report', () => {
  const now = new Date('2026-11-10T14:17:00Z');
  it('passes when today came back, and warns about a quiet checker', () => {
    const { ok, lines } = report(
      [
        { source: 'github', last_day: '2026-11-10', beats: 1 },
        { source: 'routine', last_day: '2026-11-02', beats: 1 },
      ],
      'github',
      now,
    );
    expect(ok).toBe(true);
    expect(lines.join('\n')).toMatch(/warn routine last beat 2026-11-02 \(8 days ago/);
  });

  it('fails when the beat is missing or stale', () => {
    expect(report([], 'github', now).ok).toBe(false);
    expect(report([{ source: 'github', last_day: '2026-11-05', beats: 1 }], 'github', now).ok).toBe(false);
    // Around midnight UTC the database date may be a day off.
    expect(report([{ source: 'github', last_day: '2026-11-09', beats: 1 }], 'github', now).ok).toBe(true);
  });
});
