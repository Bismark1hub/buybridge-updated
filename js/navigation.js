// ==================== BUYBRIDGE ROLE-AWARE NAVIGATION ====================

// Returns the correct header HTML based on user role
function getHeaderHTML(pageTitle, backLink) {
  const isAuth = isLoggedIn();
  const role = getUserRole();
  const user = getUser();

  const backButton = backLink 
    ? `<a href="${backLink}" class="back-btn">←</a>` 
    : '';

  const rightActions = getHeaderActions(isAuth, role);

  return `
    <div class="header-container">
      ${backButton}
      <div class="header-logo">
        <span class="logo-icon">🌉</span>
        <span class="logo-text">BuyBridge</span>
      </div>
      ${pageTitle ? `<span class="header-title">${pageTitle}</span>` : ''}
      ${rightActions}
    </div>
  `;
}

// Right side header icons based on role
function getHeaderActions(isAuth, role) {
  if (!isAuth) {
    return `
      <div class="header-actions">
        <a href="pages/cart.html" class="cart-btn">
          🛒
          <span class="cart-badge" id="cartBadge">0</span>
        </a>
        <a href="pages/login.html" class="profile-btn">👤</a>
      </div>
    `;
  }

  let actions = '<div class="header-actions">';

  // Cart icon for buyers
  if (!role || role === 'buyer') {
    actions += `
      <a href="pages/cart.html" class="cart-btn">
        🛒
        <span class="cart-badge" id="cartBadge">0</span>
      </a>
    `;
  }

  // Notifications for all logged-in users
  actions += `
    <a href="pages/notifications.html" class="notif-btn">🔔</a>
  `;

  // Profile/dashboard link based on role
  if (role === 'admin') {
    actions += `<a href="pages/admin-dashboard.html" class="profile-btn">👤</a>`;
  } else if (role === 'seller') {
    actions += `<a href="pages/seller-dashboard.html" class="profile-btn">🏪</a>`;
  } else {
    actions += `<a href="pages/profile.html" class="profile-btn">👤</a>`;
  }

  actions += '</div>';
  return actions;
}

// Returns bottom navigation for buyer pages
function getBuyerBottomNav(currentPage) {
  if (!isLoggedIn() || getUserRole() !== 'buyer' && getUserRole() !== null) {
    return getBuyerBottomNavHTML(currentPage);
  }
  return getBuyerBottomNavHTML(currentPage);
}

function getBuyerBottomNavHTML(currentPage) {
  const items = [
    { page: 'home', icon: '🏠', label: 'Home', href: 'index.html' },
    { page: 'search', icon: '🔍', label: 'Search', href: '#', onclick: true },
    { page: 'orders', icon: '📋', label: 'Orders', href: 'pages/my-orders.html' },
    { page: 'profile', icon: '👤', label: 'Profile', href: isLoggedIn() ? 'pages/profile.html' : 'pages/login.html' }
  ];

  return `
    <nav class="bottom-nav">
      ${items.map(item => `
        <a href="${item.href}" 
           class="nav-item ${currentPage === item.page ? 'active' : ''}"
           ${item.onclick ? 'onclick="showToast(\'Search coming soon\', \'info\'); return false;"' : ''}>
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

// Seller bottom navigation
function getSellerBottomNav(currentPage) {
  const items = [
    { page: 'dashboard', icon: '📊', label: 'Dashboard', href: 'seller-dashboard.html' },
    { page: 'products', icon: '🏷️', label: 'Products', href: 'seller-dashboard.html' },
    { page: 'orders', icon: '📦', label: 'Orders', href: 'seller-dashboard.html' },
    { page: 'profile', icon: '👤', label: 'Profile', href: 'profile.html' }
  ];

  return `
    <nav class="bottom-nav">
      ${items.map(item => `
        <a href="${item.href}" class="nav-item ${currentPage === item.page ? 'active' : ''}">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

// Initialize header on any page
function initHeader(pageTitle, backLink) {
  const header = document.getElementById('mainHeader');
  if (header) {
    header.innerHTML = getHeaderHTML(pageTitle, backLink);
  }
  updateAllCartBadges();
  updateNavLinks();
}

// Update cart badge across the page
function updateAllCartBadges() {
  const cart = JSON.parse(localStorage.getItem('buybridge_cart') || '[]');
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('#cartBadge').forEach(badge => {
    badge.textContent = count;
  });
}

// Make profile-related links point to the right place
function updateNavLinks() {
  const role = getUserRole();
  
  document.querySelectorAll('.profile-link').forEach(link => {
    if (!isLoggedIn()) {
      link.href = 'pages/login.html';
    } else if (role === 'seller') {
      link.href = 'pages/seller-dashboard.html';
    } else if (role === 'admin') {
      link.href = 'pages/admin-dashboard.html';
    } else {
      link.href = 'pages/profile.html';
    }
  });
}

// Check auth and redirect if not logged in
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Check specific role
function requireRole(allowedRoles) {
  if (!requireAuth()) return false;
  
  const role = getUserRole();
  if (!allowedRoles.includes(role)) {
    window.location.href = '../index.html';
    return false;
  }
  return true;
}

// Handle logout from any page
function handleLogout() {
  clearToken();
  localStorage.removeItem('buybridge_cart');
  window.location.href = '../index.html';
}

// Run on every page load
document.addEventListener('DOMContentLoaded', () => {
  updateAllCartBadges();
  updateNavLinks();
});