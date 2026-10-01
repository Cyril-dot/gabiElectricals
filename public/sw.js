/* GabiElectricals PWA — network-first pages, offline fallback, cache-static */
const CACHE = 'ge-static-v1';
const OFFLINE = '/offline';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, '/icon.svg', '/manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return; // never cache API traffic

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (url.pathname.startsWith('/_next/static/') || url.pathname.endsWith('.webp') || url.pathname.startsWith('/images/'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match(OFFLINE) : Response.error())))
  );
});
