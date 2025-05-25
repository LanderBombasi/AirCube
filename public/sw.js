
// public/sw.js

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data ? event.data.text() : '-'}"`);

  const title = 'AirCube Alert';
  const options = {
    body: event.data ? event.data.text() : 'Something happened!',
    icon: '/icon-192x192.png', // You'll need to add an icon here
    badge: '/badge-72x72.png' // And a badge icon here
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  // Add logic to open the app or a specific URL
  // event.waitUntil(
  //   clients.openWindow('https://example.com')
  // );
});

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(clients.claim());
});
