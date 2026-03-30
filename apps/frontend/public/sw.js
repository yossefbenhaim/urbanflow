const CACHE_NAME = 'silver-castle-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/castle-icon.svg', '/icon-192.png', '/icon-512.png'];

// ── Keepalive Logic (1 hour) ──────────────────────────────────────────────
const KEEPALIVE_INTERVAL_MS = 20 * 1000; // ping every 20 seconds
const KEEPALIVE_DURATION_MS = 60 * 60 * 1000; // stay alive for 1 hour
let keepaliveTimer = null;
let keepaliveStart = null;

function startKeepalive() {
  keepaliveStart = Date.now();
  if (keepaliveTimer) clearInterval(keepaliveTimer);
  keepaliveTimer = setInterval(() => {
    const elapsed = Date.now() - keepaliveStart;
    if (elapsed >= KEEPALIVE_DURATION_MS) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
      return;
    }
    // Self-ping to stay alive
    self.registration.active && self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SW_KEEPALIVE', elapsed: Math.round(elapsed / 1000) });
      });
    });
  }, KEEPALIVE_INTERVAL_MS);
}

// ── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
  startKeepalive();
});

// ── Message handler ───────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEPALIVE_PING') {
    // Reset keepalive timer on explicit ping from client
    startKeepalive();
  }
});

// ── Fetch handler ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Restart keepalive on any fetch activity
  if (!keepaliveTimer) startKeepalive();

  // Only cache GET requests, skip API/tRPC calls
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/') || event.request.url.includes('/trpc/')) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
