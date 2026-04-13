/* Kalnehi Daily - Exam Prep Tracker — service worker (static caching + offline shell + sync bridge)
 * FCM block is injected at request time by src/app/sw.js/route.ts (never commit API keys).
 */
const STATIC_CACHE = "kalnehi-static-v3";
const PAGE_CACHE = "kalnehi-pages-v2";
const SYNC_TAG = "kalnehi-outbox-sync";

const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== STATIC_CACHE && key !== PAGE_CACHE) {
              return caches.delete(key);
            }
            return undefined;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function sameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch {
    return false;
  }
}

/** Ask open clients to flush IndexedDB outbox (requires app JS + session). */
function notifyClientsSync() {
  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "KALNEHI_SYNC" });
      });
    })
    .catch(() => {});
}

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(notifyClientsSync());
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = req.url;
  if (!sameOrigin(url)) return;

  const path = new URL(url).pathname;

  if (path.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (
    path.endsWith(".png") ||
    path.endsWith(".ico") ||
    path.endsWith(".svg") ||
    path.endsWith("manifest.webmanifest")
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (req.mode === "navigate" || req.headers.get("Accept")?.includes("text/html")) {
    event.respondWith(networkFirstHtml(req));
    return;
  }
});

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      });
    }),
  );
}

function networkFirstHtml(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then(
        (hit) =>
          hit ||
          caches.match("/offline.html") ||
          new Response(
            "<!DOCTYPE html><html><body style='background:#020617;color:#94a3b8;font-family:system-ui;padding:2rem;text-align:center'>Offline</body></html>",
            { headers: { "Content-Type": "text/html;charset=utf-8" } },
          ),
      ),
    );
}








































// --- Firebase Cloud Messaging (injected by scripts/merge-service-worker.mjs) ---
importScripts("https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js");
try {
  if (!firebase.apps.length) {
    firebase.initializeApp({"apiKey":"AIzaSyD2EO5qzR_GKJBuLOr9VCle4Pq8W8lqcUk","authDomain":"kalnehi-1.firebaseapp.com","projectId":"kalnehi-1","storageBucket":"kalnehi-1.firebasestorage.app","messagingSenderId":"543640707010","appId":"1:543640707010:web:e93c47633a1148a2a0805b","measurementId":"G-DGMQZ6D9NN"});
  }
  if (firebase.messaging && firebase.messaging.isSupported()) {
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title =
        payload.notification && payload.notification.title
          ? payload.notification.title
          : "Kalnehi Daily - Exam Prep Tracker";
      const body =
        payload.notification && payload.notification.body
          ? payload.notification.body
          : "";
      const options = {
        body,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        data: payload.data || {},
        tag: payload.data && payload.data.tag ? String(payload.data.tag) : "kalnehi-fcm",
      };
      return self.registration.showNotification(title, options);
    });
  }
} catch (e) {
  console.error("[kalnehi sw] FCM background init failed", e);
}
