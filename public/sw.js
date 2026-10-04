const CACHE_VERSION = 'doom-map-shell-v1'

function scopeUrl(path = '') {
  return new URL(path, self.registration.scope).toString()
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll([scopeUrl('./')]))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('doom-map-shell-') && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(CACHE_VERSION).then((cache) => cache.put(scopeUrl('./'), copy))
          return response
        })
        .catch(async () => (await caches.match(scopeUrl('./'))) || Response.error())
    )
    return
  }

  if (url.origin !== self.location.origin) return
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && ['script', 'style', 'font', 'image'].includes(request.destination)) {
          const copy = response.clone()
          void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
        }
        return response
      })
    })
  )
})
