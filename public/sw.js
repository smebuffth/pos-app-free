// public/sw.js: hand-written service worker. It keeps the app shell and static files, and the last copy of the
// counter and home pages, so a cashier can keep selling when the connection drops. It never caches /api/* or any
// request that is not a GET. The cached pages are cleared at sign-out (components/pos/LogoutForm.tsx).
const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const PAGES_CACHE = "pages";
const SHELL = ["/offline", "/favicon.png", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];
const OFFLINE_PAGES = ["/", "/sale", "/home"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    if (OFFLINE_PAGES.includes(url.pathname)) {
      event.respondWith(networkThenCachedPage(url.pathname));
    } else {
      event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    }
    return;
  }

  // Hashed build files, icons and images: cache first, then the network.
  const cacheable = url.pathname.startsWith("/_next/static/") || /\.(webp|png|svg|woff2|js|css)$/.test(url.pathname);
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((res) => {
        if (res.ok && cacheable) caches.open(SHELL_CACHE).then((cache) => cache.put(request, res.clone()));
        return res;
      });
    }),
  );
});

// The newest copy of the page is kept for offline use. If the network fails, the last copy is served.
async function networkThenCachedPage(pathname) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await fetch(pathname, { credentials: "same-origin" });
    if (res.ok) cache.put(pathname, res.clone());
    return res;
  } catch {
    const cached = await cache.match(pathname);
    return cached ?? (await caches.match("/offline"));
  }
}
