const CACHE_NAME = 'enquiry-app-cache-v9';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Skip POST, PUT, DELETE, etc.
  if (event.request.method !== 'GET') return;

  // Stale-While-Revalidate Strategy for everything from our origin or font origins
  const isOurOrigin = requestUrl.origin === self.location.origin;
  const isFontOrigin = requestUrl.hostname === 'fonts.googleapis.com' || requestUrl.hostname === 'fonts.gstatic.com';
  
  if (isOurOrigin || isFontOrigin) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            // Only cache valid responses
            if (networkResponse.type === 'basic' || networkResponse.type === 'cors' || networkResponse.type === 'opaque') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
          }
          return networkResponse;
        }).catch(err => {
          // If offline and request fails
          return cachedResponse;
        });

        // Return cached response immediately if available, while fetching in background
        return cachedResponse || fetchPromise;
      }).catch(() => {
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
    );
  }
});
