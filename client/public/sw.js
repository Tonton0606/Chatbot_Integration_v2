/**
 * Exponify Service Worker — Offline Support & Cache Strategy
 * Provides offline functionality for the PWA
 */

/* global clients */

const CACHE_NAME = 'exponify-v4';
const STATIC_CACHE = 'exponify-static-v4';
const API_CACHE = 'exponify-api-v4';

// Static assets to pre-cache on install
const PRE_CACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
];

// API routes that should be cached for offline use
const CACHEABLE_API_PATTERNS = [
  /^\/api\/ai\/health/,
  /^\/api\/ai\/client-chatbot/,
];

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRE_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch Strategy ────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass service worker cache completely for local development
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome extension requests
  if (!url.protocol.startsWith('http')) return;

  // API requests — Network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    // Only cache specific safe API routes
    if (CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(API_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => caches.match(request))
      );
      return;
    }
    // All other API calls — network only (no caching for auth/data mutations)
    return;
  }

  // Static assets — Network-first for JS/CSS (hashed filenames change on deploy),
  // cache-first for immutable assets (fonts, images, icons)
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // HTML navigation — Network-first, cache fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Default — network first
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// ── Background Sync ───────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    // Offline data sync logic would go here
  }
});

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from Exponify',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'exponify-notification',
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Exponify', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data || '/';
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});