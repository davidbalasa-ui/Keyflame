// Writes today's heartbeat to the KeyFlame Supabase project and checks it came back.
// The write keeps the free project from pausing; reading the beats back is the health
// check. Run daily by .github/workflows/heartbeat.yml (a failed run emails the repo owner).
// Run by hand: node scripts/heartbeat.mjs [github|routine|manual]
// The key is the public anon key the game already ships with; it can only call heartbeat().

const URL = process.env.SUPABASE_URL || 'https://lmnsdqieycefnrjajknx.supabase.co';
const KEY = process.env.SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbnNkcWlleWNlZm5yamFqa254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTQxMDksImV4cCI6MjEwODY3MDEwOX0.5ter3qKVhR_tJqaGEp7MqMp00ttpEDtUd4acIxnQ_yQ';
const SOURCE = process.argv[2] || 'manual';
// A checker that has not beaten for this many days is called out (it does not fail the run).
const QUIET_DAYS = 3;

export async function beat(url, key, source) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/heartbeat`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_source: source }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
      return await res.json();
    } catch (e) {
      // A paused project takes a moment to answer after it is restored, so retry a few times.
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 15000 * attempt));
    }
  }
}

export function report(rows, source, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const lines = [];
  let ok = true;
  const mine = rows.find((r) => r.source === source);
  // The database's date can be a day either side of ours around midnight UTC.
  const daysOld = (d) => Math.round((Date.parse(today) - Date.parse(d)) / 86400000);
  if (!mine || Math.abs(daysOld(mine.last_day)) > 1) {
    ok = false;
    lines.push(`FAIL today's ${source} beat did not come back`);
  } else {
    lines.push(`ok   ${source} beat written for ${mine.last_day} (${mine.beats} today)`);
  }
  for (const r of rows.filter((r) => r.source !== source)) {
    const age = daysOld(r.last_day);
    lines.push(`${age > QUIET_DAYS ? 'warn' : 'info'} ${r.source} last beat ${r.last_day}${age > QUIET_DAYS ? ` (${age} days ago, has it stopped?)` : ''}`);
  }
  return { ok, lines };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const rows = await beat(URL, KEY, SOURCE);
    const { ok, lines } = report(rows, SOURCE);
    console.log(lines.join('\n'));
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.log(`FAIL Supabase did not answer the heartbeat: ${e.message}`);
    console.log('If the project is paused, restore it at https://supabase.com/dashboard/project/lmnsdqieycefnrjajknx');
    process.exit(1);
  }
}
