/**
 * Jesus Calling - Cloudflare Worker & D1 Web Push Backend
 * Zero heavy frameworks. Native Edge performance, strict security, and timezone scheduling.
 */

import { sendWebPushNotification } from './webpush.js';

// CORS Helper
function handleCors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = env.ALLOWED_ORIGIN || 'https://biblecalling.github.io';
  const isAllowed = origin === allowedOrigin || origin.startsWith('http://localhost:');

  const headers = {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  return { isAllowed, headers };
}

// SHA-256 helper for hashing endpoints
async function hashString(str) {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate IANA timezone
function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

// Check if current UTC time corresponds to 8:00 AM in the given timezone
function is8AMInTimezone(timeZone, now = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(formatter.format(now), 10);
    return hour === 8;
  } catch (e) {
    return false;
  }
}

// Format local date as YYYY-MM-DD in the given timezone
function getLocalDateString(timeZone, now = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(now);
  } catch (e) {
    return now.toISOString().split('T')[0];
  }
}

// Authentication verification for Admin Dashboard and Test endpoints
function verifyAdminAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const expectedKey = env.ADMIN_API_KEY;
  if (!expectedKey) return false;

  // 1. Bearer Token
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim() === expectedKey.trim();
  }

  // 2. HTTP Basic Auth
  if (authHeader.startsWith('Basic ')) {
    try {
      const decoded = atob(authHeader.substring(6));
      const parts = decoded.split(':');
      const password = parts.length > 1 ? parts[1] : parts[0];
      return password.trim() === expectedKey.trim();
    } catch (e) {
      return false;
    }
  }

  return false;
}

export default {
  // HTTP Request Router
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { isAllowed, headers: corsHeaders } = handleCors(request, env);

    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // JSON response helper
    const json = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    };

    try {
      // ----------------------------------------------------------------------
      // 1. POST /api/subscribe - Store Push Subscription
      // ----------------------------------------------------------------------
      if (url.pathname === '/api/subscribe' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
          return json({ success: false, error: 'Invalid subscription payload' }, 400);
        }

        // Validate endpoint URL format
        try {
          const epUrl = new URL(body.endpoint);
          if (epUrl.protocol !== 'https:') {
            return json({ success: false, error: 'Endpoint must be HTTPS' }, 400);
          }
        } catch {
          return json({ success: false, error: 'Malformed endpoint URL' }, 400);
        }

        const endpoint = body.endpoint;
        const p256dh = body.keys.p256dh;
        const auth = body.keys.auth;
        const timezone = isValidTimezone(body.timezone) ? body.timezone : 'UTC';
        const subId = await hashString(endpoint);

        // Upsert into Cloudflare D1
        await env.DB.prepare(`
          INSERT INTO subscriptions (id, endpoint, p256dh, auth, timezone, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
          ON CONFLICT(endpoint) DO UPDATE SET
            p256dh = excluded.p256dh,
            auth = excluded.auth,
            timezone = excluded.timezone,
            active = 1,
            updated_at = datetime('now')
        `).bind(subId, endpoint, p256dh, auth, timezone).run();

        return json({ success: true, id: subId.substring(0, 12), timezone });
      }

      // ----------------------------------------------------------------------
      // 2. POST /api/unsubscribe - Deactivate Push Subscription
      // ----------------------------------------------------------------------
      if (url.pathname === '/api/unsubscribe' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.endpoint) {
          return json({ success: false, error: 'Missing endpoint' }, 400);
        }

        await env.DB.prepare(`
          UPDATE subscriptions SET active = 0, updated_at = datetime('now')
          WHERE endpoint = ?
        `).bind(body.endpoint).run();

        return json({ success: true });
      }

      // ----------------------------------------------------------------------
      // 3. POST /api/track-click - Record Notification Click
      // ----------------------------------------------------------------------
      if (url.pathname === '/api/track-click' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.devotional_date) {
          return json({ success: false, error: 'Missing click payload' }, 400);
        }

        const devotionalDate = String(body.devotional_date).substring(0, 10);
        const subHash = body.subscription_hash ? String(body.subscription_hash).substring(0, 16) : 'anon';
        const targetUrl = body.target_url ? String(body.target_url).substring(0, 255) : '/';
        const clickToken = body.click_token ? String(body.click_token).substring(0, 64) : `${subHash}_${devotionalDate}_${Date.now()}`;

        // Prevent accidental rapid duplicate clicks
        await env.DB.prepare(`
          INSERT OR IGNORE INTO click_logs (devotional_date, subscription_hash, target_url, click_token, clicked_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `).bind(devotionalDate, subHash, targetUrl, clickToken).run();

        return json({ success: true });
      }

      // ----------------------------------------------------------------------
      // 4. GET /api/dashboard - Protected Analytics & Reporting Dashboard
      // ----------------------------------------------------------------------
      if (url.pathname === '/api/dashboard') {
        if (!verifyAdminAuth(request, env)) {
          return new Response('Unauthorized - Please provide valid credentials', {
            status: 401,
            headers: {
              ...corsHeaders,
              'WWW-Authenticate': 'Basic realm="Jesus Calling Push Admin"'
            }
          });
        }

        // Fetch metrics from D1
        const activeSubCount = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM subscriptions WHERE active = 1`
        ).first('count') || 0;

        const totalSubCount = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM subscriptions`
        ).first('count') || 0;

        const sendsAttempted = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM notification_logs`
        ).first('count') || 0;

        const sendsAccepted = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM notification_logs WHERE http_status IN (200, 201)`
        ).first('count') || 0;

        const sendsExpired = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM notification_logs WHERE http_status IN (404, 410)`
        ).first('count') || 0;

        const totalClicks = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM click_logs`
        ).first('count') || 0;

        // Documented CTR formula: (Total Recorded Clicks / Successful Push Service Deliveries) * 100
        const ctr = sendsAccepted > 0 ? ((totalClicks / sendsAccepted) * 100).toFixed(2) : '0.00';

        // Daily history (last 14 days)
        const dailyHistory = await env.DB.prepare(`
          SELECT
            n.devotional_date,
            n.devotional_title,
            COUNT(n.id) as attempted,
            SUM(CASE WHEN n.http_status IN (200, 201) THEN 1 ELSE 0 END) as accepted,
            SUM(CASE WHEN n.http_status IN (404, 410) THEN 1 ELSE 0 END) as expired,
            COALESCE(c.clicks, 0) as clicks
          FROM notification_logs n
          LEFT JOIN (
            SELECT devotional_date, COUNT(*) as clicks FROM click_logs GROUP BY devotional_date
          ) c ON n.devotional_date = c.devotional_date
          GROUP BY n.devotional_date
          ORDER BY n.devotional_date DESC
          LIMIT 14
        `).all();

        const acceptHeader = request.headers.get('Accept') || '';
        if (acceptHeader.includes('application/json')) {
          return json({
            activeSubscriptions: activeSubCount,
            totalSubscriptionsEver: totalSubCount,
            notificationsAttempted: sendsAttempted,
            pushServiceAccepted: sendsAccepted,
            pushServiceExpired: sendsExpired,
            notificationClicks: totalClicks,
            clickThroughRatePercent: ctr,
            dailyHistory: dailyHistory.results
          });
        }

        // Render clean, secure HTML dashboard
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jesus Calling - Web Push Notification Analytics</title>
  <style>
    :root {
      --bg: #fdfbf7; --surface: #ffffff; --border: #e6ded2; --text: #23201c;
      --text-muted: #6b645b; --accent: #9a7432; --success: #2e6930; --danger: #a82323;
    }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 2rem 1rem; }
    .container { max-width: 960px; margin: 0 auto; }
    header { border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: baseline; }
    h1 { font-family: Georgia, serif; font-size: 1.8rem; margin: 0; color: var(--text); }
    .badge { background: #fbf5e9; color: var(--accent); padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; border: 1px solid #e2d1b6; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .card-label { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .card-val { font-size: 2rem; font-weight: 700; color: var(--text); }
    .card-note { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem; line-height: 1.3; }
    table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-top: 1rem; }
    th, td { padding: 0.75rem 1rem; text-align: left; font-size: 0.9rem; border-bottom: 1px solid var(--border); }
    th { background: #f9f5ed; color: var(--text-muted); font-weight: 600; }
    .notice { background: #f4eedf; border: 1px solid #decbb0; border-radius: 6px; padding: 0.85rem 1rem; font-size: 0.85rem; color: #4e3b1c; line-height: 1.5; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Jesus Calling &mdash; Push Reporting</h1>
      <span class="badge">Live Edge Analytics</span>
    </header>

    <div class="notice">
      <strong>Important Delivery Distinction:</strong> Push Service Responses confirm that the push gateway (e.g. Mozilla Autopush, Google FCM, Apple APNs) accepted the payload for delivery. They do not confirm immediate screen display if the user device was offline or asleep. CTR is computed as <code>(Recorded Clicks / Push Gateway Accepted Sends) &times; 100</code>.
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">Active Subscribers</div>
        <div class="card-val">${activeSubCount}</div>
        <div class="card-note">Total registered: ${totalSubCount}</div>
      </div>
      <div class="card">
        <div class="card-label">Push Dispatches</div>
        <div class="card-val">${sendsAccepted}</div>
        <div class="card-note">Accepted by push service (Attempts: ${sendsAttempted})</div>
      </div>
      <div class="card">
        <div class="card-label">Notification Clicks</div>
        <div class="card-val">${totalClicks}</div>
        <div class="card-note">Confirmed devotional visits</div>
      </div>
      <div class="card">
        <div class="card-label">Click-Through Rate</div>
        <div class="card-val">${ctr}%</div>
        <div class="card-note">Clicks per accepted push</div>
      </div>
    </div>

    <h2>Daily Performance History</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Devotional</th>
          <th>Attempted</th>
          <th>Accepted</th>
          <th>Expired (410/404)</th>
          <th>Clicks</th>
          <th>CTR</th>
        </tr>
      </thead>
      <tbody>
        ${(dailyHistory.results || []).length === 0 ? '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #888;">No notification dispatches recorded yet.</td></tr>' : ''}
        ${(dailyHistory.results || []).map(row => {
          const rowCtr = row.accepted > 0 ? ((row.clicks / row.accepted) * 100).toFixed(1) + '%' : '0%';
          return `<tr>
            <td><strong>${row.devotional_date}</strong></td>
            <td>${row.devotional_title || 'N/A'}</td>
            <td>${row.attempted}</td>
            <td style="color: var(--success); font-weight:600;">${row.accepted}</td>
            <td style="color: var(--danger);">${row.expired}</td>
            <td><strong>${row.clicks}</strong></td>
            <td>${rowCtr}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      // ----------------------------------------------------------------------
      // 5. POST /api/test-send - Safe Dry-run / Single Test Dispatch
      // ----------------------------------------------------------------------
      if (url.pathname === '/api/test-send' && request.method === 'POST') {
        if (!verifyAdminAuth(request, env)) {
          return json({ success: false, error: 'Unauthorized' }, 401);
        }

        const body = await request.json().catch(() => ({}));
        const targetEndpoint = body.endpoint;

        let sub;
        if (targetEndpoint) {
          sub = await env.DB.prepare(`SELECT * FROM subscriptions WHERE endpoint = ?`).bind(targetEndpoint).first();
        } else {
          sub = await env.DB.prepare(`SELECT * FROM subscriptions WHERE active = 1 ORDER BY updated_at DESC LIMIT 1`).first();
        }

        if (!sub) {
          return json({ success: false, error: 'No subscription found to test' }, 404);
        }

        const testPayload = {
          title: 'Jesus Calling Daily Devotional',
          body: 'Test Notification: "Trust in the Lord with all your heart." Start your morning in God\'s peace.',
          icon: 'https://biblecalling.github.io/assets/images/favicon-96x96.png',
          badge: 'https://biblecalling.github.io/assets/images/favicon-48x48.png',
          data: {
            url: 'https://biblecalling.github.io/',
            date: new Date().toISOString().split('T')[0],
            subscriptionHash: sub.id.substring(0, 12),
            trackingEndpoint: `${url.origin}/api/track-click`
          }
        };

        const result = await sendWebPushNotification({
          subscription: sub,
          payload: testPayload,
          vapidPublicKey: env.VAPID_PUBLIC_KEY,
          vapidPrivateKey: env.VAPID_PRIVATE_KEY,
          vapidSubject: env.VAPID_SUBJECT || 'mailto:contact@jesuscalling.github.io'
        });

        return json({
          success: result.ok,
          httpStatus: result.status,
          statusText: result.statusText,
          recipientId: sub.id.substring(0, 12)
        });
      }

      return json({ error: 'Not Found' }, 404);
    } catch (err) {
      return json({ success: false, error: err.message || 'Internal Server Error' }, 500);
    }
  },

  // --------------------------------------------------------------------------
  // Scheduled Cron Trigger Handler (Hourly at 0 * * * *)
  // --------------------------------------------------------------------------
  async scheduled(event, env, ctx) {
    // 1. Safety check: Check if production sends are explicitly activated
    if (env.ENABLE_PRODUCTION_CRON !== 'true') {
      console.log('Safe test mode: production cron skipped. Set ENABLE_PRODUCTION_CRON="true" to enable daily sends.');
      return;
    }

    const now = new Date();

    // 2. Fetch published devotional feed from Jekyll site
    const feedUrl = env.DEVOTIONAL_FEED_URL || 'https://biblecalling.github.io/daily-devotional.json';
    let devotionals = [];
    try {
      const feedRes = await fetch(feedUrl);
      if (feedRes.ok) {
        devotionals = await feedRes.json();
      }
    } catch (e) {
      console.error('Failed to fetch devotional feed:', e);
      return;
    }

    if (!Array.isArray(devotionals) || devotionals.length === 0) {
      console.warn('Devotional feed is empty or invalid. Skipping push.');
      return;
    }

    // 3. Query all distinct active timezones
    const distinctTzs = await env.DB.prepare(
      `SELECT DISTINCT timezone FROM subscriptions WHERE active = 1`
    ).all();

    for (const row of (distinctTzs.results || [])) {
      const tz = row.timezone;

      // Check if current hour in this timezone is 8:00 AM
      if (!is8AMInTimezone(tz, now)) {
        continue;
      }

      // Determine local calendar date in this timezone (YYYY-MM-DD)
      const localDate = getLocalDateString(tz, now);

      // Find published devotional matching localDate
      const todaysDevotional = devotionals.find(d => d.date === localDate);
      if (!todaysDevotional) {
        console.log(`No published devotional for date ${localDate} in timezone ${tz}. Skipping.`);
        continue;
      }

      // 4. Fetch all active subscriptions in this timezone that have NOT received this date yet
      const eligibleSubs = await env.DB.prepare(`
        SELECT s.*
        FROM subscriptions s
        LEFT JOIN notification_logs n
          ON s.id = n.subscription_id AND n.devotional_date = ?
        WHERE s.active = 1
          AND s.timezone = ?
          AND n.id IS NULL
      `).bind(localDate, tz).all();

      for (const sub of (eligibleSubs.results || [])) {
        const payload = {
          title: 'Jesus Calling Daily Devotional',
          body: `${todaysDevotional.title}\n${todaysDevotional.excerpt}`,
          icon: 'https://biblecalling.github.io/assets/images/favicon-96x96.png',
          badge: 'https://biblecalling.github.io/assets/images/favicon-48x48.png',
          data: {
            url: todaysDevotional.url,
            date: localDate,
            subscriptionHash: sub.id.substring(0, 12),
            trackingEndpoint: 'https://jesuscalling-push.your-subdomain.workers.dev/api/track-click'
          }
        };

        try {
          const result = await sendWebPushNotification({
            subscription: sub,
            payload,
            vapidPublicKey: env.VAPID_PUBLIC_KEY,
            vapidPrivateKey: env.VAPID_PRIVATE_KEY,
            vapidSubject: env.VAPID_SUBJECT || 'mailto:contact@jesuscalling.github.io'
          });

          // Check if subscription has expired on push service (404 Not Found or 410 Gone)
          const isExpired = result.status === 404 || result.status === 410;
          if (isExpired) {
            await env.DB.prepare(`UPDATE subscriptions SET active = 0, updated_at = datetime('now') WHERE id = ?`).bind(sub.id).run();
          }

          const deliveryStatus = result.ok ? 'sent_to_gateway' : (isExpired ? 'expired_unregistered' : 'gateway_error');

          // Record in notification_logs (enforces UNIQUE constraint against duplicate sends)
          await env.DB.prepare(`
            INSERT INTO notification_logs (subscription_id, devotional_date, devotional_title, devotional_url, http_status, delivery_status, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(sub.id, localDate, todaysDevotional.title, todaysDevotional.url, result.status, deliveryStatus).run();

        } catch (pushErr) {
          console.error(`Failed to dispatch push to sub ${sub.id}:`, pushErr);
        }
      }
    }
  }
};
