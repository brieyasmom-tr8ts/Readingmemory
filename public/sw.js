const CACHE = 'readthat-v4';
const IMG_CACHE = 'readthat-img-v1';
const SHELL = [
  '/',
  '/index.html',
  '/icon.svg',
  '/logo.svg',
  '/logo.png',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isImageRequest(req, url) {
  if (req.destination === 'image') return true;
  return /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(url.pathname);
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // API calls: network-first, fall back to cache
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Images (book covers, including cross-origin): cache-first, cache opaque too
  if (isImageRequest(e.request, url)) {
    e.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(r => {
            // Cache successful same-origin (r.ok) AND opaque cross-origin (status 0)
            if (r && (r.ok || r.type === 'opaque')) {
              cache.put(e.request, r.clone()).catch(() => {});
            }
            return r;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Other static assets: cache-first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      });
    })
  );
});
