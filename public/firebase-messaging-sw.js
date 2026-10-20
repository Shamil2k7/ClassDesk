// Firebase Cloud Messaging background push service worker
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

/*
firebase.initializeApp({
  apiKey: "placeholder",
  projectId: "classdesk-demo",
  messagingSenderId: "100000000001",
  appId: "placeholder"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
*/

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'ClassDesk Alert';
    const options = {
      body: data.body || 'You have a new update from ClassDesk',
      icon: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=192&auto=format&fit=crop&q=80',
      badge: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=96&auto=format&fit=crop&q=80',
      data: data.data || {},
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/dashboard');
    })
  );
});
