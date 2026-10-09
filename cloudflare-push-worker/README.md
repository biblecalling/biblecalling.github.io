# Jesus Calling &mdash; Cloudflare Worker Web Push Backend

Custom, lightweight, privacy-focused Web Push notification system for [https://biblecalling.github.io/](https://biblecalling.github.io/).

---

## 1. Prerequisites

- A free [Cloudflare Account](https://dash.cloudflare.com/)
- [Node.js](https://nodejs.org/) (v18 or newer)
- Wrangler CLI installed globally or via npx (`npm install -g wrangler` or `npx wrangler`)

---

## 2. Step-by-Step Setup Instructions

### Step 1: Log in to Cloudflare
In your terminal, navigate to the worker directory:
```bash
cd "c:\Users\pintu kumar\Downloads\jesusCalling\cloudflare-push-worker"
npx wrangler login
```

### Step 2: Create Cloudflare D1 Database
Create the database:
```bash
npx wrangler d1 create jesuscalling-push-db
```
Wrangler will display the newly created database ID. Copy the `database_id` and paste it into `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "jesuscalling-push-db"
database_id = "YOUR_COPIED_DATABASE_ID_HERE"
```

### Step 3: Run Database Migrations
Initialize the tables (`subscriptions`, `notification_logs`, `click_logs`):
```bash
npx wrangler d1 execute jesuscalling-push-db --remote --file=./schema.sql
```

### Step 4: Generate VAPID Keys
Generate a cryptographically secure VAPID keypair:
```bash
npx web-push generate-vapid-keys
```
This command outputs:
```text
Public Key:  BEl62iXXXXXX...
Private Key: 5a71XXXXXX...
```

### Step 5: Store Environment Secrets in Cloudflare
Never commit private keys to Git. Run the following commands to store them securely in Cloudflare:

1. Store the Private VAPID key:
   ```bash
   npx wrangler secret put VAPID_PRIVATE_KEY
   ```
   *(Paste your generated Private Key when prompted)*

2. Store the Public VAPID key:
   ```bash
   npx wrangler secret put VAPID_PUBLIC_KEY
   ```
   *(Paste your generated Public Key when prompted)*

3. Store your Admin API Key / Dashboard Password:
   ```bash
   npx wrangler secret put ADMIN_API_KEY
   ```
   *(Choose a strong password for your analytics dashboard, e.g., `JesusCallingAdmin2026!`)*

### Step 6: Deploy the Cloudflare Worker
Deploy the worker to the Cloudflare Edge network:
```bash
npx wrangler deploy
```
Once deployed, Cloudflare will print your Worker URL:
`https://jesuscalling-push-worker.<your-subdomain>.workers.dev`

### Step 7: Update Website Frontend Configuration
Open `assets/js/push-config.js` in the main repository and insert your deployed Worker URL and Public Key:
```javascript
window.JESUS_CALLING_PUSH_CONFIG = {
  workerUrl: 'https://jesuscalling-push-worker.<your-subdomain>.workers.dev',
  vapidPublicKey: 'YOUR_GENERATED_PUBLIC_KEY',
  storageKey: 'jesuscalling_push_subscribed',
  timezoneKey: 'jesuscalling_push_timezone'
};
```
Commit and push the updated `push-config.js` to GitHub Pages.

---

## 3. How Scheduling & Timezones Work

1. **Hourly Cron Trigger (`0 * * * *`):**
   Every hour on the hour, Cloudflare Workers runs the `scheduled` event.
2. **Dynamic Timezone & DST Calculation:**
   Using native `Intl.DateTimeFormat(..., { timeZone: tz, hour: 'numeric' })`, the Worker checks which subscriber timezones have reached 8:00 AM local time.
   Because standard IANA timezone identifiers (e.g., `America/New_York`, `Europe/London`, `Asia/Kolkata`) are evaluated dynamically against UTC, **Daylight Saving Time (DST) shifts are automatically handled** with zero manual adjustments.
3. **Local Date Matching:**
   The Worker fetches `https://biblecalling.github.io/daily-devotional.json` to get the published devotional for that subscriber's local date (`YYYY-MM-DD`). If no devotional exists for that date, it safely skips sending.
4. **Strict Duplicate Prevention:**
   The `notification_logs` table has a `UNIQUE(subscription_id, devotional_date)` constraint. Each subscriber can receive **at most one** notification per devotional date.

---

## 4. Protected Reporting Dashboard

Visit your Worker URL at `/api/dashboard`:
`https://jesuscalling-push-worker.<your-subdomain>.workers.dev/api/dashboard`

When prompted for credentials:
- **Username:** `admin` (or any string)
- **Password:** The secret you configured for `ADMIN_API_KEY`

### Key Dashboard Metrics:
- **Active Subscribers:** Count of readers with active push registrations.
- **Push Dispatches:** Successful HTTP 200/201 responses from push services (Mozilla Autopush, Google FCM, Apple APNs).
- **Notification Clicks:** Number of confirmed visits initiated by clicking the push notification.
- **Click-Through Rate (CTR):** `(Recorded Clicks / Accepted Push Sends) * 100`.

---

## 5. Safe Testing & Production Activation

By default in `wrangler.toml`, `ENABLE_PRODUCTION_CRON = "false"` to prevent unwanted notifications during setup.

### To send a single test notification:
```bash
curl -X POST https://jesuscalling-push-worker.<your-subdomain>.workers.dev/api/test-send \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

### To enable live daily 8:00 AM notifications:
In `wrangler.toml`, set:
```toml
ENABLE_PRODUCTION_CRON = "true"
```
Then run:
```bash
npx wrangler deploy
```
