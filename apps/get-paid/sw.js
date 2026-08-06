/* ==========================================================================
   Enable G — Get Paid: offline support.

   Everything the app needs is cached on first visit, so it opens with no
   signal at all. Bump CACHE_NAME whenever you change any of the files below,
   otherwise phones will keep serving the old copy.
   ========================================================================== */

/* v2 — re-skinned to the Enable G design tokens and the real logo. Without
   this bump, phones that already opened the app would keep serving the old
   cached shell and never see the new styling. */
const CACHE_NAME = "enableg-getpaid-v2";

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  /* The brand mark is part of the shell now. Left out, an offline visitor
     gets a broken image where the logo should be. */
  "./assets/enableg-logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only ever handle plain page/asset reads from this app.
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Serve instantly, then quietly refresh the copy for next time.
        fetch(request)
          .then((response) => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then((c) => c.put(request, response));
            }
          })
          .catch(() => {});
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          request.mode === "navigate"
            ? caches.match("./index.html")
            : Response.error()
        );
    })
  );
});
