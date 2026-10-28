// A stand-in for the KeyFlame Supabase project, for testing classroom mode without internet.
// It runs the real classroom migration in PGlite (Postgres in WebAssembly) behind a tiny
// PostgREST-style /rest/v1/rpc endpoint, and speaks enough of the Realtime (Phoenix)
// protocol for presence and broadcast. Build the game with VITE_SUPABASE_URL pointing here.
// Run: node scripts/fake-supabase.mjs [port]
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { WebSocketServer } from 'ws';

export async function startFakeSupabase(port = 54329) {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; grant usage on schema public to anon, authenticated;');
  const dir = new URL('../supabase/migrations/', import.meta.url);
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(new URL(f, dir), 'utf8'));

  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const http = createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
    const m = /^\/rest\/v1\/rpc\/(\w+)$/.exec(req.url ?? '');
    if (!m || req.method !== 'POST') return res.writeHead(404, cors).end();
    let body = '';
    for await (const chunk of req) body += chunk;
    const args = body ? JSON.parse(body) : {};
    const names = Object.keys(args);
    const sql = `select * from public.${m[1]}(${names.map((n, i) => `${n} => $${i + 1}`).join(', ')})`;
    try {
      const out = await db.transaction(async (tx) => {
        await tx.exec('set local role anon');
        return tx.query(sql, names.map((n) => args[n]));
      });
      // PostgREST returns a bare value for functions that return one scalar.
      const scalar = out.fields.length === 1 && out.fields[0].name === m[1];
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(scalar ? out.rows[0]?.[m[1]] ?? null : out.rows));
    } catch (e) {
      res.writeHead(400, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify({ message: String(e.message) }));
    }
  });

  // topic -> Map(socket -> { joinRef, presence: Map(key -> meta) })
  const topics = new Map();
  let refN = 0;
  const send = (ws, joinRef, ref, topic, event, payload) => ws.readyState === 1 && ws.send(JSON.stringify([joinRef, ref, topic, event, payload]));
  const members = (topic) => topics.get(topic) ?? new Map();
  const presenceDiff = (topic, joins, leaves) => {
    for (const [ws, sub] of members(topic)) send(ws, sub.joinRef, null, topic, 'presence_diff', { joins, leaves });
  };
  const stateOf = (topic) => {
    const out = {};
    for (const sub of members(topic).values()) for (const [key, meta] of sub.presence) out[key] = { metas: [meta] };
    return out;
  };
  const leave = (ws, topic) => {
    const sub = members(topic).get(ws);
    if (!sub) return;
    members(topic).delete(ws);
    const leaves = {};
    for (const [key, meta] of sub.presence) leaves[key] = { metas: [meta] };
    if (Object.keys(leaves).length) presenceDiff(topic, {}, leaves);
  };

  const wss = new WebSocketServer({ server: http, path: '/realtime/v1/websocket' });
  wss.on('connection', (ws) => {
    const joined = new Set();
    ws.on('message', (data, isBinary) => {
      let joinRef, ref, topic, event, payload;
      if (isBinary) {
        // A user broadcast push: kind 3, then six lengths, then the fields and a JSON body.
        const b = Buffer.from(data);
        const [kind, jl, rl, tl, el, ml] = b;
        if (kind !== 3) return;
        let o = 7;
        const take = (n) => b.subarray(o, (o += n)).toString('utf8');
        joinRef = take(jl);
        ref = take(rl);
        topic = take(tl);
        const userEvent = take(el);
        take(ml);
        event = 'broadcast';
        payload = { type: 'broadcast', event: userEvent, payload: JSON.parse(b.subarray(o).toString('utf8') || '{}') };
      } else {
        [joinRef, ref, topic, event, payload] = JSON.parse(String(data));
      }
      const ok = (response = {}) => send(ws, joinRef, ref, topic, 'phx_reply', { status: 'ok', response });
      if (topic === 'phoenix') return ok();
      const sub = members(topic).get(ws);
      switch (event) {
        case 'phx_join': {
          if (!topics.has(topic)) topics.set(topic, new Map());
          topics.get(topic).set(ws, { joinRef, presence: new Map(), config: payload?.config ?? {} });
          joined.add(topic);
          ok({ postgres_changes: [] });
          if (payload?.config?.presence?.enabled) send(ws, joinRef, null, topic, 'presence_state', stateOf(topic));
          return;
        }
        case 'phx_leave':
          leave(ws, topic);
          joined.delete(topic);
          return ok();
        case 'access_token':
          return ok();
        case 'presence': {
          if (!sub) return;
          const key = sub.config?.presence?.key || `k${++refN}`;
          const old = sub.presence.get(key);
          ok();
          if (payload.event === 'track') {
            const meta = { ...payload.payload, phx_ref: `r${++refN}` };
            sub.presence.set(key, meta);
            presenceDiff(topic, { [key]: { metas: [meta] } }, old ? { [key]: { metas: [old] } } : {});
          } else if (payload.event === 'untrack' && old) {
            sub.presence.delete(key);
            presenceDiff(topic, {}, { [key]: { metas: [old] } });
          }
          return;
        }
        case 'broadcast': {
          if (ref) ok();
          for (const [other, s] of members(topic)) {
            if (other === ws && !s.config?.broadcast?.self) continue;
            send(other, s.joinRef, null, topic, 'broadcast', payload);
          }
          return;
        }
        default:
          return ok();
      }
    });
    ws.on('close', () => {
      for (const t of joined) leave(ws, t);
    });
  });

  await new Promise((r) => http.listen(port, r));
  return { url: `http://localhost:${port}`, db, close: () => (wss.close(), http.close()) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const s = await startFakeSupabase(Number(process.argv[2]) || 54329);
  console.log(`Fake Supabase at ${s.url}`);
}
