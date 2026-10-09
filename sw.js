/**
 * Jesus Calling - Lightweight Native Web Push Service Worker
 * Fully vanilla, zero external libraries.
 * Handles background push display, click navigation, and click tracking.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = {
      title: 'Jesus Calling Daily Devotional',
      body: event.data.text()
    };
  }

  const title = payload.title || 'Jesus Calling Daily Devotional';
  const options = {
    body: payload.body || 'A new Scripture reflection is ready for you.',
    icon: payload.icon || '/assets/images/favicon-96x96.png',
    badge: payload.badge || '/assets/images/favicon-48x48.png',
    tag: payload.tag || ('daily-devotional-' + (payload.data?.date || 'today')),
    renotify: true,
    data: {
      url: payload.data?.url || '/',
      date: payload.data?.date || '',
      subscriptionHash: payload.data?.subscriptionHash || '',
      trackingEndpoint: payload.data?.trackingEndpoint || ''
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';
  const devotionalDate = notificationData.date || '';
  const subscriptionHash = notificationData.subscriptionHash || '';
  const trackingEndpoint = notificationData.trackingEndpoint || '';

  // 1. Dispatch lightweight click tracking if endpoint configured
  const trackingPromise = (async () => {
    if (!trackingEndpoint) return;
    try {
      await fetch(trackingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devotional_date: devotionalDate,
          subscription_hash: subscriptionHash,
          target_url: targetUrl,
          click_token: `${subscriptionHash}_${devotionalDate}_${Date.now()}`
        })
      });
    } catch (e) {
      // Non-blocking: failure to log click should never stop user from reading devotional
    }
  })();

  // 2. Open or focus window on the canonical devotional article
  const navigationPromise = clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    // Resolve absolute URL
    const targetAbsoluteUrl = new URL(targetUrl, self.location.origin).href;

    for (const client of clientList) {
      if (client.url === targetAbsoluteUrl && 'focus' in client) {
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(targetAbsoluteUrl);
    }
  });

  event.waitUntil(Promise.all([trackingPromise, navigationPromise]));
});
