const CACHE_NAME = "app-v3"; // ¡IMPORTANTE! Cambiado a v3 para forzar la actualización

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        "/launcher/",
        "/launcher/index.html",
        "/launcher/icon.png",
        "/launcher/manifest.json"
      ]);
    })
  );
  self.skipWaiting(); // Fuerza al nuevo service worker a activarse inmediatamente
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  return self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Estrategia "Network First" para HTML (para que los enlaces se actualicen)
  if (e.request.url.endsWith('.html') || e.request.url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Estrategia "Cache First" para imágenes y otros recursos
    e.respondWith(
      caches.match(e.request).then(res => res || fetch(e.request))
    );
  }
});
