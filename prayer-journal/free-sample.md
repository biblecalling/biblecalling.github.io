---
layout: page
title: "Free 7-Day Prayer Journal Sample (PDF)"
h1: "Free 7-Day Prayer Journal Sample"
breadcrumb_title: "Free Sample"
description: "Try the first 7 days of our fillable prayer and quiet time journal free. Scripture, reflection, prayer and writing space for a week."
permalink: /prayer-journal/free-sample/
exact_title: true
hide_lead: true
noindex: true
sitemap: false
---

Try the first week of the 30-day journal and see if it fits your morning routine. Each day has a short Scripture passage, a reflection, a prayer, three questions and room to write.

## What You Get

- The welcome page and how-to page
- Days 1 to 7 of the journal
- Fillable writing spaces you can type in or print

{% assign has_signup = false %}
{% if site.data.journal.signup_embed_html and site.data.journal.signup_embed_html != "" %}
  {% assign has_signup = true %}
{% endif %}

{% assign has_sample_pdf = false %}
{% if site.data.journal.sample_pdf_url and site.data.journal.sample_pdf_url != "" %}
  {% assign has_sample_pdf = true %}
{% endif %}

{% if has_signup and has_sample_pdf %}
<div class="jf-sample-box">
  <div class="jf-embed-wrap">
    {{ site.data.journal.signup_embed_html }}
  </div>
  <p class="jf-privacy-note">We will email you the sample and occasional devotional updates. Unsubscribe any time. See our <a href="{{ '/privacy-policy/' | relative_url }}">privacy policy</a>.</p>
  <p class="jf-sample-direct-line">Prefer not to share your email? <a href="{{ site.data.journal.sample_pdf_url | relative_url }}">Download directly</a></p>
</div>
{% elsif has_signup %}
<div class="jf-sample-box">
  <div class="jf-embed-wrap">
    {{ site.data.journal.signup_embed_html }}
  </div>
  <p class="jf-privacy-note">We will email you the sample and occasional devotional updates. Unsubscribe any time. See our <a href="{{ '/privacy-policy/' | relative_url }}">privacy policy</a>.</p>
</div>
{% elsif has_sample_pdf %}
<div class="jf-sample-box">
  <a href="{{ site.data.journal.sample_pdf_url | relative_url }}" class="btn btn-primary jf-btn-primary">Download the free sample (PDF)</a>
</div>
{% else %}
<p class="jf-sample-coming-soon">The free sample is coming soon.</p>
{% endif %}

## What You Will Not Find Here

This is a sample of the first week only. The full journal has all 30 days, weekly reflections, prayer and answered-prayer trackers, and a blank daily page.

{% if site.data.journal.buy_url_primary and site.data.journal.buy_url_primary != "" or site.data.journal.buy_url_secondary and site.data.journal.buy_url_secondary != "" %}
<div class="jf-ready-box">
  <h3>Ready for all 30 days?</h3>
  <div class="jf-btn-group">
    {% if site.data.journal.buy_url_primary and site.data.journal.buy_url_primary != "" %}
      <a href="{{ site.data.journal.buy_url_primary }}" rel="noopener" class="btn btn-primary jf-btn-primary">
        <span>{{ site.data.journal.buy_label_primary | default: "Get the journal" }}</span>
        {% if site.data.journal.price_display and site.data.journal.price_display != "" %}
          <span class="jf-price-tag">{{ site.data.journal.price_display }}</span>
        {% endif %}
      </a>
    {% endif %}
    {% if site.data.journal.buy_url_secondary and site.data.journal.buy_url_secondary != "" %}
      <a href="{{ site.data.journal.buy_url_secondary }}" rel="noopener" class="btn btn-secondary jf-btn-secondary">
        <span>{{ site.data.journal.buy_label_secondary | default: "Buy on our store" }}</span>
      </a>
    {% endif %}
  </div>
</div>
{% else %}
<p><a href="{{ '/prayer-journal/' | relative_url }}">See what is in the full journal</a></p>
{% endif %}

## Frequently Asked Questions

### Is the sample really free?
Yes. There is no cost for the 7-day sample.

### Do I need an account?
No account is needed.{% if site.data.journal.signup_embed_html and site.data.journal.signup_embed_html != "" %} Enter your email in the form above to receive the sample and occasional devotional updates. You can unsubscribe at any time.{% endif %}

### Can I share the sample?
It is for your personal use. Please send friends to this page so they can get their own copy.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "@id": "{{ site.url }}{{ site.baseurl }}/prayer-journal/free-sample/#breadcrumb",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "{{ site.url }}{{ site.baseurl }}/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Prayer Journal",
          "item": "{{ site.url }}{{ site.baseurl }}/prayer-journal/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Free Sample",
          "item": "{{ site.url }}{{ site.baseurl }}/prayer-journal/free-sample/"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "{{ site.url }}{{ site.baseurl }}/prayer-journal/free-sample/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is the sample really free?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. There is no cost for the 7-day sample."
          }
        },
        {
          "@type": "Question",
          "name": "Do I need an account?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No account is needed.{% if site.data.journal.signup_embed_html and site.data.journal.signup_embed_html != "" %} Enter your email in the form above to receive the sample and occasional devotional updates. You can unsubscribe at any time.{% endif %}"
          }
        },
        {
          "@type": "Question",
          "name": "Can I share the sample?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is for your personal use. Please send friends to this page so they can get their own copy."
          }
        }
      ]
    }
  ]
}
</script>
