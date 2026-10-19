/* Stepwise service worker — the app works on a plane, in a basement, or on a bad train line. */
const CACHE = 'stepwise-v1';
const SHELL = [
  './',
  './index.html',
  './css/core.css',
  './css/modes.css',
  './js/app.js',
  './js/breakdown.js',
  './js/storage.js',
  './js/timer.js',
  './js/wins.js',
  './js/focus.js',
  './js/dialogs.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) {
        // refresh in the background, never block the calm
        fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => new Response('Offline and not cached yet. Even calm apps have limits.', {
        status: 503, headers: { 'Content-Type': 'text/plain' },
      }));
    })
  );
});
