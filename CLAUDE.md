# Keyflame: map for working here

Kids' dragon typing game. Vanilla TypeScript + Vite, DOM + SVG, no framework. Saves live in the browser.
Classroom/feedback/usage use Supabase (`supabase/migrations/`, applied on push to main).

## Where things are (read only the file you need)

| Area | Files |
| --- | --- |
| App shell, screen switching, Back button | `src/ui/app.ts`, `src/main.ts`, `src/ui/tabBar.ts` |
| Home / nest / codex / race / lessons screens | `src/ui/screens/<name>.ts` (one file per screen) |
| Classroom (kid side) and teacher | `src/ui/screens/classroom.ts`, `teacherDashboard.ts`, `wing.ts`; rules `src/game/classroom.ts`, `wing.ts`, `badgeWord.ts`; network `src/net/` |
| Typing engine and panel | `src/engine/typing.ts`, `src/ui/typingView.ts` |
| Rewards: warmth, embers, eggs, hatch, pacing | `src/game/progress.ts`, `collection.ts`, `raceRules.ts`, `improve.ts` |
| Dragon and egg art | `src/game/art/<tribe>.ts`, `src/game/art/eggs.ts`, `nest.ts`, `cel.ts`; old art `src/game/dragons.ts` |
| Text kids type (must stay kid-safe and tap-typeable) | `src/content/` (`safety.ts` filters everything) |
| Saves, backups, riders | `src/save/store.ts` |
| Sounds | `src/ui/sound.ts` |
| Styles | `src/styles/NN-area.css`, imported in order by `src/styles.css` (later files win). `grep -n` a class name, then read only those lines |

## Rules that save tokens

- Never read a big file whole. `grep -n` first, then read a line range. The CSS, `classroom.ts`, `teacherDashboard.ts`, `nest.ts`, `race.ts`, `lessons.ts`, `progress.ts` and `store.ts` are 500+ lines.
- `src/content/facts/facts.json` is 175 KB: never open it; grep it.
- Run the narrowest check that covers the change:
  - logic: `npx vitest run tests/<area>.test.ts` (whole suite `npm test`, about 20 s)
  - layout/CSS: `npm run build && npm run check:overflow` (3 min) or `check:nav` (1 min)
  - kid flows (lessons, races, hatch): `check:flows` (1 min); typing feel: `check:typing`
  - classroom: `check:classroom`; sounds: `check:sounds`; a11y: `check:a11y` (needs `npm i --no-save playwright axe-core`)
  - CI runs all of them in Chromium and WebKit on every PR, so a local run of the one that matters is enough.
- Screenshots: take only the screens the change touches, at the sizes it affects, at deviceScaleFactor 1 when only you look at them. Don't view a full capture set. Keep shots out of git (`review-shots/` is ignored); put files for David or Astra in project files.
- Astra (Agent Bridge) review: only for new screens or features, with 3 to 6 screenshots of what changed. Batch small fixes into one review; don't queue one per fix.
- A red check is a real bug until shown otherwise. `check:overflow` prints why a screen would not open and saves `FAILED-*.png` with the CI screenshots.

## Product rules (don't break)

- Original IP only. Nothing controversial in any game text; when in doubt, cut it.
- Lesson text must be typeable on the tap keyboard (no ' - digits quotes !).
- No hatch may ever feel wasted. No ads. Kids' names never leave the device unencrypted.
- Works in Safari on iPad (classrooms) and on phones.
