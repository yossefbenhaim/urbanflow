// Bumped on every release — the browser installs a new SW when this file's
// bytes change, so the version string doubles as the cache-bust key.
const CACHE_NAME = 'silver-castle-v3-2026-04-23-22';
const PRECACHE_ASSETS = ['/manifest.json', '/castle-icon.svg', '/icon-192.png', '/icon-512.png'];

// Paths that MUST always hit the network so users never get stuck on an
// outdated bundle. Everything under /assets/ carries a content hash so
// opaque-cache is safe, but the HTML shell is mutable and must stay fresh.
const NETWORK_ONLY_PATTERNS = [/^\/$/, /^\/index\.html$/];

// ── Keepalive Logic (1 hour) ──────────────────────────────────────────────
const KEEPALIVE_INTERVAL_MS = 20 * 1000;
const KEEPALIVE_DURATION_MS = 60 * 60 * 1000;
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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: nuke every old cache so stale index.html can't survive ──────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
  startKeepalive();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEPALIVE_PING') {
    startKeepalive();
  }
});

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (!keepaliveTimer) startKeepalive();

  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/') || event.request.url.includes('/trpc/')) return;

  const url = new URL(event.request.url);

  // Never cache the HTML shell — always fetch from network, no fallback.
  // This guarantees the user gets fresh <script src="…-{hash}.js">
  // references after every deploy.
  if (NETWORK_ONLY_PATTERNS.some((re) => re.test(url.pathname))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for everything else (hashed assets, images, icons).
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
