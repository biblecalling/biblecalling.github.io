# Jesus Calling - Comment System & User Accounts Setup Guide

This guide explains how the secure user account and commenting architecture works on this static Jekyll / GitHub Pages website, and provides step-by-step instructions to connect your Supabase backend.

> **CRITICAL SETUP SCOPE CLARIFICATION:**
> - **Future Blog Posts:** Requires **ZERO manual setup** or code changes. Every new article added to `_posts/` automatically inherits the responsive comment section, authentication modals, and reply threading via `_layouts/post.html`.
> - **Initial Backend Setup:** Requires a **ONE-TIME manual configuration** in your Supabase Dashboard and Google Cloud Console following the steps below.

---

## 1. Selected Architecture: Supabase (Auth + PostgreSQL)

### Why Supabase was Selected
- **Static GitHub Pages Compatible:** Runs 100% client-side with no server-side PHP, Node.js, or WordPress.
- **Enterprise-Grade Security:** Enforces security using **PostgreSQL Row-Level Security (RLS)** and database-level security triggers. Even though the API key (`anon_key`) is public in the browser, users can only read approved comments and can only edit or delete their own content.
- **Integrated Authentication:** Native support for **Google OAuth** (one-click sign-in), **Email/Password** registration, email verification, and password reset.
- **Email Confidentiality:** User emails are strictly kept in the private `auth.users` table and are **never** queried, stored in comments, or exposed to visitors.
- **Zero-Maintenance Moderation:** Built-in web dashboard allows the blog owner to approve, reject, filter, or delete comments with a single click.
- **Generous Free Tier:** Up to 50,000 monthly active users and 500 MB database storage at zero cost.

---

## 2. Step-by-Step Setup Instructions

### Step 2.1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New Project**.
3. Enter project details:
   - **Name:** `jesus-calling-blog`
   - **Database Password:** (Choose a secure password and save it)
   - **Region:** Choose the region closest to your primary audience.
4. Click **Create new project** and wait 1–2 minutes for provisioning.

---

### Step 2.2: Create the Database Schema & Hardened Security Rules (RLS)
1. In your Supabase Dashboard, click on **SQL Editor** on the left menu.
2. Click **New query**.
3. Copy and paste the entire SQL script below, then click **Run**:

```sql
-- ============================================================================
-- 1. CREATE COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_url TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected', 'spam')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for high-performance post loading
CREATE INDEX IF NOT EXISTS idx_comments_post_url ON public.comments(post_url, status, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_rate_limit ON public.comments(user_id, created_at DESC);

-- ============================================================================
-- 2. CREATE COMMENT REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- 3. HARDENED SECURITY TRIGGERS (DATABASE-LEVEL ENFORCEMENT)
-- ============================================================================

-- Function A: Enforce author identity, pre-moderation status & rate limiting on INSERT
CREATE OR REPLACE FUNCTION public.enforce_comment_security_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Identity Spoofing Protection: Force user_id to match authenticated caller
  NEW.user_id := auth.uid();
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to post reflections.' USING ERRCODE = '42501';
  END IF;

  -- 2. Moderation Tampering Protection: Force pending status on creation
  NEW.status := 'pending';

  -- 3. Database-Level Rate Limiting: Prevent spam flooding (15-second cooldown)
  IF EXISTS (
    SELECT 1 FROM public.comments
    WHERE user_id = NEW.user_id
      AND created_at > (now() - INTERVAL '15 seconds')
  ) THEN
    RAISE EXCEPTION 'Please wait at least 15 seconds between posting reflections.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_comment_before_insert ON public.comments;
CREATE TRIGGER trg_comment_before_insert
BEFORE INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_comment_security_before_insert();


-- Function B: Enforce immutability of author, status and timestamps on UPDATE
CREATE OR REPLACE FUNCTION public.enforce_comment_security_before_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing comment author or post URL
  NEW.user_id := OLD.user_id;
  NEW.post_url := OLD.post_url;

  -- Prevent regular users from self-approving or altering moderation status
  NEW.status := OLD.status;

  -- Maintain creation time and update modification timestamp
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_comment_before_update ON public.comments;
CREATE TRIGGER trg_comment_before_update
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_comment_security_before_update();

-- ============================================================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- Comments Policies:
-- 1. Anyone (including unauthenticated visitors) can read approved comments.
--    Authors can also view their own pending comments while waiting for approval.
DROP POLICY IF EXISTS "Public read approved comments" ON public.comments;
CREATE POLICY "Public read approved comments"
ON public.comments FOR SELECT
USING (status = 'approved' OR (auth.uid() IS NOT NULL AND auth.uid() = user_id));

-- 2. Authenticated users can insert reflections.
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments"
ON public.comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 3. Users can update ONLY their own comments.
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments"
ON public.comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete ONLY their own comments.
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);

-- Comment Reports Policies:
-- 1. Anyone (anonymous or signed in) can submit a report.
DROP POLICY IF EXISTS "Anyone can submit a report" ON public.comment_reports;
CREATE POLICY "Anyone can submit a report"
ON public.comment_reports FOR INSERT
WITH CHECK (true);

-- 2. Reports table has NO SELECT, UPDATE, or DELETE policies for public/anon roles.
-- Reports can ONLY be accessed by the blog administrator in the Supabase Dashboard.
```

---

### Step 2.3: Configure Google OAuth
To allow visitors to click **Continue with Google**:
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Go to **APIs & Services** > **OAuth consent screen**:
   - User Type: **External**
   - App Name: `Jesus Calling`
   - User support email & Developer contact info: your email.
4. Go to **APIs & Services** > **Credentials**:
   - Click **Create Credentials** > **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Jesus Calling Web Client`.
   - Under **Authorized redirect URIs**, add your Supabase redirect URL:
     ```
     https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
     ```
     *(Find this exact URL in Supabase -> Authentication -> Providers -> Google)*
5. Click **Create** and copy the **Client ID** and **Client Secret**.
6. Back in your **Supabase Dashboard**:
   - Go to **Authentication** > **Providers** > **Google**.
   - Toggle **Enable Google provider**.
   - Paste the **Client ID** and **Client Secret**.
   - Click **Save**.

---

### Step 2.4: Configure Allowed Redirect URLs for GitHub Pages
1. In your **Supabase Dashboard**, go to **Authentication** > **URL Configuration**.
2. Set **Site URL** to:
   ```
   https://jesuscalling.github.io
   ```
3. Under **Redirect URLs**, add:
   ```
   https://jesuscalling.github.io/**
   http://localhost:4000/**
   ```
   *(The second URL allows you to test authentication locally during development)*
4. Under **Authentication** > **Providers** > **Email**:
   - Verify that **Enable Email provider** is turned ON.
   - Verify that **Confirm email** is enabled to prevent unverified accounts from posting.
5. Click **Save**.

---

### Step 2.5: Connect the Blog to Supabase
1. In Supabase, go to **Project Settings** (gear icon) > **API**.
2. Find:
   - **Project URL** (e.g. `https://abcdefghijklmnopqrst.supabase.co`)
   - **Project API keys** > `anon` `public` key (a long JWT string)
   > **SECURITY WARNING:** NEVER copy or commit the `service_role` key! Only use the `anon` `public` key.
3. Open `assets/js/supabase-config.js` in your website repository:
   ```javascript
   window.JESUS_CALLING_CONFIG = {
     supabaseUrl: "https://YOUR-ACTUAL-PROJECT-ID.supabase.co",
     supabaseAnonKey: "YOUR-ACTUAL-ANON-PUBLIC-KEY",
     autoApproveComments: false, // Pre-moderation enabled for initial launch
     maxCommentLength: 1000,
     cooldownSeconds: 15,
     maxReplyDepth: 2,
     siteUrl: window.location.origin
   };
   ```
4. Commit and push the change to GitHub:
   ```bash
   git add assets/js/supabase-config.js
   git commit -m "Configure live Supabase connection"
   git push origin main
   ```

---

## 3. How Moderation Works

### Pre-Moderation Workflow (Configured by Default)
1. A reader posts a reflection.
2. The reflection enters the database with `status: 'pending'` (enforced both in frontend config and PostgreSQL trigger).
3. The reader sees: *"Thank you for sharing! Your reflection is awaiting approval."*
4. The comment remains hidden from other visitors until an administrator reviews and approves it.

### Reviewing and Moderating Comments in Supabase Dashboard:
1. In your Supabase Dashboard, click **Table Editor** on the left menu.
2. Select the `comments` table.
3. **To approve a reflection:** double-click the `status` column cell and change `'pending'` to `'approved'`.
4. **To reject or remove:** change `status` to `'rejected'` or `'spam'`, or select the row and click **Delete row**.
5. **To view reported comments:** click the `comment_reports` table to review user-flagged reflections.

---

## 4. How to Disable Comments

- **Per Article:** In any post's front matter, add `comments: false`:
  ```markdown
  ---
  layout: post
  title: "A Quiet Reflection"
  comments: false
  ---
  ```
- **Site-Wide:** Remove `{% include comments.html %}` from `_layouts/post.html`.

---

## 5. Demonstration Mode (Fallback System)

Until live Supabase credentials are provided in `assets/js/supabase-config.js`:
- The blog operates safely in **Demonstration Mode**.
- Visitors can test sharing reflections, replying, and editing locally in browser storage.
- Neither the console nor layout will crash.

---

## 6. BEFORE GOING LIVE (Production Configuration Checklist)

Complete this checklist before announcing the comment system publicly:

- [ ] **Create Supabase project:** New project provisioned in desired region.
- [ ] **Run database SQL:** Executed complete SQL script from Step 2.2 in SQL Editor.
- [ ] **Enable Email authentication:** Verified Email provider is active in Supabase Auth.
- [ ] **Enable email confirmation:** Turned ON "Confirm email" to require email verification.
- [ ] **Configure Google OAuth:** Created Google Cloud credentials and added Client ID & Secret to Supabase.
- [ ] **Configure production redirect URL:** Added `https://<PROJECT-REF>.supabase.co/auth/v1/callback` to Google Console.
- [ ] **Add https://jesuscalling.github.io:** Set Site URL and Redirect URLs (`https://jesuscalling.github.io/**`) in Supabase URL Configuration.
- [ ] **Add correct Supabase URL:** Pasted project URL into `assets/js/supabase-config.js`.
- [ ] **Add public anon/publishable key:** Pasted `anon` `public` key into `assets/js/supabase-config.js`.
- [ ] **Confirm service-role key is NOT in frontend:** Verified `service_role` secret is nowhere in repository.
- [ ] **Enable RLS:** Confirmed RLS is enabled on `comments` and `comment_reports` tables.
- [ ] **Verify RLS policies:** Confirmed all 4 policies on `comments` and insert policy on `comment_reports` are active.
- [ ] **Set pre-moderation for initial launch:** Verified `autoApproveComments: false` in `assets/js/supabase-config.js` and DB trigger.
- [ ] **Test Google login:** Performed test sign-in with Google account on live site.
- [ ] **Test Email signup:** Created test account with email and password.
- [ ] **Test Email verification:** Verified confirmation email arrives and link confirms account.
- [ ] **Test password reset:** Verified "Forgot password?" sends reset email.
- [ ] **Test comment submission:** Posted test comment; confirmed it enters with `pending` status.
- [ ] **Test reply:** Tested nested reply functionality under an approved comment.
- [ ] **Test edit/delete:** Verified author can edit and delete own reflection, but cannot alter other users' comments.
- [ ] **Test report:** Submitted report on a comment; verified row appears in `comment_reports`.
- [ ] **Test moderation:** Approved a pending comment in Supabase Table Editor; confirmed it renders on page refresh.
- [ ] **Test mobile:** Checked 320px, 375px, 390px, and 414px viewports on mobile devices or Chrome DevTools.
- [ ] **Test production deployment:** Verified GitHub Pages build finishes green with no errors.
