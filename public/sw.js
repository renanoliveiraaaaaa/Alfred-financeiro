const CACHE_NAME = 'alfred-finance-v3'
const OFFLINE_URL = '/offline'

/** Só URLs públicas — rotas autenticadas não entram no precache. */
const PRECACHE = ['/', '/offline', '/manifest.json', '/favicon.ico', '/apple-icon.png']

function offlineResponse() {
  return caches.match(OFFLINE_URL).then(
    (hit) =>
      hit ||
      new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() =>
          caches.match(req).then((hit) => (hit ? hit : offlineResponse())),
        ),
    )
    return
  }

  if (url.pathname.startsWith('/_next/static')) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return res
        })
      }),
    )
  }
})
