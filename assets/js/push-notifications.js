/**
 * Jesus Calling - Custom Lightweight Web Push Notification Client
 * Vanilla JavaScript, Zero Dependencies, Core Web Vitals Friendly.
 * No network requests on page load until reader clicks "Get Daily Devotionals".
 */

(function () {
  'use strict';

  // Helper to convert base64 URL VAPID key to Uint8Array for PushManager
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Detect and validate IANA timezone
  function getDetectedTimezone() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && typeof tz === 'string' && tz.length > 2) {
        return tz;
      }
    } catch (e) {
      // Fallback
    }
    return 'UTC';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const config = window.JESUS_CALLING_PUSH_CONFIG || {};
    const modal = document.getElementById('push-subscribe-modal');
    const backdrop = document.getElementById('push-modal-backdrop');
    const openBtns = document.querySelectorAll('.js-open-push-modal');
    const closeBtn = document.getElementById('push-modal-close');
    const subscribeBtn = document.getElementById('push-action-subscribe');
    const unsubscribeBtn = document.getElementById('push-action-unsubscribe');
    const statusMsg = document.getElementById('push-status-msg');
    const tzDisplay = document.getElementById('push-detected-timezone');
    const subStateNotice = document.getElementById('push-subscription-state');

    const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const detectedTz = getDetectedTimezone();

    if (tzDisplay) {
      tzDisplay.textContent = detectedTz;
    }

    // Modal state controllers
    function openModal() {
      if (!modal) return;
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      checkCurrentSubscriptionStatus();
      if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      clearMessage();
    }

    function showMessage(text, type = 'info') {
      if (!statusMsg) return;
      statusMsg.textContent = text;
      statusMsg.className = `push-status-alert alert-${type}`;
      statusMsg.style.display = 'block';
    }

    function clearMessage() {
      if (!statusMsg) return;
      statusMsg.textContent = '';
      statusMsg.style.display = 'none';
      statusMsg.className = 'push-status-alert';
    }

    // Update UI based on browser permission and active service worker registration
    async function checkCurrentSubscriptionStatus() {
      if (!isPushSupported) {
        if (subStateNotice) subStateNotice.textContent = 'Push notifications are not supported in this browser.';
        if (subscribeBtn) subscribeBtn.disabled = true;
        if (unsubscribeBtn) unsubscribeBtn.style.display = 'none';
        return;
      }

      if (Notification.permission === 'denied') {
        if (subStateNotice) subStateNotice.textContent = 'Notifications are blocked in your browser settings.';
        if (subscribeBtn) subscribeBtn.disabled = true;
        if (unsubscribeBtn) unsubscribeBtn.style.display = 'none';
        showMessage('Please enable notifications for this site in your browser settings to receive morning devotionals.', 'error');
        return;
      }

      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = reg ? await reg.pushManager.getSubscription() : null;

        if (sub) {
          if (subStateNotice) subStateNotice.textContent = 'You are currently subscribed to daily devotionals.';
          if (subscribeBtn) subscribeBtn.style.display = 'none';
          if (unsubscribeBtn) unsubscribeBtn.style.display = 'inline-flex';
          updateHeaderButtonState(true);
        } else {
          if (subStateNotice) subStateNotice.textContent = 'Receive Scripture reflections every morning at 8:00 AM.';
          if (subscribeBtn) {
            subscribeBtn.style.display = 'inline-flex';
            subscribeBtn.disabled = false;
          }
          if (unsubscribeBtn) unsubscribeBtn.style.display = 'none';
          updateHeaderButtonState(false);
        }
      } catch (err) {
        // Fallback gracefully without throwing
      }
    }

    function updateHeaderButtonState(isSubscribed) {
      openBtns.forEach((btn) => {
        const textSpan = btn.querySelector('.push-btn-text');
        if (textSpan) {
          textSpan.textContent = isSubscribed ? 'Devotionals Subscribed' : 'Get Daily Devotionals';
        }
        if (isSubscribed) {
          btn.classList.add('subscribed');
        } else {
          btn.classList.remove('subscribed');
        }
      });
    }

    // Subscribe handler
    async function handleSubscribe() {
      clearMessage();

      if (!isPushSupported) {
        showMessage('Your browser does not support Web Push notifications.', 'error');
        return;
      }

      if (!config.vapidPublicKey || config.vapidPublicKey.startsWith('REPLACE_WITH')) {
        showMessage('Push notifications are currently in setup mode. Please configure the VAPID Public Key in assets/js/push-config.js.', 'warning');
        return;
      }

      setLoading(true, subscribeBtn, 'Subscribing...');

      try {
        // 1. Request native notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setLoading(false, subscribeBtn, 'Subscribe to Daily Devotionals');
          showMessage('Notification permission was not granted. You can re-enable it in your browser preferences.', 'warning');
          return;
        }

        // 2. Register Service Worker
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        // 3. Subscribe with PushManager
        const applicationServerKey = urlBase64ToUint8Array(config.vapidPublicKey);
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });

        const subJson = subscription.toJSON();

        // 4. Send subscription to Cloudflare Worker backend
        const response = await fetch(`${config.workerUrl}/api/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth
            },
            timezone: detectedTz
          })
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Server failed to save subscription');
        }

        localStorage.setItem(config.storageKey || 'jesuscalling_push_subscribed', 'true');
        showMessage('You are now subscribed! Your daily devotional will arrive at 8:00 AM.', 'success');
        checkCurrentSubscriptionStatus();
      } catch (err) {
        showMessage(`Subscription failed: ${err.message || 'Network error'}. Please try again.`, 'error');
      } finally {
        setLoading(false, subscribeBtn, 'Subscribe to Daily Devotionals');
      }
    }

    // Unsubscribe handler
    async function handleUnsubscribe() {
      clearMessage();
      setLoading(true, unsubscribeBtn, 'Unsubscribing...');

      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = reg ? await reg.pushManager.getSubscription() : null;

        if (sub) {
          // 1. Inform backend
          try {
            await fetch(`${config.workerUrl}/api/unsubscribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: sub.endpoint })
            });
          } catch (e) {
            // Proceed even if backend is offline
          }

          // 2. Unsubscribe browser push
          await sub.unsubscribe();
        }

        localStorage.removeItem(config.storageKey || 'jesuscalling_push_subscribed');
        showMessage('You have unsubscribed from daily devotionals.', 'info');
        checkCurrentSubscriptionStatus();
      } catch (err) {
        showMessage(`Could not unsubscribe: ${err.message}`, 'error');
      } finally {
        setLoading(false, unsubscribeBtn, 'Unsubscribe from Devotionals');
      }
    }

    function setLoading(isLoading, btn, text) {
      if (!btn) return;
      btn.disabled = isLoading;
      const textSpan = btn.querySelector('.btn-label') || btn;
      textSpan.textContent = text;
    }

    // Event Listeners
    openBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);
    if (subscribeBtn) subscribeBtn.addEventListener('click', handleSubscribe);
    if (unsubscribeBtn) unsubscribeBtn.addEventListener('click', handleUnsubscribe);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
        closeModal();
      }
    });

    // Check local storage quickly to update button appearance without network calls
    if (localStorage.getItem(config.storageKey || 'jesuscalling_push_subscribed') === 'true') {
      updateHeaderButtonState(true);
    }
  });
})();
