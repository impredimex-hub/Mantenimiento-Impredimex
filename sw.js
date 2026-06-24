// sw.js - Service Worker para notificaciones push de MantoApp
self.addEventListener('install', event => {
  console.log('SW instalado');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('SW activado');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nueva notificación';
  const options = {
    body: data.body || 'Tienes una nueva notificación',
    icon: data.icon || '/icon.png',
    badge: '/badge.png',
    vibrate: [200, 100, 200]
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
