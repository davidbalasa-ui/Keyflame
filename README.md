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

The game installs as an app from the browser menu ("Add to Home Screen") and plays offline after the first visit.

## Ads and the supporter pack (off until set up)

Both stay switched off until you add these under **Settings → Secrets and variables → Actions → Variables**, then re-run the deploy:

| Variable | What it is |
| --- | --- |
| `ADSENSE_CLIENT` | Your AdSense publisher ID, like `ca-pub-1234567890123456`. The deploy also writes `ads.txt` from it. |
| `ADSENSE_SLOT_HUB` | Ad unit ID for the bottom of the home screen |
| `ADSENSE_SLOT_RESULTS` | Ad unit ID for race results |
| `SUPPORTER_CHECKOUT_URL` | A Stripe Payment Link for the $3 pack. Set its success page to `<your site>/?supporter=thanks` |

In AdSense, also mark the site as child-directed. Ads only ever show on menu and results screens, request non-personalized ads, and never show to supporters. The supporter unlock is an honor system for now, since there are no accounts to check a receipt against.

## Layout

| Path | What it holds |
| --- | --- |
| `src/engine/typing.ts` | Typing session: keystrokes, WPM, accuracy, per-key stats |
| `src/content/` | Keyboard layout, lessons, curated word list, story passages |
| `src/game/` | Dragon tribes and art, reward rules (warmth, embers, growth, eggs) |
| `src/save/store.ts` | Device saves (IndexedDB with localStorage fallback), backup codes |
| `src/game/raceRules.ts` | Race scoring and tribe perks |
| `src/config.ts`, `src/ui/ads.ts` | Ad and checkout settings from the build environment |
| `src/ui/` | Screens, typing panel, sounds |
| `public/` | Privacy policy, app manifest, offline worker, icons |

All dragon tribes, names, and art are original to Keyflame.
