const VERSION = 'ei-v1';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './pages/home.html',
  './pages/projects.html',
  './pages/courses.html',
  './pages/tools.html',
  './pages/research.html',
  './pages/about.html',
  './pages/contact.html',
  './pages/profile.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== VERSION && caches.delete(k)))));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => cached))
    );
  }
});

