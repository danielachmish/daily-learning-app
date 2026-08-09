// Minimal service worker whose only job is Web Push: receive a push event
// from the browser's push service and show a notification for it. This is
// what makes the daily reminder actually fire in the browser/PWA build,
// where expo-notifications has no local-scheduling support (see
// src/services/localNotifications.ts) — the server sends the push at the
// user's chosen time instead (see supabase/functions/send-reminder-pushes).
//
// Intentionally does NOT do any asset caching / offline support — this
// isn't meant to turn the app into an offline-capable PWA, just to give the
// browser a push endpoint to deliver to.

self.addEventListener('push', (event) => {
  let data = { title: 'זמן ללימוד היומי!', body: 'בוא/י ללמוד את הלימוד של היום ולשמור על הרצף.' };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // Non-JSON payload — fall back to the default message above.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      dir: 'rtl',
      lang: 'he',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
