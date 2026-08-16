// ===================================================
// CampusConnect – Global JS Utilities v2.0
// public/js/main.js
// All backend API calls are preserved and connected
// ===================================================

// ===================================================
// TOAST NOTIFICATION SYSTEM
// ===================================================
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'bi-check-circle-fill',
    error:   'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info:    'bi-info-circle-fill'
  };

  const toast = document.createElement('div');
  toast.className = `custom-toast toast-${type}`;
  toast.innerHTML = `
    <i class="bi ${icons[type] || icons.info}" style="font-size:1.1rem;flex-shrink:0;"></i>
    <div style="flex:1;font-size:0.88rem;font-weight:500;">${message}</div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#64748b;cursor:pointer;padding:0;font-size:1rem;line-height:1;margin-left:8px;">
      <i class="bi bi-x"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards';
    setTimeout(() => toast.remove(), 380);
  }, duration);
}

// ===================================================
// API FETCH WRAPPER (session-aware)
// ===================================================
async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);

    if (response.status === 401) {
      clearCurrentUser();
      const path = window.location.pathname;
      const isAdminPage = path.startsWith('/admin');
      if (path !== '/login' && path !== '/admin/login' && path !== '/register') {
        showToast('Session expired. Please log in again.', 'warning');
        setTimeout(() => {
          window.location.href = isAdminPage
            ? '/admin/login?error=Session expired. Please log in again.'
            : '/login?error=Session expired. Please log in again.';
        }, 1200);
      }
    }
    return response;
  } catch (error) {
    console.error('Network error:', error);
    showToast('Network error. Please check your connection.', 'error');
    throw error;
  }
}

// ===================================================
// USER SESSION MANAGEMENT (localStorage)
// ===================================================
function getCurrentUser() {
  try {
    const user = localStorage.getItem('cc_user');
    return user ? JSON.parse(user) : null;
  } catch { return null; }
}

function setCurrentUser(user) {
  localStorage.setItem('cc_user', JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem('cc_user');
}

// ===================================================
// LOGOUT
// ===================================================
async function performLogout() {
  try {
    const response = await apiFetch('/api/auth/logout', { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      const user = getCurrentUser();
      const isAdmin = user && user.role === 'admin';
      clearCurrentUser();
      showToast('Logged out successfully. Goodbye!', 'success');
      setTimeout(() => {
        window.location.href = isAdmin ? '/admin/login' : '/';
      }, 800);
    } else {
      showToast(data.message || 'Logout failed. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// ===================================================
// DATE & TIME FORMATTERS
// ===================================================
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function formatTime(timeStr) {
  if (!timeStr) return 'N/A';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

// ===================================================
// COUNTDOWN TIMER
// ===================================================
function startCountdown(targetDate, dayEl, hourEl, minEl, secEl, onExpired) {
  function update() {
    const now = Date.now();
    const diff = new Date(targetDate) - now;

    if (diff <= 0) {
      [dayEl, hourEl, minEl, secEl].forEach(el => { if(el) el.textContent = '00'; });
      if (onExpired) onExpired();
      return;
    }

    const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (dayEl)  dayEl.textContent  = String(days).padStart(2, '0');
    if (hourEl) hourEl.textContent = String(hours).padStart(2, '0');
    if (minEl)  minEl.textContent  = String(minutes).padStart(2, '0');
    if (secEl)  secEl.textContent  = String(seconds).padStart(2, '0');
  }

  update();
  return setInterval(update, 1000);
}

// ===================================================
// ANIMATED NUMBER COUNTER
// ===================================================
function animateCounter(element, end, duration = 1500, suffix = '') {
  if (!element) return;
  const start = 0;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.floor(eased * end);
    element.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ===================================================
// INTERSECTION OBSERVER for counter animation
// ===================================================
function observeCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        const end = parseInt(entry.target.dataset.count);
        const suffix = entry.target.dataset.suffix || '';
        animateCounter(entry.target, end, 1600, suffix);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(el => observer.observe(el));
}

// ===================================================
// FAQ TOGGLE
// ===================================================
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item.open').forEach(open => {
        open.classList.remove('open');
        open.querySelector('.faq-answer').style.maxHeight = '0';
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

// ===================================================
// SKELETON LOADER
// ===================================================
function showSkeletons(container, count, height = 180) {
  if (!container) return;
  container.innerHTML = Array(count).fill(`
    <div class="col-md-4">
      <div class="skeleton" style="height:${height}px;border-radius:16px;"></div>
    </div>
  `).join('');
}

// ===================================================
// GET CATEGORY BANNER CLASS
// ===================================================
function getCategoryBannerClass(category = '') {
  const map = {
    'Technical': 'banner-technical',
    'Hackathon': 'banner-hackathon',
    'Workshop':  'banner-workshop',
    'Cultural':  'banner-cultural',
    'Sports':    'banner-sports',
    'Seminar':   'banner-seminar',
    'Competition': 'banner-competition',
    'Career':    'banner-career',
    'Fest':      'banner-fest'
  };
  return map[category] || 'banner-technical';
}

function getCategoryPillClass(category = '') {
  const map = {
    'Technical': 'cat-technical',
    'Hackathon': 'cat-hackathon',
    'Workshop':  'cat-workshop',
    'Cultural':  'cat-cultural',
    'Sports':    'cat-sports',
    'Seminar':   'cat-seminar',
    'Competition': 'cat-competition',
    'Career':    'cat-career',
    'Fest':      'cat-fest'
  };
  return map[category] || 'cat-technical';
}

function getCategoryIcon(category = '') {
  const map = {
    'Technical': 'bi-cpu-fill',
    'Hackathon': 'bi-code-slash',
    'Workshop':  'bi-tools',
    'Cultural':  'bi-music-note-beamed',
    'Sports':    'bi-trophy-fill',
    'Seminar':   'bi-person-video3',
    'Competition':'bi-award-fill',
    'Career':    'bi-briefcase-fill',
    'Fest':      'bi-stars'
  };
  return map[category] || 'bi-calendar-event-fill';
}

// ===================================================
// EVENT IMAGE MAPPING
// ===================================================
function getEventImage(event) {
  // Map by event name (case-insensitive partial match)
  const nameMap = {
    'codesprint hackathon': '/images/events/codesprint-hackathon.jpg',
    'web development workshop': '/images/events/web-development-workshop.jpg',
    'techfest 2026': '/images/events/techfest-2026.jpg',
    'annual cultural fest': '/images/events/cultural-fest.jpg',
    'pulse 2026': '/images/events/cultural-fest.jpg',
    'sports meet': '/images/events/sports-meet.jpg',
    'ai & cloud computing seminar': '/images/events/seminar-event.jpg',
    'project expo': '/images/events/default-event.jpg',
    'photography competition': '/images/events/default-event.jpg'
  };

  // Try name-based match first
  const eventNameLower = (event.eventName || '').toLowerCase();
  for (const [key, val] of Object.entries(nameMap)) {
    if (eventNameLower.includes(key)) return val;
  }

  // Fallback: map by category
  const categoryMap = {
    'Hackathon': '/images/events/codesprint-hackathon.jpg',
    'Workshop':  '/images/events/web-development-workshop.jpg',
    'Fest':      '/images/events/techfest-2026.jpg',
    'Cultural':  '/images/events/cultural-fest.jpg',
    'Sports':    '/images/events/sports-meet.jpg',
    'Seminar':   '/images/events/seminar-event.jpg',
    'Technical': '/images/events/codesprint-hackathon.jpg',
    'Competition':'/images/events/default-event.jpg',
    'Career':    '/images/events/seminar-event.jpg'
  };

  return categoryMap[event.category] || '/images/events/default-event.jpg';
}

// ===================================================
// BUILD EVENT CARD HTML (used across pages)
// ===================================================
function buildEventCard(event) {
  const bannerClass = getCategoryBannerClass(event.category);
  const pillClass   = getCategoryPillClass(event.category);
  const icon        = getCategoryIcon(event.category);
  const capacity    = event.maxCapacity || 1;
  const registered  = event.currentRegistrations || 0;
  const pct         = Math.min(Math.round((registered / capacity) * 100), 100);
  const barClass    = pct >= 80 ? 'warning' : '';
  const eventImage  = getEventImage(event);

  // Status badge with new glassmorphism style
  let statusBadge = '';
  if (event.status === 'Registration Open') {
    statusBadge = `<span class="badge-glass badge-glass-open"><span class="status-dot dot-green"></span>Registration Open</span>`;
  } else if (event.status === 'Upcoming') {
    statusBadge = `<span class="badge-glass badge-glass-upcoming"><span class="status-dot dot-blue"></span>Upcoming</span>`;
  } else if (event.status === 'Completed') {
    statusBadge = `<span class="badge-glass badge-glass-completed"><span class="status-dot dot-gray"></span>Completed</span>`;
  } else if (event.status === 'Cancelled') {
    statusBadge = `<span class="badge-glass badge-glass-cancelled"><span class="status-dot dot-red"></span>Cancelled</span>`;
  } else {
    statusBadge = `<span class="badge-glass badge-glass-closed"><span class="status-dot dot-gray"></span>${event.status}</span>`;
  }

  return `
    <div class="event-card">
      <div class="event-card-banner ${bannerClass}">
        <img src="${eventImage}" alt="${event.eventName}" class="event-card-image" loading="lazy"
             onerror="this.style.display='none'; this.parentElement.querySelector('.event-card-banner-icon').style.opacity='0.4';" />
        <div class="event-card-overlay"></div>
        <i class="bi ${icon} event-card-banner-icon text-white"></i>
        <div class="event-card-badge-left">${statusBadge}</div>
        <div class="event-card-badge-right">
          <span class="cat-pill ${pillClass}">${event.category}</span>
        </div>
        <button class="event-card-fav" aria-label="Save event" onclick="event.stopPropagation(); this.classList.toggle('active');">
          <i class="bi bi-heart"></i>
        </button>
        <div class="event-card-hover-actions">
          <a href="/event/${event.eventId}" class="btn-hover-action btn-hover-details">
            <i class="bi bi-eye me-1"></i>View Details
          </a>
          <a href="/event/${event.eventId}" class="btn-hover-action btn-hover-register">
            <i class="bi bi-check-circle me-1"></i>Register Now
          </a>
        </div>
      </div>
      <div class="event-card-body">
        <div class="event-card-meta">
          <span><i class="bi bi-calendar3 me-1"></i>${formatDate(event.date)}</span>
          <span><i class="bi bi-geo-alt-fill me-1"></i>${event.venue || 'TBD'}</span>
        </div>
        <h5 class="event-card-title">${event.eventName}</h5>
        <p class="event-card-desc text-secondary">${event.description || ''}</p>
        <div class="event-card-footer">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <small class="text-secondary"><i class="bi bi-people-fill me-1"></i>${registered}/${capacity} registered</small>
            <small class="text-secondary">${capacity - registered} seats left</small>
          </div>
          <div class="capacity-bar"><div class="capacity-bar-fill ${barClass}" style="width:${pct}%"></div></div>
          <div class="mt-3">
            <a href="/event/${event.eventId}" class="btn btn-premium btn-sm w-100">
              <i class="bi bi-arrow-right-circle me-1"></i>View & Register
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===================================================
// NAVBAR AUTH — populate dynamically on every page
// ===================================================
function initNavbar() {
  const user = getCurrentUser();
  const authNav = document.getElementById('auth-nav-options');
  if (!authNav) return;

  if (user) {
    const dashboardPath = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    authNav.innerHTML = `
      <li class="nav-item">
        <a class="nav-link" href="${dashboardPath}">
          <i class="bi bi-speedometer2 me-1"></i>Dashboard
        </a>
      </li>
      <li class="nav-item ms-lg-2 d-flex align-items-center">
        <button onclick="performLogout()" class="btn btn-outline-premium btn-sm">
          <i class="bi bi-box-arrow-right me-1"></i>Logout
        </button>
      </li>
    `;
  } else {
    authNav.innerHTML = `
      <li class="nav-item">
        <a class="nav-link" href="/login">Student Login</a>
      </li>
      <li class="nav-item ms-lg-2 d-flex align-items-center">
        <a href="/register" class="btn btn-premium btn-sm">
          <i class="bi bi-person-plus-fill me-1"></i>Register Free
        </a>
      </li>
    `;
  }
}

// ===================================================
// SMOOTH SCROLL for anchor links
// ===================================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ===================================================
// INIT on DOMContentLoaded
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
  // Show URL error messages (from redirects)
  const urlParams = new URLSearchParams(window.location.search);
  const errorMsg = urlParams.get('error');
  if (errorMsg) {
    showToast(decodeURIComponent(errorMsg), 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Init navbar auth state
  initNavbar();

  // Init FAQ accordions
  initFAQ();

  // Init animated counters
  observeCounters();

  // Init smooth scroll
  initSmoothScroll();

  // Navbar scroll effect
  const navbar = document.querySelector('.glass-nav');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        navbar.style.background = 'rgba(8, 9, 16, 0.96)';
        navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
      } else {
        navbar.style.background = 'rgba(8, 9, 16, 0.88)';
        navbar.style.boxShadow = 'none';
      }
    });
  }
});
