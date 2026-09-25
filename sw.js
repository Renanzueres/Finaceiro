const CACHE_NAME = 'financas-cache-v4'; // v4: passa a cachear ícones e o Chart.js (CDN) para o dashboard funcionar offline
const urlsToCache = [
    './',
    './index.html',
    './assets/CSS/style.css',
    './assets/JS/script.js',
    './manifest.json',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/icon-maskable-512.png',
    './assets/icons/favicon.png'
];
// Recursos de terceiros: cacheados à parte porque uma falha aqui (rede fora do ar
// na primeira visita) não pode impedir a instalação do cache dos arquivos locais.
const urlsExternas = [
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            await cache.addAll(urlsToCache);
            await Promise.all(urlsExternas.map(url =>
                cache.add(url).catch(() => { /* offline na instalação: tenta de novo no próximo fetch */ })
            ));
        })
    );
});

// --- Estratégia Stale-While-Revalidate ---
// Devolve o conteúdo do cache imediatamente se existir, mas procura atualizações em background.
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    if (networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Silencia falhas de rede se estiver totalmente offline
                });

                return cachedResponse || fetchPromise;
            });
        })
    );
});

// Limpeza de Caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
            );
        })
    );
});
