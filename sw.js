const VERSION = "v12";
const CACHE_NAME = `controle-compras-${VERSION}`;

const ASSETS = [
  "/",
  "/home.html",
  "/login.html",
  "/dashboard.html",
  "/exportar.html",
  "/categoria.html",
  "/orcamentos.html",
  "/css/style.css",
  "/js/firebase.js",
  "/js/login.js",
  "/js/home.js",
  "/js/categoria.js",
  "/js/orcamentos.js",
  "/js/dashboard.js",
  "/js/exportar.js",
  "/js/storage.js",
  "/js/data.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith("controle-compras-") && k !== CACHE_NAME)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});