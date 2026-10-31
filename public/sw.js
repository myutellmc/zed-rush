// Service Worker for Zed Rush App
// Version 1.0.0

// The build (see precacheBuildAssets in vite.config.ts) replaces these two lines:
// the cache name gets a hash of the build, and BUILD_ASSETS lists the hashed
// JS, CSS, font and sound files so the game works offline from the first visit.
const CACHE_NAME = 'zed-rush-dev';
const BUILD_ASSETS = [];
const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
// Files from public/ that exist in the production build
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/favicon.ico',
  '/game-icon-48.svg',
  '/game-icon-72.svg',
  '/game-icon-96.svg',
  '/game-icon-120.svg',
  '/game-icon-144.svg',
  '/game-icon-152.svg',
  '/game-icon-180.svg',
  '/game-icon-192.svg',
  '/game-icon-512.svg',
  '/manifest.json',
  '/zed-rush-logo.png',
  '/zed-rush-logo-192.png',
  '/zed-rush-logo-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        // Cache files one by one so a single missing file can't fail the whole install
        const urls = [...STATIC_CACHE_URLS, ...BUILD_ASSETS];
        return Promise.allSettled(urls.map((url) => cache.add(url)));
      })
      .then(() => {
        console.log('[ServiceWorker] All files cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
}

// Fetch event
// - Page navigations: network first so new deploys reach players, cached app shell when offline
// - Everything else: cache first, then network (hashed /assets/ files never change)
self.addEventListener('fetch', (event) => {
  // In dev mode, never intercept — let Vite handle everything
  if (IS_DEV) return;

  const request = event.request;

  // Only cache same-origin GET requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            putInCache('/index.html', response);
          }
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        putInCache(request, response);
        return response;
      });
    })
  );
});

// Handle background sync for timer data
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync', event.tag);
  
  if (event.tag === 'timer-sync') {
    event.waitUntil(
      // Handle any pending timer syncs
      syncTimerData()
    );
  }
});

// Handle push notifications (for timer completion alerts)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  const options = {
    body: 'Your turn is complete! Time to see the results and continue the game.',
    icon: '/game-icon-96.svg',
    badge: '/game-icon-48.svg',
    tag: 'game-turn-complete',
    requireInteraction: true,
    actions: [
      {
        action: 'continue-game',
        title: 'Continue Game'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Game Turn Complete!', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'continue-game') {
    // Open app and continue the game
    event.waitUntil(
      clients.openWindow('/?continue=true')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function to sync timer data
async function syncTimerData() {
  try {
    // This would sync any pending timer data
    // For now, just log that sync happened
    console.log('[ServiceWorker] Timer data synced');
    return Promise.resolve();
  } catch (error) {
    console.error('[ServiceWorker] Timer sync failed', error);
    return Promise.reject(error);
  }
}