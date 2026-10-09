-- ============================================================================
-- Jesus Calling - Web Push Notification System
-- Cloudflare D1 Database Schema
-- ============================================================================

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,                       -- SHA-256 hash of endpoint
  endpoint TEXT NOT NULL UNIQUE,             -- Browser push service endpoint URL
  p256dh TEXT NOT NULL,                      -- Client P-256 public key (base64url)
  auth TEXT NOT NULL,                        -- Client auth secret (base64url)
  timezone TEXT NOT NULL DEFAULT 'UTC',      -- Validated IANA timezone identifier
  active INTEGER NOT NULL DEFAULT 1,         -- 1 = active, 0 = unsubscribed/expired
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_active_tz ON subscriptions (active, timezone);

-- 2. Notification Delivery Logs Table
-- Enforces: At most ONE notification per subscriber per devotional date
CREATE TABLE IF NOT EXISTS notification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT NOT NULL,             -- References subscriptions(id)
  devotional_date TEXT NOT NULL,             -- YYYY-MM-DD
  devotional_title TEXT NOT NULL,
  devotional_url TEXT NOT NULL,
  http_status INTEGER,                       -- Push service response code (e.g. 201, 410, 404, 500)
  delivery_status TEXT NOT NULL,             -- 'sent_to_gateway', 'expired_unregistered', 'gateway_error'
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subscription_id, devotional_date)   -- Strict duplicate prevention constraint
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_date ON notification_logs (devotional_date);

-- 3. Click Tracking Logs Table
CREATE TABLE IF NOT EXISTS click_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  devotional_date TEXT NOT NULL,             -- YYYY-MM-DD
  subscription_hash TEXT,                    -- Anonymized prefix of subscription ID
  target_url TEXT NOT NULL,
  click_token TEXT UNIQUE,                   -- Deduplication token (hash_date_minute)
  clicked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_click_logs_date ON click_logs (devotional_date);
