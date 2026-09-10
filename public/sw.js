const CACHE_NAME = 'meal-planner-v3';
const BASE = '/meal-planner';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // GitHub API & Gemini: immer direkt, nie cachen
  if (url.hostname === 'api.github.com' || url.hostname.includes('googleapis')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Alles andere: immer vom Netzwerk, kein Cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
