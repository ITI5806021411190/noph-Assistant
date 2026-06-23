const CACHE_NAME = 'haos-v70-95-popup-safety-audit';
const CORE = [
  '/',
  '/index.html',
  '/public.html',
  '/public',
  '/remote.html',
  '/remote',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-moph.png',
  '/assets/css/admin-external-organizations.css',
  '/assets/js/modules/external-organizations.js',
  '/assets/css/remote-support.css',
  '/assets/js/modules/remote-support.js',
  '/assets/css/meeting-minutes.css',
  '/assets/css/schedule-thai-list.css',
  '/assets/js/modules/date-display.js',
  '/assets/js/modules/date-coverage.js',
  '/assets/js/modules/meeting-minutes.js',
  '/assets/js/modules/meeting-minutes-audio-safe.js',
  '/assets/js/modules/meeting-minutes-ai-modes.js',
  '/assets/css/notifications.css',
  '/assets/js/modules/notifications.js',
  '/assets/css/program-guide.css',
  '/assets/css/public-portal.css',
  '/assets/js/modules/program-guide.js',
  '/assets/js/modules/public-portal.js',
  '/assets/js/modules/schedule-core.js',
  '/assets/js/modules/schedule-view.js',
  '/assets/js/modules/schedule-thai-list.js',
  '/assets/js/modules/schedule-multi-ranges.js',
  '/assets/js/modules/upcoming-agenda.js',
  '/assets/js/modules/schedule-public-link.js',
  '/assets/js/modules/shared-workspace-core.js',
  '/assets/js/modules/shared-workspace-export.js',
  '/assets/css/shared-workspace-flow.css',
  '/assets/js/modules/shared-workspace-flow.js',
  '/assets/js/modules/shared-workspace-builder.js',
  '/assets/css/ai-document-summary.css',
  '/assets/js/modules/ai-document-summary.js',
  '/assets/css/e-office.css',
  '/assets/js/modules/e-office.js',
  '/assets/css/notes.css',
  '/assets/js/modules/notes.js',
  '/assets/js/modules/notifications-action-fix.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (!response || !response.ok) return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))
  );
});
