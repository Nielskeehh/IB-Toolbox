const CACHE_NAME = "ib-toolbox-v3";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./bonnetjes.html",
  "./declaraties.html",
  "./kilometers.html",
  "./stortingen.html",
  "./reglementen.html",
  "./manifest.json",
  "./pdf-lib.min.js",
  "./pdf.min.js",
  "./pdf.worker.min.js",
  "./cropper.min.js",
  "./cropper.min.css",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-bonnetjes-192.png",
  "./icon-bonnetjes-512.png",
  "./icon-declaraties-192.png",
  "./icon-declaraties-512.png",
  "./icon-kilometers-192.png",
  "./icon-kilometers-512.png",
  "./icon-stortingen-192.png",
  "./icon-stortingen-512.png",
  "./icon-reglementen-192.png",
  "./icon-reglementen-512.png",
  // let op: bedrijfsreglement.pdf en cao.pdf bewust NIET hier — die moeten
  // altijd vers van het net komen zodat een vervangen bestand direct zichtbaar is.
  "./shared/style.css",
  "./shared/nav.js",
  "./shared/dropbox.js",
  "./shared/crop.js",
  "./shared/file-helpers.js",
  "./shared/openstaand.js",
  "./shared/geschiedenis.js",
  "./shared/settings.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // never cache/intercept Dropbox API calls
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
