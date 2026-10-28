// Checks the live KeyFlame Supabase project the way classroom mode uses it: two clients join
// a throwaway class channel, see each other through presence, and pass a broadcast both ways.
// It also calls a classroom database function. Run by .github/workflows/classroom-live-check.yml,
// since cloud sandboxes can't reach Supabase. REQUIRE_DB=1 fails when the functions are missing.
import { RealtimeClient } from '@supabase/realtime-js';

const URL = process.env.SUPABASE_URL || 'https://lmnsdqieycefnrjajknx.supabase.co';
const KEY = process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbnNkcWlleWNlZm5yamFqa254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTQxMDksImV4cCI6MjEwODY3MDEwOX0.5ter3qKVhR_tJqaGEp7MqMp00ttpEDtUd4acIxnQ_yQ';

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};
const within = (ms, p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timed out')), ms))]);

const topic = `class-SMOKE${Date.now().toString(36).toUpperCase()}`;
const clients = [0, 1].map(() => new RealtimeClient(URL.replace(/^http/, 'ws') + '/realtime/v1', { params: { apikey: KEY } }));
const chans = clients.map((c, i) => c.channel(topic, { config: { broadcast: { self: false }, presence: { key: `p${i}`, enabled: true } } }));

const seen = chans.map((ch, i) => new Promise((resolve) => {
  ch.on('presence', { event: 'sync' }, () => {
    if (ch.presenceState()[`p${1 - i}`]) resolve(true);
  });
}));
const got = chans.map((ch) => new Promise((resolve) => ch.on('broadcast', { event: 'race' }, ({ payload }) => resolve(payload))));

try {
  await within(15000, Promise.all(chans.map((ch, i) => new Promise((resolve, reject) => ch.subscribe((s, err) => {
    if (s === 'SUBSCRIBED') {
      void ch.track({ id: `p${i}`, n: 'Smoke Test', s: 'lobby' });
      resolve();
    } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') reject(err ?? new Error(s));
  })))));
  check(true, 'both clients joined a class channel');
  await within(10000, Promise.all(seen));
  check(true, 'each client sees the other through presence');
  await chans[0].send({ type: 'broadcast', event: 'race', payload: { raceId: 'a', text: 'fly' } });
  await chans[1].send({ type: 'broadcast', event: 'race', payload: { raceId: 'b', text: 'high' } });
  const [to0, to1] = await within(10000, Promise.all(got));
  check(to1.raceId === 'a' && to0.raceId === 'b', 'broadcasts reach the other client');
} catch (e) {
  check(false, `realtime: ${e.message}`);
}
for (const c of clients) c.disconnect();

try {
  const res = await fetch(`${URL}/rest/v1/rpc/join_class`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_code: 'BBBBBB' }),
  });
  const ok = res.ok && (await res.json()) === false;
  if (process.env.REQUIRE_DB) check(ok, `classroom database functions answer (HTTP ${res.status})`);
  else console.log(`info classroom database functions ${ok ? 'are live' : `not live yet (HTTP ${res.status})`}`);
} catch (e) {
  check(!process.env.REQUIRE_DB, `database: ${e.message}`);
}

console.log(failed ? `${failed} check(s) failed` : 'Live classroom checks passed');
process.exit(failed ? 1 : 0);
