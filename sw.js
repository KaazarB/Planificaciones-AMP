// Service worker: permite abrir la app sin conexión.
// Estrategia: primero la red (para tener siempre lo último) y, si no hay conexión, la copia guardada.
const CACHE = "planilla-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !isFont) return;
  // El panel del coach no se guarda en caché del atleta.
  if (url.pathname.endsWith("/coach.html")) return;
  // Los planes se guardan sin el parámetro anti-caché, para tener una copia por atleta.
  const key = url.pathname.includes("/planes/") ? new Request(url.origin + url.pathname) : req;
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(key, copy));
      }
      return res;
    }).catch(() => caches.match(key, { ignoreSearch: !url.pathname.includes("/planes/") }).then(r => r || caches.match("index.html")))
  );
});
