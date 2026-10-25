/* Navira service worker: offline app shell only. It never sees, stores or sends user content.
   The speech-model cache ("transformers-cache") is owned by transformers.js and is left alone here. */
const CACHE = 'navira-shell-v1';
const PRECACHE = self.__PRECACHE__ || []; // replaced at build time by scripts/gen-sw.mjs

async function precache() {
  const c = await caches.open(CACHE);
  await Promise.all(PRECACHE.map((u) => c.add(u).catch(() => undefined)));
}
self.addEventListener('install', (e) => { e.waitUntil(precache().then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('navira-shell-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'reprecache') {
    // reply on the provided port when finished, so delete-all can wait until the offline shell is back
    e.waitUntil(precache().then(() => { if (e.ports && e.ports[0]) e.ports[0].postMessage('done'); }));
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // model weights etc. are not ours to cache
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match(url.pathname.endsWith('/') ? url.pathname : url.pathname + '/', { ignoreSearch: true }) : undefined);
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()).catch(() => undefined); return res; }).catch(() => undefined);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') { const home = await c.match('/', { ignoreSearch: true }); if (home) return home; }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
