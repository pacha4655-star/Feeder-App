// Firebase Cloud Messaging Background Service Worker
// Feeder Emergency Rescue Notification System
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCEQh1NCkOkBbipzLsCtHbWaBQh8zrI0o0",
  authDomain: "feeder-app-103ec.firebaseapp.com",
  projectId: "feeder-app-103ec",
  storageBucket: "feeder-app-103ec.appspot.com",
  messagingSenderId: "668347278436",
  appId: "1:668347278436:web:f6392619c8aee149126b71"
});

// Immediate activation: ensure service worker takes control right away without tab restart
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const messaging = firebase.messaging();

// Handle background FCM notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const title = payload.notification?.title || payload.data?.title || '🚨 Emergency Rescue Request';
  const helpRequestId = payload.data?.helpRequestId || '';
  const body = payload.notification?.body || payload.data?.body || 'An emergency rescue request has been reported nearby.';
  const route = payload.data?.route || (helpRequestId ? `/?emergency=${helpRequestId}` : '/');

  const notificationOptions = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: helpRequestId ? `emergency-${helpRequestId}` : 'emergency-request',
    data: {
      route,
      helpRequestId,
      type: payload.data?.type || 'EMERGENCY_RESCUE',
      timestamp: Date.now()
    },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200]
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Handle notification click: focus existing Feeder tab or open new window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const targetRoute = notificationData.route || '/';
  const helpRequestId = notificationData.helpRequestId;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Look for an existing open Feeder window
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (helpRequestId) {
            client.postMessage({
              type: 'NAVIGATE_EMERGENCY',
              helpRequestId,
              route: targetRoute
            });
          }
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetRoute);
      }
    })
  );
});
