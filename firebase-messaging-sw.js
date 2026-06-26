// MantoApp — Firebase Cloud Messaging Service Worker
// Este archivo DEBE estar en la raíz del repositorio con este nombre exacto

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyB6ZjPeh9bwY5d2M-ZpxIbEW3ZsLzhAz0M",
  authDomain:        "impredimex-mantoapp.firebaseapp.com",
  databaseURL:       "https://impredimex-mantoapp-default-rtdb.firebaseio.com",
  projectId:         "impredimex-mantoapp",
  storageBucket:     "impredimex-mantoapp.firebasestorage.app",
  messagingSenderId: "294064610592",
  appId:             "1:294064610592:web:6a352dbf44ec6749898b45"
});

const messaging = firebase.messaging();

// Manejar notificaciones en background (app cerrada o en segundo plano)
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Notificación en background:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'MantoApp';
  const notificationOptions = {
    body:  payload.notification?.body  || payload.data?.body  || '',
    icon:  '/Mantenimiento-Impredimex/icon-192.png',
    badge: '/Mantenimiento-Impredimex/icon-192.png',
    tag:   payload.data?.tag || 'manto-notif',
    data:  payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: payload.data?.urgente === 'true'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Al hacer clic en la notificación — abrir la app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = 'https://victormorenogarcia05-ux.github.io/Mantenimiento-Impredimex/MantoApp.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
