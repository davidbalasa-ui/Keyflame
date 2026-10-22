import { defineConfig } from 'vite';

// A new id for every build. The service worker URL carries it, so each deploy
// installs a fresh worker with a fresh cache and players get the update.
const BUILD_ID = new Date().toISOString().replace(/\D/g, '').slice(0, 14);

// Relative base so the build works on GitHub Pages, Netlify, or any subfolder.
export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
});
