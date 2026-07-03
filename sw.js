const CACHE      = 'fishinglog-v11';          // app shell — bump to force reinstall
const TILE_CACHE = 'fishinglog-tiles-v1';    // map tiles — separate, bounded
const MAX_TILES  = 300;                      // ~15 MB max tile storage
const CORE = ['./index.html','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(a => c.add(a).catch(()=>{})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE && k !== TILE_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // ── Map tiles: separate bounded cache ──────────────────────────────────────
  if (url.includes('tile.openstreetmap.org') || url.includes('tiles.')) {
    e.respondWith(
      caches.open(TILE_CACHE).then(async c => {
        const cached = await c.match(e.request);
        if (cached) return cached;

        try {
          const res = await fetch(e.request);
          // Enforce size limit: evict oldest entries when over MAX_TILES
          const keys = await c.keys();
          if (keys.length >= MAX_TILES) {
            // Delete the oldest ~10% to avoid thrashing on every new tile
            const evict = Math.max(1, Math.floor(MAX_TILES * 0.1));
            await Promise.all(keys.slice(0, evict).map(k => c.delete(k)));
          }
          c.put(e.request, res.clone());
          return res;
        } catch {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // ── Cross-origin API calls: straight to network, never cached ──────────────
  if (!url.startsWith(self.location.origin)) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // ── Same-origin app shell: cache-first ─────────────────────────────────────
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
