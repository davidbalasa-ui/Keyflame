# Simulated class (AI kid testers)

Runs the real game build against `scripts/fake-supabase.mjs`, so nothing reaches the real
database, the usage counts or the feedback table. Each player in `roster.json` gets its own
browser at its own device size (iPad, phone, laptop).

1. `node scripts/sim/sim-server.mjs [roster.json]` builds the game and waits (control port 4300).
   `SKIP_BUILD=1` reuses `dist-sim/`. Logs per player go to `sim-out/<id>.jsonl`.
2. AI testers (Haiku sub-agents, one per kid plus a teacher) play only through
   `node scripts/sim/kid.mjs <id> look|tap N|fill N text|type|key Enter|scroll down|wait S|shot|note text`.
   `look` prints the screen text and numbered tappable things (anything hidden behind a pop-up is left out).
   `type` types the lesson or race at that kid's own speed and error rate from the roster, tapping
   the on-screen keys on iPads and phones, so the AI only decides where to go, not each key.
3. The teacher makes the class first and saves the code and badge words; then the kids join and play;
   then the teacher reads the dashboard.

Haiku cost for the 5-kid trial (2026-11-20): about 450k tokens in sub-agent context, well under $1.
