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
    const storageKey = config.storageKey || 'jesuscalling_push_subscribed';
    const dismissedKey = config.dismissedKey || 'jesuscalling_push_prompt_dismissed';

    const modal = document.getElementById('push-subscribe-modal');
    const backdrop = document.getElementById('push-modal-backdrop');
    const openBtns = document.querySelectorAll('.js-open-push-modal');
    const closeBtn = document.getElementById('push-modal-close');
    const subscribeBtn = document.getElementById('push-action-subscribe');
    const disableBtn = document.getElementById('push-action-disable');
    const unsubscribeBtn = document.getElementById('push-action-unsubscribe');
    const modalTitle = document.getElementById('push-modal-title');
    const subStateNotice = document.getElementById('push-subscription-state');
    const statusMsg = document.getElementById('push-status-msg');
    const tzDisplay = document.getElementById('push-detected-timezone');

    const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const detectedTz = getDetectedTimezone();

    if (tzDisplay) {
      tzDisplay.textContent = detectedTz;
    }

    // Modal state controllers
    function openModal(isAutoPrompt = false) {
      if (!modal) return;
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      checkCurrentSubscriptionStatus();

      // Accessibility focus management
      if (isAutoPrompt && subscribeBtn && !subscribeBtn.disabled) {
        subscribeBtn.focus();
      } else if (closeBtn) {
        closeBtn.focus();
      }
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      clearMessage();
    }

    // Dismissal & Disable handling
    function handleDisable() {
      // Remember choice so popup does not appear on future visits/refreshes
      localStorage.setItem(dismissedKey, 'true');
      closeModal();
    }

    function handleDismissOnClose() {
      // If visitor closes the modal without subscribing, remember dismissal choice
      if (localStorage.getItem(storageKey) !== 'true') {
        localStorage.setItem(dismissedKey, 'true');
      }
      closeModal();
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
        if (modalTitle) modalTitle.textContent = 'Morning Devotional Reminders';
        if (subStateNotice) subStateNotice.textContent = 'Push notifications are not supported in this browser.';
        if (subscribeBtn) {
          subscribeBtn.disabled = true;
          subscribeBtn.style.display = 'inline-flex';
        }
        if (disableBtn) disableBtn.style.display = 'inline-flex';
        if (unsubscribeBtn) unsubscribeBtn.style.display = 'none';
        updateHeaderButtonState(false);
        return;
      }

      if (Notification.permission === 'denied') {
        if (modalTitle) modalTitle.textContent = 'Morning Devotional Reminders';
        if (subStateNotice) subStateNotice.textContent = 'Notifications are blocked in your browser settings.';
        if (subscribeBtn) {
          subscribeBtn.disabled = true;
          subscribeBtn.style.display = 'inline-flex';
        }
        if (disableBtn) disableBtn.style.display = 'inline-flex';
        if (unsubscribeBtn) unsubscribeBtn.style.display = 'none';
        updateHeaderButtonState(false);
        showMessage('Please enable notifications for this site in your browser settings to receive morning devotionals.', 'error');
        return;
      }

      let isSubscribed = false;
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        isSubscribed = !!(sub && Notification.permission === 'granted');
      } catch (err) {
        isSubscribed = localStorage.getItem(storageKey) === 'true';
      }

      if (isSubscribed) {
        localStorage.setItem(storageKey, 'true');
        if (modalTitle) modalTitle.textContent = 'Morning Devotional Reminders';
        if (subStateNotice) subStateNotice.textContent = 'You are currently subscribed to daily devotionals.';
        if (subscribeBtn) subscribeBtn.style.display = 'none';
        if (disableBtn) disableBtn.style.display = 'none';
        if (unsubscribeBtn) unsubscribeBtn.style.display = 'inline-flex';
        updateHeaderButtonState(true);
      } else {
        localStorage.removeItem(storageKey);
        if (modalTitle) modalTitle.textContent = 'Start Your Day with Jesus';
        if (subStateNotice) subStateNotice.textContent = 'Receive daily Jesus Calling devotionals and peaceful prayer reminders.';
        if (subscribeBtn) {
          subscribeBtn.style.display = 'inline-flex';
          subscribeBtn.disabled = false;
          const textSpan = subscribeBtn.querySelector('.btn-label') || subscribeBtn;
          textSpan.textContent = 'Enable Notifications';
        }
        if (disableBtn) disableBtn.style.display = 'inline-flex';
        if (unsubscribeBtn) unsubscribeBtn.style.display = 'none';
        updateHeaderButtonState(false);
      }
    }

    function updateHeaderButtonState(isSubscribed) {
      openBtns.forEach((btn) => {
        const textSpan = btn.querySelector('.push-btn-text');
        if (textSpan) {
          textSpan.textContent = isSubscribed ? 'Devotionals Subscribed' : 'Get Devotionals';
        }
        if (isSubscribed) {
          btn.classList.add('subscribed');
          btn.setAttribute('title', 'Notifications Enabled (Click to manage)');
          btn.setAttribute('aria-label', 'Notifications Enabled');
        } else {
          btn.classList.remove('subscribed');
          btn.setAttribute('title', 'Get Daily Devotionals at 8:00 AM');
          btn.setAttribute('aria-label', 'Get Daily Devotionals');
        }
      });
    }

    // Auto-invitation check on page ready
    function checkAutoInvitation() {
      // 1. Browser compatibility check
      if (!isPushSupported) return;

      // 2. Do not prompt if permission is already granted or blocked
      if (Notification.permission === 'denied' || Notification.permission === 'granted') return;

      // 3. Do not prompt if already subscribed
      if (localStorage.getItem(storageKey) === 'true') return;

      // 4. Do not prompt if visitor previously selected Disable or dismissed
      if (localStorage.getItem(dismissedKey) === 'true') return;

      // 5. Display clean mobile-friendly invitation popup immediately on page ready
      openModal(true);
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

      setLoading(true, subscribeBtn, 'Enabling...');

      try {
        // 1. Request native notification permission on explicit click
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setLoading(false, subscribeBtn, 'Enable Notifications');
          if (permission === 'denied') {
            localStorage.setItem(dismissedKey, 'true');
            showMessage('Notification permission was blocked in your browser settings. You can enable notifications in browser site permissions.', 'warning');
          } else {
            showMessage('Notification permission was not granted.', 'info');
          }
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

        localStorage.setItem(storageKey, 'true');
        localStorage.setItem(dismissedKey, 'true');
        showMessage('You are now subscribed! Your daily devotional will arrive at 8:00 AM.', 'success');
        await checkCurrentSubscriptionStatus();

        // Smoothly close after user sees confirmation
        setTimeout(() => {
          closeModal();
        }, 2200);
      } catch (err) {
        showMessage(`Subscription failed: ${err.message || 'Network error'}. Please try again.`, 'error');
      } finally {
        setLoading(false, subscribeBtn, 'Enable Notifications');
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
          // 1. Inform backend to set active = 0
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

        localStorage.removeItem(storageKey);
        localStorage.setItem(dismissedKey, 'true');
        showMessage('You have unsubscribed from daily devotionals.', 'info');
        await checkCurrentSubscriptionStatus();
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
        openModal(false);
      });
    });

    if (disableBtn) disableBtn.addEventListener('click', handleDisable);
    if (closeBtn) closeBtn.addEventListener('click', handleDismissOnClose);
    if (backdrop) backdrop.addEventListener('click', handleDismissOnClose);
    if (subscribeBtn) subscribeBtn.addEventListener('click', handleSubscribe);
    if (unsubscribeBtn) unsubscribeBtn.addEventListener('click', handleUnsubscribe);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
        handleDismissOnClose();
      }
    });

    // Initial check from localStorage for fast render
    if (localStorage.getItem(storageKey) === 'true') {
      updateHeaderButtonState(true);
    }

    // Immediately trigger auto-invitation check on page ready
    checkAutoInvitation();
  });
})();
