const CACHE_NAME = 'financas-cache-v3'; // Nova versão para aplicar a estratégia de rede
const urlsToCache = [
    './',
    './index.html',
    './assets/CSS/style.css', 
    './assets/JS/script.js',
    './manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// --- MELHORIA: Estratégia Stale-While-Revalidate ---
// Devolve o conteúdo do cache imediatamente se existir, mas procura atualizações em background.
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                // Cria a requisição de rede em segundo plano
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // Se a resposta for válida, atualiza o cache com a cópia mais recente
                    if (networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Silencia falhas de rede se estiver totalmente offline
                });

                // Retorna o cache imediatamente ou aguarda a rede caso o ficheiro não esteja em cache
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