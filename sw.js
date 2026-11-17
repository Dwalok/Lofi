/* Lofi Studio service worker: offline shell, never caches videos or SoundCloud. */
const VERSION = 'lofi-2027-1';
const SHELL = ['./', 'index.html', 'static/style.css', 'static/script.js', 'static/favicon.svg', 'manifest.webmanifest'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/static/video/')) {
        return;
    }
    // network first for the app shell, so deployments show up immediately
    if (request.mode === 'navigate' || /\.(html|css|js|webmanifest)$/.test(url.pathname)) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(VERSION).then(cache => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then(hit => hit || caches.match('index.html')))
        );
        return;
    }
    // cache first for images, thumbnails and ambient sounds
    event.respondWith(
        caches.match(request).then(hit => hit || fetch(request).then(response => {
            if (response.ok && response.status === 200) {
                const copy = response.clone();
                caches.open(VERSION).then(cache => cache.put(request, copy));
            }
            return response;
        }))
    );
});
