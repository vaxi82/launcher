const CACHE_NAME = "app-v4"; // Subir el número cuando se quiera forzar una limpieza de caché

const ARCHIVOS = [
  "/launcher/",
  "/launcher/index.html",
  "/launcher/icon.png",
  "/launcher/manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS))
  );
  self.skipWaiting(); // El nuevo service worker se activa inmediatamente
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  const esHTML = e.request.mode === "navigate" ||
                 url.pathname.endsWith(".html") ||
                 url.pathname.endsWith("/");

  if (esHTML) {
    // Network First: siempre intenta la versión más reciente (saltándose la caché HTTP del navegador)
    e.respondWith(
      fetch(e.request, { cache: "reload" })
        .then(response => {
          const copia = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copia));
          return response;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match("/launcher/index.html")))
    );
  } else {
    // Cache First para imágenes y otros recursos (se vuelve a guardar si se ha borrado)
    e.respondWith(
      caches.match(e.request).then(res => {
        if (res) return res;
        return fetch(e.request).then(response => {
          if (response.ok && url.origin === self.location.origin) {
            const copia = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, copia));
          }
          return response;
        });
      })
    );
  }
});
