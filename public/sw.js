const CACHE_PREFIX = "monthlane-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const scopeUrl = new URL(self.registration.scope);
const shellUrls = [
  new URL("./manifest.webmanifest", scopeUrl).href,
  new URL("./monthlane-icon-192.png", scopeUrl).href,
  new URL("./monthlane-icon-512.png", scopeUrl).href,
  new URL("./apple-touch-icon.png", scopeUrl).href,
];

const cacheAppShell = async () => {
  const cache = await caches.open(CACHE_NAME);
  const appUrl = new URL("./", scopeUrl).href;
  const response = await fetch(appUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Monthlane shell could not be cached.");

  await cache.put(appUrl, response.clone());
  const html = await response.text();
  const referencedAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], appUrl))
    .filter((url) => url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname))
    .map((url) => url.href);

  await Promise.allSettled([...new Set([...shellUrls, ...referencedAssets])].map((url) => cache.add(url)));
};

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(scopeUrl.pathname)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const shell = await caches.match(new URL("./", scopeUrl).href);
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
