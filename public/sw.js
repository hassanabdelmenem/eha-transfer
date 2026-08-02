// Kill switch: the previous version of this file pre-cached '/' and '/index.html'
// at install time under a CACHE_NAME that never changed, so that cache entry was
// never invalidated. On any network hiccup (routine on mobile — weak signal, cell
// handoff, backgrounding), the old fetch handler silently served that stale shell,
// which could point at a JS bundle from long before the current deploy — completely
// bypassing HTTP Cache-Control headers, since Cache Storage is a separate mechanism.
// This version deletes all caches, unregisters itself, and reloads any open clients,
// so every device still running the old worker self-heals on its next visit.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
