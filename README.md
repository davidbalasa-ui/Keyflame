# Keyflame

A dragon racing typing game for kids. Type to fly, race to hatch.

- **Lessons** teach touch typing row by row, with a color-coded keyboard and finger hints.
- **Races** turn typing speed and accuracy into flight speed against rival dragons.
- **Eggs** warm up with every correct key and hatch into dragons you collect, name, and race with.
- **Campaign map** with five courses, each with a champion to beat, opening as lesson units are finished.
- **Aerie** decorations, badges, a progress chart, a placement check, relaxed mode, and phone and tablet typing.
- **Saves** stay in the browser on this device. No accounts, no personal data. Backup codes move progress between devices.

## Run it

```sh
npm install
npm run dev      # local dev server
npm test         # engine and progress tests
npm run build    # static site in dist/
```

## Hosting

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds, and publishes to GitHub Pages.
Turn it on once in the repo: **Settings → Pages → Source: GitHub Actions**.

The game installs as an app (Chrome or Edge on a PC: the install icon in the address bar, or the "Install Keyflame" link on the title screen and in Settings; phones: "Add to Home Screen"). The first visit saves every game file and font on the device, so it plays offline from then on. The build writes the file list into `sw.js` (see `vite.config.ts`).

## Classroom mode

A teacher taps **Teachers: make a class** on the title screen (behind a grown-up check), types her students one per line, picks a teacher password, and gets a six-letter code plus a badge number for each student (a printable class sheet and badge cards). Kids open **Race → Class race** and type the code and their badge number; a badge already used by another rider asks "Is that you?". Riders who tap **Race!** in the class lobby race each other live (up to 6 at a time), or the teacher taps **Race everyone**. Results go on a class board.

The teacher's **Progress** tab follows every badge over time: lessons passed, speed and accuracy trends, last active, a weekly class chart, and a CSV download. She can rename, add or remove students and give the class a new code. Student names never leave her device unencrypted: the list is locked with her teacher password (PBKDF2 + AES-GCM in the browser) and backed up after every change, so the class opens on any device with the code and password. A backup file is a second copy.

It runs on the KeyFlame Supabase project: `supabase/migrations/20261028100000_classroom.sql` (class codes and the board) and `20261029100000_teacher_dashboard.sql` (badges, results over time, the locked student list), all reachable only through functions, and Realtime presence and broadcast for live races. `npm run check:classroom` races an iPad-sized and a phone-sized browser against a local stand-in (`scripts/fake-supabase.mjs`); the `Classroom live check` workflow checks the real project from GitHub.

## Supabase heartbeat

Supabase pauses free projects after about a week with no activity, which would switch off classroom mode and the feedback form. The `Supabase heartbeat` workflow (`.github/workflows/heartbeat.yml`) runs every day and writes today's date to the `heartbeats` table through the `heartbeat()` function (`supabase/migrations/20261029010000_heartbeat.sql`). Reading the beats back doubles as a health check: if the database doesn't answer, the run fails and GitHub emails the repo owner. The daily feedback routine also beats and warns if the GitHub beat goes quiet (GitHub turns off scheduled workflows after 60 days without commits). Run one by hand with `node scripts/heartbeat.mjs manual`.

## Supporter pack (off until set up)

Keyflame has no ads. The optional $3 supporter pack stays switched off until you add this under **Settings → Secrets and variables → Actions → Variables**, then re-run the deploy:

| Variable | What it is |
| --- | --- |
| `SUPPORTER_CHECKOUT_URL` | A Stripe Payment Link for the $3 pack. Set its success page to `<your site>/?supporter=thanks` |

The supporter unlock is an honor system, since there are no accounts to check a receipt against. After checkout the game gives the rider a supporter code (like `KF-6E1D-ZXQV-1HTZ`) that unlocks the pack for another rider or device. Codes carry a check, so the game can spot a typo offline, and they need no database. To hand out codes yourself, for example to a teacher, run `npm run codes -- 10`.

## Layout

| Path | What it holds |
| --- | --- |
| `src/engine/typing.ts` | Typing session: keystrokes, WPM, accuracy, per-key stats |
| `src/content/` | Keyboard layout, lessons, curated word list, story passages |
| `src/game/` | Dragon tribes and art, reward rules (warmth, embers, growth, eggs) |
| `src/save/store.ts` | Device saves (IndexedDB with localStorage fallback), backup codes |
| `src/game/raceRules.ts` | Race scoring and tribe perks |
| `src/config.ts` | Checkout settings from the build environment |
| `src/ui/` | Screens, typing panel, sounds |
| `public/` | Privacy policy, app manifest, offline worker, icons |

All dragon tribes, names, and art are original to Keyflame.
