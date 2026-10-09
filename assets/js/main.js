/**
 * Jesus Calling - Clean, Accessible Vanilla JavaScript
 * Zero dependencies. Under 15KB. Built for maximum speed and Core Web Vitals.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Header scroll shadow
  const header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // 2. Mobile Drawer Navigation
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileClose = document.getElementById('mobile-close');
  const mobileBackdrop = document.getElementById('mobile-backdrop');

  function openMobileNav() {
    if (!mobileMenu || !mobileToggle) return;
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    mobileToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (mobileClose) mobileClose.focus();
  }

  function closeMobileNav() {
    if (!mobileMenu || !mobileToggle) return;
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    mobileToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    mobileToggle.focus();
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileMenu && mobileMenu.classList.contains('open');
      if (isOpen) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  if (mobileClose) {
    mobileClose.addEventListener('click', closeMobileNav);
  }

  if (mobileBackdrop) {
    mobileBackdrop.addEventListener('click', closeMobileNav);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('open')) {
      closeMobileNav();
    }
  });

  // Close drawer when any internal navigation link is tapped
  if (mobileMenu) {
    const navLinks = mobileMenu.querySelectorAll('.mobile-nav-list a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMobileNav();
      });
    });
  }

  // 3. Reading Progress Bar (Article pages)
  const progressBar = document.getElementById('reading-progress-bar');
  if (progressBar) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const docEl = document.documentElement;
          const scrollTop = window.scrollY || docEl.scrollTop;
          const scrollHeight = docEl.scrollHeight - docEl.clientHeight;
          const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
          progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // 4. Back to Top Button
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 5. Native Share & Copy Link Functionality
  const nativeShareBtn = document.getElementById('btn-native-share');
  const copyLinkBtn = document.getElementById('btn-copy-link');
  const copyToast = document.getElementById('copy-toast');

  function showToast(message) {
    if (!copyToast) return;
    if (message) copyToast.textContent = message;
    copyToast.classList.add('visible');
    setTimeout(() => {
      copyToast.classList.remove('visible');
    }, 2400);
  }

  if (nativeShareBtn) {
    nativeShareBtn.addEventListener('click', async () => {
      const title = document.title;
      const text = document.querySelector('meta[name="description"]')?.getAttribute('content') || title;
      const url = window.location.href;

      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
        } catch (err) {
          if (err.name !== 'AbortError') {
            copyToClipboard(url);
          }
        }
      } else {
        copyToClipboard(url);
      }
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Article link copied to clipboard!');
      }).catch(() => {
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
  }

  function fallbackCopyText(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      showToast('Article link copied to clipboard!');
    } catch (e) {
      showToast('Failed to copy link.');
    }
    document.body.removeChild(input);
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      copyToClipboard(window.location.href);
    });
  }

  // 6. Client-Side Search (Used on search.html)
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const searchStatus = document.getElementById('search-status');

  if (searchInput && searchResults) {
    let searchIndex = null;
    let isFetching = false;

    // Load search.json lazily when user interacts with input
    async function loadIndex() {
      if (searchIndex || isFetching) return;
      isFetching = true;
      if (searchStatus) searchStatus.textContent = 'Loading search index...';
      try {
        const baseUrl = searchInput.dataset.baseurl || '';
        const res = await fetch(`${baseUrl}/search.json`);
        if (!res.ok) throw new Error('Search index not found');
        searchIndex = await res.json();
        if (searchStatus) searchStatus.textContent = `Type to search across ${searchIndex.length} articles...`;
      } catch (err) {
        if (searchStatus) searchStatus.textContent = 'Unable to load search index.';
      } finally {
        isFetching = false;
      }
    }

    function runSearch(query) {
      if (!searchIndex) return;
      const q = query.trim().toLowerCase();
      if (!q) {
        searchResults.innerHTML = '';
        if (searchStatus) searchStatus.textContent = `Search through our ${searchIndex.length} articles...`;
        return;
      }

      const queryTerms = q.split(/\s+/).filter(Boolean);
      const matches = searchIndex.filter(item => {
        const title = (item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const excerpt = (item.excerpt || '').toLowerCase();
        const content = (item.content || '').toLowerCase();
        const tags = (item.tags || []).join(' ').toLowerCase();
        const categories = Array.isArray(item.categories)
          ? item.categories.join(' ').toLowerCase()
          : (item.category || '').toLowerCase();
        const combined = `${title} ${description} ${excerpt} ${content} ${tags} ${categories}`;

        return queryTerms.every(term => combined.includes(term));
      });

      if (searchStatus) {
        searchStatus.textContent = `Found ${matches.length} reflection${matches.length === 1 ? '' : 's'} matching "${query}"`;
      }

      if (matches.length === 0) {
        searchResults.innerHTML = `
          <div class="empty-state">
            <p>No reflections found matching "<strong>${escapeHtml(query)}</strong>".</p>
            <p>Try searching for words like <em>peace, prayer, worry, faith, strength,</em> or <em>love</em>.</p>
          </div>
        `;
        return;
      }

      searchResults.innerHTML = matches.map(item => `
        <article class="search-result-item">
          <span class="search-result-category">${escapeHtml(item.category || 'Article')}</span>
          <h2 class="search-result-title"><a href="${item.url}">${escapeHtml(item.title)}</a></h2>
          <p class="search-result-excerpt">${escapeHtml(item.excerpt || '')}</p>
          <time class="search-result-date">${escapeHtml(item.date || '')}</time>
        </article>
      `).join('');
    }

    function escapeHtml(str) {
      return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag));
    }

    searchInput.addEventListener('focus', loadIndex);
    searchInput.addEventListener('input', (e) => {
      if (!searchIndex) {
        loadIndex().then(() => runSearch(e.target.value));
      } else {
        runSearch(e.target.value);
      }
    });

    // Handle URL ?q= parameter if user arrives from header search link
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');
    if (initialQuery) {
      searchInput.value = initialQuery;
      loadIndex().then(() => runSearch(initialQuery));
    }
  }

  // 5. Newsletter Subscription AJAX Handler
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    const emailInput = document.getElementById('newsletter-email');
    const feedbackBox = document.getElementById('newsletter-feedback');
    const submitBtn = newsletterForm.querySelector('button[type="submit"]');
    const submitBtnText = submitBtn ? (submitBtn.querySelector('.btn-text') || submitBtn.querySelector('span')) : null;
    const originalBtnText = submitBtnText ? submitBtnText.textContent : 'Subscribe';

    function setFeedback(message, type) {
      if (!feedbackBox) return;
      feedbackBox.className = 'newsletter-feedback';
      if (type) {
        feedbackBox.classList.add(`is-${type}`);
      }
      feedbackBox.textContent = message;
      feedbackBox.style.display = message ? 'block' : 'none';
    }

    function isValidEmail(email) {
      const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      return re.test(String(email).trim());
    }

    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setFeedback('', '');

      const email = emailInput ? emailInput.value.trim() : '';

      // Validate email address
      if (!email || !isValidEmail(email)) {
        setFeedback('Please enter a valid email address (e.g. name@example.com).', 'error');
        if (emailInput) emailInput.focus();
        return;
      }

      // Check anti-spam honeypots
      const honeypot = newsletterForm.querySelector('input[name="b_hp_check"]');
      const gotcha = newsletterForm.querySelector('input[name="_gotcha"]');
      if ((honeypot && honeypot.value) || (gotcha && gotcha.value)) {
        setFeedback('✓ Thank you for subscribing! Blessings on your journey.', 'success');
        newsletterForm.reset();
        return;
      }

      // Set loading state
      if (submitBtn) submitBtn.disabled = true;
      if (submitBtnText) submitBtnText.textContent = 'Subscribing...';
      setFeedback('Subscribing, please wait a moment...', 'loading');

      try {
        const formData = new FormData(newsletterForm);
        const actionUrl = newsletterForm.getAttribute('action') || 'https://formspree.io/f/xjygyjeq';

        const response = await fetch(actionUrl, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          setFeedback('✓ Thank you for subscribing! You will receive our daily devotional reflections and biblical encouragement in your inbox.', 'success');
          newsletterForm.reset();
        } else {
          let errorMsg = 'Oops! There was a problem submitting your subscription. Please try again.';
          try {
            const data = await response.json();
            if (data && data.errors && data.errors.length) {
              errorMsg = data.errors.map(err => err.message).join(', ');
            }
          } catch (_) {}
          setFeedback(errorMsg, 'error');
        }
      } catch (err) {
        setFeedback('Network error. Please check your internet connection and try again.', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitBtnText) submitBtnText.textContent = originalBtnText;
      }
    });

    if (emailInput) {
      emailInput.addEventListener('input', () => {
        if (feedbackBox && feedbackBox.classList.contains('is-error')) {
          setFeedback('', '');
        }
      });
    }
  }
});
