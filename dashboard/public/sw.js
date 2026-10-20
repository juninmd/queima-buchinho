/* Service worker do Queima Buchinho: casca offline + Web Push. A API nunca passa por aqui:
   o app guarda o último estado e a fila de escritas em localStorage. */
const VERSION = 'v1';
const SHELL = `qb-shell-${VERSION}`;
const ASSETS = `qb-assets-${VERSION}`;
const EXTERNAL = `qb-external-${VERSION}`;
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  const keep = new Set([SHELL, ASSETS, EXTERNAL]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('qb-') && !keep.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, fallbackKey) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(fallbackKey ?? request, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(fallbackKey ?? request);
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fresh = fetch(request).then(res => { if (res.ok || res.type === 'opaque') cache.put(request, res.clone()); return res; }).catch(() => cached);
  return cached ?? fresh;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return;
    if (request.mode === 'navigate') return event.respondWith(networkFirst(request, SHELL, '/'));
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) return event.respondWith(cacheFirst(request, ASSETS));
    return event.respondWith(networkFirst(request, SHELL));
  }
  // Fontes e fotos dos aparelhos (CDN do free-exercise-db): abrem offline depois da primeira visita.
  if (['fonts.googleapis.com', 'fonts.gstatic.com', 'raw.githubusercontent.com'].includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, EXTERNAL));
  }
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Queima Buchinho', body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Queima Buchinho', {
    body: data.body || '',
    tag: data.tag || 'queima-buchinho',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const open = list.find(c => new URL(c.url).origin === self.location.origin);
      if (open) return open.focus().then(c => { c.navigate(target); return c; });
      return self.clients.openWindow(target);
    }),
  );
});
