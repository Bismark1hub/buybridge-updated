// Renders the shared nav bar into any page that has a <div id="navbar"></div>
// Adjusts links shown based on login state and role.
// On most pages, nav links collapse behind a hamburger button.
// On the landing page (index.html), we skip the cart icon and hamburger —
// visitors haven't shopped yet, so a cart badge and hidden menu don't help them.
function renderNavbar() {
  const navbarEl = document.getElementById('navbar');
  if (!navbarEl) return;

  const isLandingPage = window.location.pathname.endsWith('/index.html') ||
                         window.location.pathname === '/' ||
                         window.location.pathname.endsWith('/');

  const user = getCurrentUser();
  let links = `<a href="browse.html">Browse</a>`;
  if (!user) {
    links += `<a href="login.html">Log In</a>`;
    links += `<a href="signup.html" class="nav-cta">Sign Up</a>`;
  } else {
    if (user.role === 'buyer') {
      links += `<a href="my-orders.html">My Orders</a>`;
      links += `<a href="become-seller.html">Sell on BuyBridge</a>`;
    }
    if (user.role === 'seller') {
      links += `<a href="seller-dashboard.html">Dashboard</a>`;
      links += `<a href="my-products.html">My Products</a>`;
      links += `<a href="seller-orders.html">Orders</a>`;
    }
    if (user.role === 'admin') {
      links += `<a href="admin-dashboard.html">Admin</a>`;
    }
    links += `<a href="notifications.html">Notifications</a>`;
    links += `<a href="profile.html">${user.full_name}</a>`;
    links += `<a href="#" id="logout-link">Log Out</a>`;
  }

  const cartHtml = isLandingPage ? '' : `
      <a href="cart.html" class="nav-cart" aria-label="Cart">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <span class="cart-count" id="cart-count" style="display:none;">0</span>
      </a>`;

  const toggleHtml = isLandingPage ? '' : `
      <button class="nav-toggle" id="nav-toggle" aria-label="Menu">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>`;

  const navLinksClass = isLandingPage ? 'nav-links nav-links-static' : 'nav-links';

  navbarEl.innerHTML = `
    <nav class="navbar">
      <a href="index.html" class="nav-logo">BuyBridge</a>${cartHtml}${toggleHtml}
      <div class="${navLinksClass}" id="nav-links">${links}</div>
    </nav>
  `;

  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Only wire up the hamburger toggle if it actually exists on this page
  const toggleBtn = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('nav-links-open');
    });
  }
}
document.addEventListener('DOMContentLoaded', renderNavbar);
