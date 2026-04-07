const CACHE = 'fishinglog-v5';
const CORE = ['./index.html','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(a => c.add(a).catch(()=>{})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Cache map tiles (cross-origin, but safe to cache)
  if (url.includes('tile.openstreetmap.org') || url.includes('sat.') || url.includes('tiles.')) {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(e.request).then(r =>
          r || fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; })
            .catch(() => new Response('', { status: 503 }))
        )
      )
    );
    return;
  }

  // Cross-origin API calls (open-meteo, nominatim, NIWA, CDNs etc.)
  // Pass straight to network — no cache, no HTML fallback.
  if (!url.startsWith(self.location.origin)) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Same-origin assets: cache-first, fall back to index.html for app shell routing
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
