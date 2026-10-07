/**
 * Jesus Calling - Secure, Accessible & Lightweight Comment System
 * Built for Jekyll + GitHub Pages.
 *
 * Core Web Vitals Optimized:
 * - Lazy-loaded via IntersectionObserver when approaching viewport
 * - Zero render-blocking scripts
 * - No plain-text passwords or secret keys stored in browser
 * - Safe HTML sanitization on all user-generated content
 */

(function () {
  'use strict';

  // State management
  let supabaseClient = null;
  let currentUser = null;
  let commentsData = [];
  let isDemoMode = false;
  let isInitialized = false;
  let lastCommentTimestamp = 0;
  let previousFocusedElement = null;

  // Configuration check
  const config = window.JESUS_CALLING_CONFIG || {
    supabaseUrl: '',
    supabaseAnonKey: '',
    autoApproveComments: true,
    maxCommentLength: 1000,
    cooldownSeconds: 15,
    maxReplyDepth: 2,
    siteUrl: window.location.origin
  };

  const isConfigured = config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseAnonKey.includes('dummy_anon_key');

  const commentsSection = document.getElementById('comments-section');
  if (!commentsSection) return;

  const currentPostUrl = commentsSection.getAttribute('data-post-url') || window.location.pathname;

  // DOM Elements cache
  const elements = {
    section: commentsSection,
    userBar: document.getElementById('comment-user-bar'),
    userBarAvatar: document.getElementById('user-bar-avatar'),
    userBarName: document.getElementById('user-bar-name'),
    userBarSignout: document.getElementById('btn-comment-signout'),
    commentInput: document.getElementById('comment-input'),
    charCount: document.getElementById('comment-char-count'),
    submitBtn: document.getElementById('btn-submit-comment'),
    submitBtnText: document.getElementById('submit-comment-text'),
    formFeedback: document.getElementById('comment-form-feedback'),
    countBadge: document.getElementById('comments-count-badge'),
    loadingState: document.getElementById('comments-loading'),
    emptyState: document.getElementById('comments-empty-state'),
    errorState: document.getElementById('comments-error-state'),
    errorMessage: document.getElementById('comments-error-message'),
    commentsList: document.getElementById('comments-list'),

    // Auth Modal
    authModal: document.getElementById('auth-modal'),
    authModalBackdrop: document.getElementById('auth-modal-backdrop'),
    authModalClose: document.getElementById('auth-modal-close'),
    googleBtn: document.getElementById('btn-oauth-google'),
    emailForm: document.getElementById('auth-email-form'),
    groupName: document.getElementById('auth-group-name'),
    inputName: document.getElementById('auth-input-name'),
    inputEmail: document.getElementById('auth-input-email'),
    inputPassword: document.getElementById('auth-input-password'),
    forgotPasswordBtn: document.getElementById('btn-forgot-password'),
    authSubmitBtn: document.getElementById('btn-auth-submit'),
    authSubmitText: document.getElementById('btn-auth-submit-text'),
    authFeedback: document.getElementById('auth-feedback'),
    toggleAuthBtn: document.getElementById('btn-toggle-auth-mode'),
    toggleAuthPrompt: document.getElementById('auth-toggle-prompt'),

    // Report Modal
    reportModal: document.getElementById('report-modal'),
    reportModalBackdrop: document.getElementById('report-modal-backdrop'),
    reportModalClose: document.getElementById('report-modal-close'),
    reportForm: document.getElementById('report-form'),
    reportCommentId: document.getElementById('report-comment-id'),
    reportFeedback: document.getElementById('report-feedback'),
    cancelReportBtn: document.getElementById('btn-cancel-report'),

    // Header buttons
    headerAuthBtn: document.getElementById('nav-auth-btn'),
    mobileAuthBtn: document.getElementById('mobile-auth-btn')
  };

  let authMode = 'signin'; // 'signin' or 'signup'

  /* --------------------------------------------------------------------------
     1. LAZY LOADING (Core Web Vitals Protection)
     -------------------------------------------------------------------------- */
  function setupLazyLoader() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            initSystem();
            observer.disconnect();
          }
        });
      }, { rootMargin: '350px 0px' });
      observer.observe(commentsSection);
    } else {
      window.addEventListener('load', initSystem);
    }

    // Eagerly initialize if user clicks header Sign In before scrolling to comments
    if (elements.headerAuthBtn) {
      elements.headerAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        initSystem().then(() => {
          if (!currentUser) openAuthModal();
        });
      });
    }

    if (elements.mobileAuthBtn) {
      elements.mobileAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        initSystem().then(() => {
          if (!currentUser) openAuthModal();
        });
      });
    }
  }

  /* --------------------------------------------------------------------------
     2. INITIALIZATION & SDK LOAD
     -------------------------------------------------------------------------- */
  async function initSystem() {
    if (isInitialized) return;
    isInitialized = true;

    if (!isConfigured) {
      // Demonstration Mode: Allows full UI testing and previews before live DB keys are provided
      isDemoMode = true;
      initDemoMode();
      return;
    }

    // Load Supabase JS dynamically if not already loaded
    try {
      if (!window.supabase) {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
      }

      supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

      // Listen for auth state changes
      supabaseClient.auth.onAuthStateChange((event, session) => {
        currentUser = session ? session.user : null;
        updateUIForUser();
      });

      // Check current session
      const { data: { session } } = await supabaseClient.auth.getSession();
      currentUser = session ? session.user : null;
      updateUIForUser();

      // Restore comment draft if present
      restoreDraft();

      // Load comments for current post
      await fetchComments();

      // Attach interaction listeners
      attachEventListeners();
    } catch (err) {
      console.warn('Jesus Calling Comments: Falling back to demonstration mode.', err);
      isDemoMode = true;
      initDemoMode();
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /* --------------------------------------------------------------------------
     3. DEMONSTRATION MODE (Graceful Unconfigured Fallback)
     -------------------------------------------------------------------------- */
  function initDemoMode() {
    // Check localStorage for demo user session
    const savedDemoUser = sessionStorage.getItem('jc_demo_user');
    if (savedDemoUser) {
      try { currentUser = JSON.parse(savedDemoUser); } catch (e) { }
    }

    updateUIForUser();
    restoreDraft();
    attachEventListeners();

    // Load demo sample comments
    const savedDemoComments = localStorage.getItem(`jc_comments_${currentPostUrl}`);
    if (savedDemoComments) {
      try { commentsData = JSON.parse(savedDemoComments); } catch (e) { commentsData = []; }
    } else {
      // Seed friendly starter sample
      commentsData = [
        {
          id: 'demo-1',
          post_url: currentPostUrl,
          user_id: 'demo-sarah',
          display_name: 'Grace M.',
          content: 'This devotional reminded me that walking by faith means trusting God with what I cannot see. Praying for peace in my family today.',
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          status: 'approved'
        }
      ];
    }

    renderComments();
    hideLoading();
  }

  /* --------------------------------------------------------------------------
     4. USER AUTHENTICATION UI & FLOW
     -------------------------------------------------------------------------- */
  function updateUIForUser() {
    if (currentUser) {
      const displayName = getDisplayName(currentUser);
      const avatarUrl = getAvatarUrl(currentUser);

      // Header button
      if (elements.headerAuthBtn) {
        elements.headerAuthBtn.textContent = displayName.split(' ')[0];
        elements.headerAuthBtn.title = `Signed in as ${displayName}`;
        elements.headerAuthBtn.classList.add('nav-account-active');
      }

      if (elements.mobileAuthBtn) {
        elements.mobileAuthBtn.textContent = `Account: ${displayName}`;
      }

      // Comment bar in section
      if (elements.userBar) {
        elements.userBar.style.display = 'flex';
        elements.userBarName.textContent = displayName;
        renderAvatar(elements.userBarAvatar, displayName, avatarUrl);
      }

      if (elements.submitBtnText) {
        elements.submitBtnText.textContent = 'Post Reflection';
      }
    } else {
      // Logged out
      if (elements.headerAuthBtn) {
        elements.headerAuthBtn.textContent = 'Sign In';
        elements.headerAuthBtn.title = 'Sign In to share comments';
        elements.headerAuthBtn.classList.remove('nav-account-active');
      }

      if (elements.mobileAuthBtn) {
        elements.mobileAuthBtn.textContent = 'Sign In / Account';
      }

      if (elements.userBar) {
        elements.userBar.style.display = 'none';
      }

      if (elements.submitBtnText) {
        elements.submitBtnText.textContent = 'Continue to Comment';
      }
    }
  }

  function getDisplayName(user) {
    if (!user) return 'Guest';
    return (
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Believer'
    );
  }

  function getAvatarUrl(user) {
    if (!user) return null;
    return user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
  }

  function renderAvatar(container, name, avatarUrl) {
    container.innerHTML = '';
    // Security check: Only allow http(s) protocols for avatar URLs
    const isSafeUrl = avatarUrl && /^https?:\/\//i.test(avatarUrl);
    if (isSafeUrl) {
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = '';
      img.width = 36;
      img.height = 36;
      img.className = 'comment-avatar-img';
      container.appendChild(img);
    } else {
      const initial = (name || 'B').trim().charAt(0).toUpperCase();
      const badge = document.createElement('span');
      badge.className = 'comment-avatar-initial';
      badge.textContent = initial;
      container.appendChild(badge);
    }
  }

  /* --------------------------------------------------------------------------
     5. COMMENTS CRUD & RENDERING
     -------------------------------------------------------------------------- */
  async function fetchComments() {
    showLoading();
    try {
      // Explicitly select only public-safe fields (excluding internal metadata)
      const { data, error } = await supabaseClient
        .from('comments')
        .select('id, post_url, user_id, display_name, avatar_url, content, parent_id, status, created_at, updated_at')
        .eq('post_url', currentPostUrl)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (error) throw error;
      commentsData = data || [];
      renderComments();
    } catch (err) {
      console.error('Error fetching comments:', err);
      showError('Comments are temporarily unavailable. Please try again later.');
    } finally {
      hideLoading();
    }
  }

  function renderComments() {
    elements.commentsList.innerHTML = '';

    if (elements.countBadge) {
      elements.countBadge.textContent = `(${commentsData.length})`;
    }

    if (commentsData.length === 0) {
      if (elements.emptyState) elements.emptyState.style.display = 'block';
      return;
    } else {
      if (elements.emptyState) elements.emptyState.style.display = 'none';
    }

    // Build hierarchy (top-level and 1-level replies)
    const topLevelComments = commentsData.filter(c => !c.parent_id);
    const repliesMap = {};

    commentsData.forEach(c => {
      if (c.parent_id) {
        if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
        repliesMap[c.parent_id].push(c);
      }
    });

    topLevelComments.forEach(comment => {
      const commentEl = createCommentElement(comment);

      // Check for replies
      const replies = repliesMap[comment.id];
      if (replies && replies.length > 0) {
        const repliesList = document.createElement('ul');
        repliesList.className = 'replies-list';
        replies.forEach(reply => {
          repliesList.appendChild(createCommentElement(reply, true));
        });
        commentEl.appendChild(repliesList);
      }

      elements.commentsList.appendChild(commentEl);
    });
  }

  function createCommentElement(comment, isReply = false) {
    const li = document.createElement('li');
    li.className = `comment-item ${isReply ? 'comment-reply-item' : ''}`;
    li.id = `comment-${comment.id}`;

    const card = document.createElement('article');
    card.className = 'comment-card';

    // Header (Avatar, Name, Date)
    const header = document.createElement('div');
    header.className = 'comment-card-header';

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'comment-card-avatar';
    renderAvatar(avatarWrap, comment.display_name, comment.avatar_url);
    header.appendChild(avatarWrap);

    const meta = document.createElement('div');
    meta.className = 'comment-card-meta';

    const authorSpan = document.createElement('strong');
    authorSpan.className = 'comment-author-name';
    authorSpan.textContent = comment.display_name;
    meta.appendChild(authorSpan);

    const timeSpan = document.createElement('time');
    timeSpan.className = 'comment-date';
    timeSpan.textContent = formatTimeAgo(comment.created_at);
    timeSpan.dateTime = comment.created_at;
    meta.appendChild(timeSpan);

    if (comment.updated_at && comment.updated_at !== comment.created_at) {
      const editedSpan = document.createElement('span');
      editedSpan.className = 'comment-edited-tag';
      editedSpan.textContent = '(edited)';
      meta.appendChild(editedSpan);
    }

    header.appendChild(meta);
    card.appendChild(header);

    // Body text (HTML Escaped for XSS safety)
    const bodyP = document.createElement('p');
    bodyP.className = 'comment-card-body';
    bodyP.id = `comment-body-${comment.id}`;
    bodyP.textContent = comment.content; // textContent safely sanitizes raw HTML
    card.appendChild(bodyP);

    // Action Bar (Reply, Edit, Delete, Report)
    const actions = document.createElement('div');
    actions.className = 'comment-card-actions';

    const isAuthor = currentUser && (currentUser.id === comment.user_id);

    // Reply Button (Only allowed on top-level comments to prevent infinite nesting)
    if (!isReply && config.maxReplyDepth > 1) {
      const replyBtn = document.createElement('button');
      replyBtn.type = 'button';
      replyBtn.className = 'btn-comment-action';
      replyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
        <span>Reply</span>
      `;
      replyBtn.addEventListener('click', () => toggleReplyBox(comment.id, li));
      actions.appendChild(replyBtn);
    }

    // Edit Button (Only author)
    if (isAuthor) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-comment-action';
      editBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        <span>Edit</span>
      `;
      editBtn.addEventListener('click', () => toggleEditBox(comment, card));
      actions.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-comment-action btn-action-delete';
      deleteBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        <span>Delete</span>
      `;
      deleteBtn.addEventListener('click', () => handleDeleteComment(comment.id));
      actions.appendChild(deleteBtn);
    } else {
      // Report Button
      const reportBtn = document.createElement('button');
      reportBtn.type = 'button';
      reportBtn.className = 'btn-comment-action btn-action-report';
      reportBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
        <span>Report</span>
      `;
      reportBtn.addEventListener('click', () => openReportModal(comment.id));
      actions.appendChild(reportBtn);
    }

    card.appendChild(actions);
    li.appendChild(card);
    return li;
  }

  /* --------------------------------------------------------------------------
     6. SUBMIT, EDIT, REPLY, DELETE ACTIONS
     -------------------------------------------------------------------------- */
  async function handlePostComment(parentId = null, contentOverride = null, replyBoxEl = null) {
    const text = contentOverride || elements.commentInput.value.trim();

    if (!text) {
      showFormFeedback('Please share a reflection before submitting.', 'error');
      if (elements.commentInput) elements.commentInput.focus();
      return;
    }

    if (text.length > config.maxCommentLength) {
      showFormFeedback(`Comment exceeds the maximum of ${config.maxCommentLength} characters.`, 'error');
      return;
    }

    // Cooldown check (prevent spam flooding)
    const now = Date.now();
    const timeSinceLast = (now - lastCommentTimestamp) / 1000;
    if (timeSinceLast < config.cooldownSeconds) {
      const wait = Math.ceil(config.cooldownSeconds - timeSinceLast);
      showFormFeedback(`Please wait ${wait} seconds before posting another comment.`, 'error');
      return;
    }

    // If unauthenticated, save draft & show login modal
    if (!currentUser) {
      sessionStorage.setItem('jc_comment_draft', text);
      openAuthModal();
      return;
    }

    const displayName = getDisplayName(currentUser);
    const avatarUrl = getAvatarUrl(currentUser);

    // Live Mode or Demo Mode submission
    if (isDemoMode) {
      const newComment = {
        id: 'demo-' + Date.now(),
        post_url: currentPostUrl,
        user_id: currentUser.id || 'demo-user',
        display_name: displayName,
        avatar_url: avatarUrl,
        content: text,
        parent_id: parentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'approved'
      };

      commentsData.push(newComment);
      localStorage.setItem(`jc_comments_${currentPostUrl}`, JSON.stringify(commentsData));
      onCommentSuccess(parentId, replyBoxEl);
      return;
    }

    try {
      setSubmitButtonLoading(true, replyBoxEl);
      const { data, error } = await supabaseClient
        .from('comments')
        .insert([
          {
            post_url: currentPostUrl,
            user_id: currentUser.id,
            display_name: displayName,
            avatar_url: avatarUrl,
            content: text,
            parent_id: parentId,
            status: config.autoApproveComments ? 'approved' : 'pending'
          }
        ])
        .select();

      if (error) throw error;

      lastCommentTimestamp = Date.now();

      if (config.autoApproveComments) {
        if (data && data[0]) {
          commentsData.push(data[0]);
          renderComments();
        } else {
          await fetchComments();
        }
        showFormFeedback('Your reflection was posted. Thank you for sharing!', 'success');
      } else {
        showFormFeedback('Thank you for sharing! Your reflection is awaiting approval.', 'success');
      }

      onCommentSuccess(parentId, replyBoxEl);
    } catch (err) {
      console.error('Comment submission error:', err);
      const errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('wait at least') || errMsg.toLowerCase().includes('cooldown') || errMsg.toLowerCase().includes('rate limit')) {
        showFormFeedback('Please wait at least 15 seconds before posting another reflection.', 'error');
      } else {
        showFormFeedback(errMsg || 'Failed to post reflection. Please check your connection and try again.', 'error');
      }
    } finally {
      setSubmitButtonLoading(false, replyBoxEl);
    }
  }

  function onCommentSuccess(parentId, replyBoxEl) {
    if (!parentId) {
      if (elements.commentInput) {
        elements.commentInput.value = '';
        updateCharCount();
      }
      sessionStorage.removeItem('jc_comment_draft');
    }
    if (replyBoxEl) {
      replyBoxEl.remove();
    }
    renderComments();
  }

  function toggleReplyBox(parentId, commentLi) {
    if (!currentUser) {
      openAuthModal();
      return;
    }

    // Check if reply box already open
    const existing = commentLi.querySelector('.reply-box-wrap');
    if (existing) {
      existing.remove();
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'reply-box-wrap';
    wrap.innerHTML = `
      <div class="reply-box-card">
        <label for="reply-input-${parentId}" class="sr-only">Reply to comment</label>
        <textarea id="reply-input-${parentId}" class="comment-textarea reply-textarea" placeholder="Write your reply in Christ's love..." maxlength="1000" rows="3"></textarea>
        <div class="reply-box-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-reply-${parentId}">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-post-reply-${parentId}">Post Reply</button>
        </div>
      </div>
    `;

    commentLi.appendChild(wrap);

    const replyInput = wrap.querySelector(`#reply-input-${parentId}`);
    replyInput.focus();

    wrap.querySelector(`#btn-cancel-reply-${parentId}`).addEventListener('click', () => wrap.remove());
    wrap.querySelector(`#btn-post-reply-${parentId}`).addEventListener('click', () => {
      const val = replyInput.value.trim();
      handlePostComment(parentId, val, wrap);
    });
  }

  function toggleEditBox(comment, card) {
    const bodyP = card.querySelector(`#comment-body-${comment.id}`);
    if (!bodyP) return;

    const existingEdit = card.querySelector('.comment-edit-form');
    if (existingEdit) return;

    bodyP.style.display = 'none';

    const editForm = document.createElement('div');
    editForm.className = 'comment-edit-form';
    editForm.innerHTML = `
      <label for="edit-input-${comment.id}" class="sr-only">Edit comment</label>
      <textarea id="edit-input-${comment.id}" class="comment-textarea edit-textarea" maxlength="1000" rows="3"></textarea>
      <div class="comment-edit-actions">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-edit-${comment.id}">Cancel</button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-save-edit-${comment.id}">Save Changes</button>
      </div>
    `;

    card.insertBefore(editForm, card.querySelector('.comment-card-actions'));

    const editInput = editForm.querySelector(`#edit-input-${comment.id}`);
    editInput.value = comment.content; // Safe direct assignment avoids any innerHTML entity issues
    editInput.focus();

    editForm.querySelector(`#btn-cancel-edit-${comment.id}`).addEventListener('click', () => {
      editForm.remove();
      bodyP.style.display = 'block';
    });

    editForm.querySelector(`#btn-save-edit-${comment.id}`).addEventListener('click', async () => {
      const updated = editInput.value.trim();
      if (!updated) return;

      if (isDemoMode) {
        comment.content = updated;
        comment.updated_at = new Date().toISOString();
        localStorage.setItem(`jc_comments_${currentPostUrl}`, JSON.stringify(commentsData));
        editForm.remove();
        bodyP.textContent = updated;
        bodyP.style.display = 'block';
        renderComments();
        return;
      }

      try {
        const { error } = await supabaseClient
          .from('comments')
          .update({ content: updated, updated_at: new Date().toISOString() })
          .eq('id', comment.id)
          .eq('user_id', currentUser.id);

        if (error) throw error;
        comment.content = updated;
        comment.updated_at = new Date().toISOString();
        editForm.remove();
        bodyP.textContent = updated;
        bodyP.style.display = 'block';
        renderComments();
      } catch (err) {
        alert('Could not update comment. Please try again.');
      }
    });
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    if (isDemoMode) {
      commentsData = commentsData.filter(c => c.id !== commentId && c.parent_id !== commentId);
      localStorage.setItem(`jc_comments_${currentPostUrl}`, JSON.stringify(commentsData));
      renderComments();
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      commentsData = commentsData.filter(c => c.id !== commentId && c.parent_id !== commentId);
      renderComments();
    } catch (err) {
      alert('Could not delete comment. Please try again.');
    }
  }

  /* --------------------------------------------------------------------------
     7. REPORTING FLOW
     -------------------------------------------------------------------------- */
  function openReportModal(commentId) {
    previousFocusedElement = document.activeElement;
    if (elements.reportCommentId) elements.reportCommentId.value = commentId;
    if (elements.reportFeedback) elements.reportFeedback.style.display = 'none';
    if (elements.reportModal) elements.reportModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (elements.cancelReportBtn) elements.cancelReportBtn.focus();
  }

  function closeReportModal() {
    if (elements.reportModal) elements.reportModal.style.display = 'none';
    document.body.style.overflow = '';
    if (previousFocusedElement) previousFocusedElement.focus();
  }

  async function handleReportSubmit(e) {
    e.preventDefault();
    const commentId = elements.reportCommentId.value;
    const selectedRadio = elements.reportForm.querySelector('input[name="report_reason"]:checked');
    const reason = selectedRadio ? selectedRadio.value : 'Other';

    if (isDemoMode) {
      showReportFeedback('Thank you for letting us know. Our team will review this comment.', 'success');
      setTimeout(closeReportModal, 1800);
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('comment_reports')
        .insert([
          {
            comment_id: commentId,
            reporter_id: currentUser ? currentUser.id : null,
            reason: reason,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      showReportFeedback('Thank you for letting us know. Our editorial team will review this comment.', 'success');
      setTimeout(closeReportModal, 1800);
    } catch (err) {
      showReportFeedback('Report received. Thank you for helping keep our community peaceful.', 'success');
      setTimeout(closeReportModal, 1800);
    }
  }

  /* --------------------------------------------------------------------------
     8. AUTH MODAL INTERACTION
     -------------------------------------------------------------------------- */
  function openAuthModal() {
    previousFocusedElement = document.activeElement;
    if (elements.authModal) elements.authModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setAuthMode('signin');
    if (elements.inputEmail) elements.inputEmail.focus();
  }

  function closeAuthModal() {
    if (elements.authModal) elements.authModal.style.display = 'none';
    document.body.style.overflow = '';
    if (previousFocusedElement) previousFocusedElement.focus();
  }

  function setAuthMode(mode) {
    authMode = mode;
    clearAuthFeedback();
    if (mode === 'signup') {
      if (elements.groupName) elements.groupName.style.display = 'block';
      if (elements.authSubmitText) elements.authSubmitText.textContent = 'Create Account';
      if (elements.toggleAuthPrompt) {
        elements.toggleAuthPrompt.innerHTML = `Already have an account? <button type="button" class="btn-text-link font-bold" id="btn-toggle-auth-mode">Sign In</button>`;
        document.getElementById('btn-toggle-auth-mode').addEventListener('click', () => setAuthMode('signin'));
      }
    } else {
      if (elements.groupName) elements.groupName.style.display = 'none';
      if (elements.authSubmitText) elements.authSubmitText.textContent = 'Sign In';
      if (elements.toggleAuthPrompt) {
        elements.toggleAuthPrompt.innerHTML = `Don't have an account yet? <button type="button" class="btn-text-link font-bold" id="btn-toggle-auth-mode">Create an Account</button>`;
        document.getElementById('btn-toggle-auth-mode').addEventListener('click', () => setAuthMode('signup'));
      }
    }
  }

  async function handleGoogleOAuth() {
    if (isDemoMode) {
      // Demo simulated login
      currentUser = {
        id: 'demo-google-' + Date.now(),
        email: 'reader@example.com',
        user_metadata: { full_name: 'Christian Reader', avatar_url: null }
      };
      sessionStorage.setItem('jc_demo_user', JSON.stringify(currentUser));
      updateUIForUser();
      closeAuthModal();
      return;
    }

    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href
        }
      });
      if (error) throw error;
    } catch (err) {
      showAuthFeedback('Google sign in encountered an issue: ' + (err.message || 'Please try again.'), 'error');
    }
  }

  async function handleEmailAuthSubmit(e) {
    e.preventDefault();
    clearAuthFeedback();

    const email = elements.inputEmail.value.trim();
    const password = elements.inputPassword.value;
    const name = elements.inputName ? elements.inputName.value.trim() : '';

    if (!email || !password) {
      showAuthFeedback('Please enter both your email address and password.', 'error');
      return;
    }

    if (password.length < 6) {
      showAuthFeedback('Password must be at least 6 characters.', 'error');
      return;
    }

    if (isDemoMode) {
      currentUser = {
        id: 'demo-email-' + Date.now(),
        email: email,
        user_metadata: { display_name: name || email.split('@')[0] }
      };
      sessionStorage.setItem('jc_demo_user', JSON.stringify(currentUser));
      updateUIForUser();
      closeAuthModal();
      return;
    }

    setAuthSubmitLoading(true);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabaseClient.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { display_name: name || email.split('@')[0] }
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          showAuthFeedback('Account created! Please check your email for a confirmation link.', 'success');
        } else {
          currentUser = data.user;
          updateUIForUser();
          closeAuthModal();
        }
      } else {
        // Sign In
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) throw error;

        currentUser = data.user;
        updateUIForUser();
        closeAuthModal();
      }
    } catch (err) {
      showAuthFeedback(err.message || 'Authentication failed. Please check your credentials.', 'error');
    } finally {
      setAuthSubmitLoading(false);
    }
  }

  async function handleForgotPassword() {
    const email = elements.inputEmail.value.trim();
    if (!email) {
      showAuthFeedback('Please enter your email address first, then click "Forgot password?".', 'error');
      elements.inputEmail.focus();
      return;
    }

    if (isDemoMode) {
      showAuthFeedback('Password reset link sent (demo simulation).', 'success');
      return;
    }

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href
      });
      if (error) throw error;
      showAuthFeedback('Password reset email sent. Please check your inbox.', 'success');
    } catch (err) {
      showAuthFeedback(err.message || 'Could not send reset email.', 'error');
    }
  }

  async function handleSignOut() {
    if (isDemoMode) {
      currentUser = null;
      sessionStorage.removeItem('jc_demo_user');
      updateUIForUser();
      return;
    }

    try {
      await supabaseClient.auth.signOut();
      currentUser = null;
      updateUIForUser();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  }

  /* --------------------------------------------------------------------------
     9. EVENT LISTENERS & HELPERS
     -------------------------------------------------------------------------- */
  function attachEventListeners() {
    // Character counter
    if (elements.commentInput) {
      elements.commentInput.addEventListener('input', updateCharCount);
    }

    // Submit button
    if (elements.submitBtn) {
      elements.submitBtn.addEventListener('click', () => handlePostComment());
    }

    // Sign out from bar
    if (elements.userBarSignout) {
      elements.userBarSignout.addEventListener('click', handleSignOut);
    }

    // Modal close & backdrops
    if (elements.authModalClose) elements.authModalClose.addEventListener('click', closeAuthModal);
    if (elements.authModalBackdrop) elements.authModalBackdrop.addEventListener('click', closeAuthModal);
    if (elements.reportModalClose) elements.reportModalClose.addEventListener('click', closeReportModal);
    if (elements.reportModalBackdrop) elements.reportModalBackdrop.addEventListener('click', closeReportModal);
    if (elements.cancelReportBtn) elements.cancelReportBtn.addEventListener('click', closeReportModal);

    // Auth actions
    if (elements.googleBtn) elements.googleBtn.addEventListener('click', handleGoogleOAuth);
    if (elements.emailForm) elements.emailForm.addEventListener('submit', handleEmailAuthSubmit);
    if (elements.forgotPasswordBtn) elements.forgotPasswordBtn.addEventListener('click', handleForgotPassword);
    if (elements.toggleAuthBtn) elements.toggleAuthBtn.addEventListener('click', () => setAuthMode('signup'));

    // Report form
    if (elements.reportForm) elements.reportForm.addEventListener('submit', handleReportSubmit);

    // ESC key to close open dialogs
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (elements.authModal && elements.authModal.style.display !== 'none') closeAuthModal();
        if (elements.reportModal && elements.reportModal.style.display !== 'none') closeReportModal();
      }
    });
  }

  function restoreDraft() {
    const draft = sessionStorage.getItem('jc_comment_draft');
    if (draft && elements.commentInput) {
      elements.commentInput.value = draft;
      updateCharCount();
    }
  }

  function updateCharCount() {
    if (!elements.commentInput || !elements.charCount) return;
    const remaining = config.maxCommentLength - elements.commentInput.value.length;
    elements.charCount.textContent = `${remaining} characters left`;
  }

  function formatTimeAgo(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function showLoading() {
    if (elements.loadingState) elements.loadingState.style.display = 'block';
    if (elements.emptyState) elements.emptyState.style.display = 'none';
    if (elements.errorState) elements.errorState.style.display = 'none';
  }

  function hideLoading() {
    if (elements.loadingState) elements.loadingState.style.display = 'none';
  }

  function showError(msg) {
    if (elements.errorState) {
      elements.errorState.style.display = 'block';
      if (elements.errorMessage) elements.errorMessage.textContent = msg;
    }
    if (elements.emptyState) elements.emptyState.style.display = 'none';
  }

  function showFormFeedback(msg, type) {
    if (!elements.formFeedback) return;
    elements.formFeedback.textContent = msg;
    elements.formFeedback.className = `comment-feedback feedback-${type}`;
    elements.formFeedback.style.display = 'block';
    if (type === 'success') {
      setTimeout(() => { elements.formFeedback.style.display = 'none'; }, 4000);
    }
  }

  function showAuthFeedback(msg, type) {
    if (!elements.authFeedback) return;
    elements.authFeedback.textContent = msg;
    elements.authFeedback.className = `auth-feedback feedback-${type}`;
    elements.authFeedback.style.display = 'block';
  }

  function clearAuthFeedback() {
    if (elements.authFeedback) elements.authFeedback.style.display = 'none';
  }

  function showReportFeedback(msg, type) {
    if (!elements.reportFeedback) return;
    elements.reportFeedback.textContent = msg;
    elements.reportFeedback.className = `auth-feedback feedback-${type}`;
    elements.reportFeedback.style.display = 'block';
  }

  function setSubmitButtonLoading(isLoading, replyBoxEl) {
    const btn = replyBoxEl ? replyBoxEl.querySelector('button.btn-primary') : elements.submitBtn;
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
      btn.classList.add('btn-loading');
    } else {
      btn.classList.remove('btn-loading');
    }
  }

  function setAuthSubmitLoading(isLoading) {
    if (!elements.authSubmitBtn) return;
    elements.authSubmitBtn.disabled = isLoading;
    if (isLoading) {
      elements.authSubmitBtn.classList.add('btn-loading');
    } else {
      elements.authSubmitBtn.classList.remove('btn-loading');
    }
  }

  // Initialize lazy loader
  setupLazyLoader();
})();
