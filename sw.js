const CACHE_VERSION = 'wanikanji-v8';
const CORE_ASSETS = [
  '.', 'index.html', 'style.css', 'manifest.json', 'icon.svg',
  'js/kana.js', 'js/grading.js', 'js/srs.js', 'js/speech.js',
  'js/progress.js', 'js/data.js', 'js/app.js',
  'data/kanji.json', 'data/radicals.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Stale-while-revalidate for same-origin GETs.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then((response) => { if (response.ok) cache.put(event.request, response.clone()); return response; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
