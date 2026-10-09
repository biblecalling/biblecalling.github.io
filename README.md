# Jesus Calling

A production-ready, high-performance Christian editorial blog website built with Jekyll, HTML5, CSS3, and Vanilla JavaScript, designed specifically for deployment on **GitHub Pages** at [https://jesuscalling.github.io/](https://jesuscalling.github.io/).

---

## 🌟 Highlights & Philosophy

- **Zero Heavy Frameworks:** Pure semantic HTML5, Vanilla CSS design system, and Vanilla JavaScript (< 15 KB).
- **Secure Community Comments & User Accounts:** Secure Google OAuth + Email authentication, database Row-Level Security (RLS), nested replies, and moderation via Supabase, with zero impact on initial page load (lazy-loaded). See [COMMENT_SYSTEM_SETUP.md](COMMENT_SYSTEM_SETUP.md).
- **Core Web Vitals Optimized:** Zero external web fonts (using system fonts for 100/100 performance), zero render-blocking scripts, explicit image width/height to prevent Cumulative Layout Shift (CLS), and deferred lightweight JS.
- **Scalable Architecture:** Designed from day one to smoothly scale from 20 to 100, 500, and 1,000+ posts using Jekyll's static generation and paginated archives (`/blog/`).
- **Comprehensive SEO & Structured Data:** Automatic JSON-LD schemas (`WebSite`, `Organization`, `BlogPosting`, `BreadcrumbList`), self-referencing canonical URLs, Open Graph, Twitter Cards, dynamic `sitemap.xml`, and `feed.xml`.
- **Accessible & Mobile-First:** Semantic markup, skip-to-content navigation, accessible mobile drawer with keyboard trap and Esc key support, ARIA landmarks, and touch-friendly targets.

---

## 📁 Project Architecture

```
jesuscalling.github.io/
├── _config.yml                    # Site configuration, permalinks, pagination, metadata
├── _posts/                        # 21 original, in-depth Christian articles (.md)
│   ├── 2026-09-15-what-jesus-teaches-us-about-worry.md
│   ├── 2026-09-16-bible-verses-about-gods-love.md
│   ├── ...
│   └── 2026-10-07-how-to-trust-god.md
├── _layouts/
│   ├── default.html               # Main outer shell
│   ├── home.html                  # Editorial homepage with Hero, Featured & Latest
│   ├── post.html                  # Single article layout with breadcrumbs, schema & related posts
│   ├── page.html                  # Standard page layout
│   └── category.html              # Dynamic category archive layout
├── _includes/
│   ├── head.html                  # SEO, Open Graph, Twitter Card, JSON-LD, RSS link
│   ├── header.html                # Responsive desktop & mobile header with navigation
│   ├── footer.html                # Peaceful footer with Scripture, navigation, & copyright
│   ├── breadcrumbs.html           # Accessible breadcrumb trail
│   ├── post-card.html             # Reusable article card component
│   ├── related-posts.html         # Smart category-matching related posts
│   ├── share-buttons.html         # Native Web Share API + Copy link + Socials
│   └── pagination.html            # Static pagination controls
├── assets/
│   ├── css/
│   │   └── style.css              # Custom Vanilla CSS design system
│   ├── js/
│   │   └── main.js                # Vanilla JS (mobile drawer, search, share, progress bar)
│   └── images/                    # WebP article and site imagery
├── categories/                    # Clean category archives
│   ├── jesus.html                 # /categories/jesus/
│   ├── bible.html                 # /categories/bible/
│   ├── prayer.html                # /categories/prayer/
│   ├── faith.html                 # /categories/faith/
│   ├── devotionals.html           # /categories/devotionals/
│   └── christian-life.html        # /categories/christian-life/
├── blog/
│   └── index.html                 # Complete paginated blog archive (/blog/)
├── index.html                     # Homepage
├── about.html                     # Mission and editorial philosophy
├── bible.html                     # Bible study & Scripture guide
├── prayer.html                    # Prayer guide & prayer lists
├── devotionals.html               # Daily quiet time guide
├── categories.html                # Visual category directory
├── search.html                    # Instant client-side search interface
├── search.json                    # Lightweight search index
├── privacy-policy.html            # Static site privacy policy
├── terms.html                     # Terms of use
├── contact.html                   # Contact & prayer requests
├── 404.html                       # Custom 404 page
├── robots.txt                     # Crawler directives & sitemap location
├── sitemap.xml                    # XML sitemap
└── feed.xml                       # RSS 2.0 / Atom feed
```

---

## ✍️ How to Add a New Post

Adding an article requires **only creating a Markdown file in `_posts/`**. Jekyll automatically handles everything else (homepage list, category listing, related posts, sitemap, RSS feed, schema, reading time, and permalink).

1. Create a file named `_posts/YYYY-MM-DD-your-slug.md`:
   ```markdown
   ---
   layout: post
   title: "October 8: Walking With God in Daily Life"
   permalink: /jesus-calling-october-8/
   description: "A short, engaging summary for search engines and social cards (140-160 chars)."
   date: 2026-10-08
   last_modified_at: 2026-10-08
   categories:
     - Jesus
     - Faith
     - Devotionals
   tags:
     - Trust God
     - Faith
     - Walking With God
   author: "Jesus Calling Editorial Team"
   featured: false
   image: "/assets/images/trust-god.webp"
   ---
   ```
   > **Note on Daily URLs:** Daily Jesus Calling posts use short, memorable permanent permalinks defined in front matter:
   > - October 6: `/jesus-calling-october-6/`
   > - October 7: `/jesus-calling-october-7/`
   > - October 8: `/jesus-calling-october-8/`
   > - etc.

   Your article content in standard Markdown...
   ```

2. Commit and push:
   ```bash
   git add _posts/
   git commit -m "Publish new reflection"
   git push origin main
   ```
   GitHub Pages builds and publishes the new article within 60 seconds.

---

## 🚀 Enabling GitHub Pages

1. Create a repository on GitHub named `jesuscalling.github.io` (or push this code to your existing repository).
2. Go to **Settings** > **Pages** in the GitHub repository.
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: `main` (or `master`), Folder: `/ (root)`
4. Click **Save**.
5. Your website will be live at `https://jesuscalling.github.io/`.
