import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// A new id for every build. The service worker URL carries it, so each deploy
// installs a fresh worker with a fresh cache and players get the update.
const BUILD_ID = new Date().toISOString().replace(/\D/g, '').slice(0, 14);

const MARKER = /\/\* PRECACHE_LIST \*\/ \[[^\]]*\]/;

// Writes every built file into dist/sw.js, so installing the worker saves the
// whole game for offline play. Old .woff fonts are skipped: every browser that
// runs service workers uses the .woff2 copies.
function precacheList(): Plugin {
  let outDir = 'dist';
  return {
    name: 'keyflame-precache',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const path = join(dir, entry.name);
          if (entry.isDirectory()) walk(path);
          else files.push(relative(outDir, path).split('\\').join('/'));
        }
      };
      walk(outDir);
      const urls = ['./', ...files.filter((f) => f !== 'sw.js' && !f.endsWith('.woff')).sort().map((f) => `./${f}`)];
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8');
      if (!MARKER.test(sw)) throw new Error('sw.js is missing its PRECACHE_LIST marker');
      writeFileSync(swPath, sw.replace(MARKER, JSON.stringify(urls)));
    },
  };
}

// Relative base so the build works on GitHub Pages, Netlify, or any subfolder.
export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [precacheList()],
});
