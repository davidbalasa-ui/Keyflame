// Offline support: keep a copy of the game files so it plays without internet.
// Each build registers this file with a new ?v= so every deploy gets its own cache.
const CACHE = `keyflame-${new URL(self.location.href).searchParams.get('v') || 'v1'}`;

// The build (vite.config.ts) swaps in the full list of game files here, so the
// whole game is saved on install, before the player ever goes offline.
const PRECACHE = /* PRECACHE_LIST */ ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((url) => new Request(url, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache ads or payment pages.
  if (/googlesyndication|doubleclick|stripe/.test(url.hostname)) return;

  if (req.mode === 'navigate') {
    // Fresh page when online, cached page when offline.
    event.respondWith(
      // Skip the browser's HTTP cache so a new deploy shows up right away.
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(url.origin + url.pathname, copy));
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || caches.match('./'))),
    );
    return;
  }
  // Game files: cached copy first, then fill the cache from the network.
  // ignoreVary: the game's scripts are fetched with an Origin header that the
  // saved copies were not, and some hosts answer with Vary: Origin.
  event.respondWith(
    caches.match(req, { ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
