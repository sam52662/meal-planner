const CACHE_NAME = 'meal-planner-v1'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Nur GET-Requests cachen, keine GitHub API Calls
  if (e.request.method !== 'GET') return
  if (url.hostname === 'api.github.com') return
  if (url.hostname === 'generativelanguage.googleapis.com') return

  e.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(response => {
          if (response.ok) cache.put(e.request, response.clone())
          return response
        })
        // Cache-first: sofort aus Cache, im Hintergrund aktualisieren
        return cached || fetchPromise
      })
    )
  )
})

// Auf Nachricht vom Client: sofort neu laden
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting()
})
