---
layout: page
title: "30-Day Prayer & Quiet Time Journal: Fillable PDF for Daily Prayer"
h1: "30 Days of Prayer & Quiet Time with Jesus"
breadcrumb_title: "Prayer Journal"
description: "A 46-page fillable prayer journal with 30 days of Scripture, reflection, prayer and writing space. US Letter and A4 PDF for print or on-screen use."
permalink: /prayer-journal/
exact_title: true
hide_lead: true
---

A simple, fillable Christian prayer journal for slowing down, reading Scripture and talking with God for about ten minutes a day.

{% if site.data.journal.cover_image and site.data.journal.cover_image != "" %}
<div class="jf-cover-wrap">
  <img src="{{ site.data.journal.cover_image | relative_url }}" alt="Cover of the 30 Days of Prayer and Quiet Time with Jesus journal" class="jf-cover-img" width="480" height="620">
</div>
{% endif %}

<div class="jf-cta-block">
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
  <p class="jf-sample-link-wrap">
    <a href="{{ '/prayer-journal/free-sample/' | relative_url }}" class="jf-sample-link">Try the free 7-day sample first &rarr;</a>
  </p>
  <p class="jf-micro-notice">Digital PDF download. No physical item is shipped.</p>
</div>

## What Each Day Includes

- A short passage of Scripture (King James Version)
- A brief original reflection
- A prayer you can pray as written or make your own
- Three questions to consider
- Space to write your own prayer, what you are thankful for and what you want to remember

## What Is Inside the Journal

- 30 daily pages with Scripture, reflection, prayer and questions
- 4 weekly reflection pages
- A "30 days at a glance" page with checkboxes
- 2 Prayer Requests pages and 2 Answered Prayers pages
- A looking-back page with a closing prayer
- A blank daily page you can print again and again
- A notes page
- Clickable bookmarks to jump to any day
- Both US Letter and A4 sizes in one download

## Print It or Type It

Every writing space and checkbox is fillable. Type directly in a PDF app and save your progress, or print the pages (choose "Actual size" or 100%) and write by hand. Pages are undated, so you can start on any day and go at your own pace.

{% if site.data.journal.sample_images and site.data.journal.sample_images.size > 0 %}
## A Look Inside

<div class="jf-gallery-grid">
  {% for img_path in site.data.journal.sample_images %}
    <figure class="jf-gallery-item">
      <img src="{{ img_path | relative_url }}" alt="Page preview from the 30 Days of Prayer and Quiet Time journal" loading="lazy" class="jf-gallery-img">
    </figure>
  {% endfor %}
</div>
{% endif %}

## Who It Is For

- Anyone who wants a simple way to begin a daily prayer habit
- Readers who find long Bible studies hard to keep up with
- People who like to write out their prayers
- Small groups or friends who want to go through 30 days together (each person needs their own copy)

## How It Works

1. Download the PDF after purchase.
2. Print it or open it on your tablet, phone or computer.
3. Spend a few quiet minutes each day: read, reflect, pray and write.

## Frequently Asked Questions

### What format is the journal?
It is a PDF with fillable fields. You get US Letter and A4 versions.

### Can I type in it?
Yes. Most PDF apps let you type into the writing spaces and tick the checkboxes. Please save a copy as you go.

### Do I have to start on a certain day?
No. The pages are undated. Begin whenever you like and take as long as you need.

### Which Bible translation is used?
The King James Version, which is in the public domain in the United States. The reflections, prayers and questions are original.

### Can I share or resell the file?
The journal is for personal use only. Please do not share, resell or redistribute the file.

### Is this connected to another devotional book?
No. Bible Calling is an independent website, and this journal is not affiliated with, endorsed by or sponsored by any other devotional book, author or publisher.

{% if site.data.journal.refund_text and site.data.journal.refund_text != "" %}
### Refunds
{{ site.data.journal.refund_text }}
{% endif %}

{% if site.data.journal.support_url and site.data.journal.support_url != "" %}
<p><a href="{{ site.data.journal.support_url | relative_url }}">Questions? Contact us</a></p>
{% endif %}

If you would like to try before you buy, start with the [free 7-day sample](/prayer-journal/free-sample/).

<div class="jf-cta-block jf-cta-bottom">
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
  <p class="jf-sample-link-wrap">
    <a href="{{ '/prayer-journal/free-sample/' | relative_url }}" class="jf-sample-link">Try the free 7-day sample first &rarr;</a>
  </p>
  <p class="jf-micro-notice">Digital PDF download. No physical item is shipped.</p>
</div>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "{{ site.url }}{{ site.baseurl }}/prayer-journal/#webpage",
      "url": "{{ site.url }}{{ site.baseurl }}/prayer-journal/",
      "name": "30-Day Prayer & Quiet Time Journal: Fillable PDF for Daily Prayer",
      "description": "A 46-page fillable prayer journal with 30 days of Scripture, reflection, prayer and writing space. US Letter and A4 PDF for print or on-screen use."
    },
    {
      "@type": "BreadcrumbList",
      "@id": "{{ site.url }}{{ site.baseurl }}/prayer-journal/#breadcrumb",
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
        }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "{{ site.url }}{{ site.baseurl }}/prayer-journal/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What format is the journal?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is a PDF with fillable fields. You get US Letter and A4 versions."
          }
        },
        {
          "@type": "Question",
          "name": "Can I type in it?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Most PDF apps let you type into the writing spaces and tick the checkboxes. Please save a copy as you go."
          }
        },
        {
          "@type": "Question",
          "name": "Do I have to start on a certain day?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. The pages are undated. Begin whenever you like and take as long as you need."
          }
        },
        {
          "@type": "Question",
          "name": "Which Bible translation is used?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The King James Version, which is in the public domain in the United States. The reflections, prayers and questions are original."
          }
        },
        {
          "@type": "Question",
          "name": "Can I share or resell the file?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The journal is for personal use only. Please do not share, resell or redistribute the file."
          }
        },
        {
          "@type": "Question",
          "name": "Is this connected to another devotional book?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Bible Calling is an independent website, and this journal is not affiliated with, endorsed by or sponsored by any other devotional book, author or publisher."
          }
        }
      ]
    }{% if site.data.journal.buy_url_primary and site.data.journal.buy_url_primary != "" and site.data.journal.price_value and site.data.journal.price_value != "" and site.data.journal.currency and site.data.journal.currency != "" %},
    {
      "@type": "Product",
      "@id": "{{ site.url }}{{ site.baseurl }}/prayer-journal/#product",
      "name": {{ site.data.journal.name | jsonify }},
      "description": "A 46-page fillable prayer journal with 30 days of Scripture, reflection, prayer and writing space. US Letter and A4 PDF for print or on-screen use.",
      {% if site.data.journal.cover_image and site.data.journal.cover_image != "" %}
      "image": "{{ site.url }}{{ site.baseurl }}{{ site.data.journal.cover_image }}",
      {% endif %}
      "offers": {
        "@type": "Offer",
        "price": {{ site.data.journal.price_value | jsonify }},
        "priceCurrency": {{ site.data.journal.currency | jsonify }},
        "url": {{ site.data.journal.buy_url_primary | jsonify }},
        "availability": "https://schema.org/InStock"
      }
    }{% endif %}
  ]
}
</script>
