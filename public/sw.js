/**
 * MeTube — Service Worker
 * - يُخزّن أصول التطبيق للاستخدام offline
 * - يسمح بالتشغيل في الخلفية (audio لا يحتاج SW للتشغيل في الخلفية)
 * - يدعم التثبيت كـ PWA
 */

const CACHE_NAME = "metube-v2";
const AUDIO_CACHE = "metube-audio-v1";

// App shell assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
];

// ── Install: cache static assets ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== AUDIO_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for assets ─────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip audio streams — let browser handle range requests natively
  if (
    url.hostname.includes("invidious") ||
    url.hostname.includes("inv.nadeko") ||
    url.hostname.includes("googlevideo") ||
    url.hostname.includes("youtube") ||
    url.pathname.includes("/latest_version") ||
    url.pathname.includes("/api/v1/")
  ) {
    return; // no SW interception for media
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Cache successful responses for app shell
          if (
            response.ok &&
            (request.destination === "script" ||
              request.destination === "style" ||
              request.destination === "font" ||
              request.destination === "image" ||
              url.pathname === "/" ||
              url.pathname === "/index.html")
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation
          if (request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    })
  );
});

// ── Push Notifications (future use) ──────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "MeTube", {
      body: data.body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    })
  );
});
