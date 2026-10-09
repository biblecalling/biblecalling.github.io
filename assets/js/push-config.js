/**
 * Jesus Calling - Web Push Configuration
 *
 * NOTE: The public VAPID key is mathematically safe to expose publicly.
 * The private VAPID key is NEVER placed here and MUST reside exclusively in Cloudflare Worker secrets.
 */
window.JESUS_CALLING_PUSH_CONFIG = {
  // Cloudflare Worker base URL (e.g. 'https://jesuscalling-push.YOUR_SUBDOMAIN.workers.dev')
  workerUrl: 'https://jesuscalling-push.your-subdomain.workers.dev',

  // Public VAPID key (Generated during Cloudflare Worker setup)
  vapidPublicKey: 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY',

  // Local storage state keys
  storageKey: 'jesuscalling_push_subscribed',
  timezoneKey: 'jesuscalling_push_timezone'
};
