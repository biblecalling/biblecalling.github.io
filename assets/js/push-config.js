/**
 * Jesus Calling - Web Push Configuration
 *
 * NOTE: The public VAPID key is mathematically safe to expose publicly.
 * The private VAPID key is NEVER placed here and MUST reside exclusively in Cloudflare Worker secrets.
 */
window.JESUS_CALLING_PUSH_CONFIG = {
  // Cloudflare Worker base URL
  workerUrl: 'https://jesuscalling-push-worker.biblecalling-push.workers.dev',

  // Public VAPID key (Generated during Cloudflare Worker setup)
  vapidPublicKey: 'BORDvlJt4kXdfS_jwI-z-sjfqQn7i22n1NsF8S5lV06dFd66J-7bhxSl6xsXHg1_PAZ23z2L01GkkOwagM7qOc8',

  // Local storage state keys
  storageKey: 'jesuscalling_push_subscribed',
  timezoneKey: 'jesuscalling_push_timezone',
  dismissedKey: 'jesuscalling_push_prompt_dismissed'
};
