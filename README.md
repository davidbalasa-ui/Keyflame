# Keyflame

A dragon racing typing game for kids. Type to fly, race to hatch.

- **Lessons** teach touch typing row by row, with a color-coded keyboard and finger hints.
- **Races** turn typing speed and accuracy into flight speed against rival dragons.
- **Eggs** warm up with every correct key and hatch into dragons you collect, name, and race with.
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

## Layout

| Path | What it holds |
| --- | --- |
| `src/engine/typing.ts` | Typing session: keystrokes, WPM, accuracy, per-key stats |
| `src/content/` | Keyboard layout, lessons, curated word list, story passages |
| `src/game/` | Dragon tribes and art, reward rules (warmth, embers, growth, eggs) |
| `src/save/store.ts` | Device saves (IndexedDB with localStorage fallback), backup codes |
| `src/ui/` | Screens, typing panel, sounds |

All dragon tribes, names, and art are original to Keyflame.
