// Renders the shared nav bar into any page that has a <div id="navbar"></div>
// Adjusts links shown based on login state and role.

function renderNavbar() {
  const navbarEl = document.getElementById('navbar');
  if (!navbarEl) return;

  const user = getCurrentUser();

  let links = `<a href="index.html" class="nav-logo">BuyBridge</a>`;
  links += `<a href="browse.html">Browse</a>`;

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

  navbarEl.innerHTML = `<nav class="navbar">${links}</nav>`;

  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

document.addEventListener('DOMContentLoaded', renderNavbar);