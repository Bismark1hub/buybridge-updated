// Shared fetch wrapper + auth helpers used by every page.

function getToken() {
  return localStorage.getItem(CONFIG.TOKEN_KEY);
}

function getCurrentUser() {
  const raw = localStorage.getItem(CONFIG.USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
  localStorage.setItem(CONFIG.TOKEN_KEY, token);
  localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
}

function logout() {
  localStorage.removeItem(CONFIG.TOKEN_KEY);
  localStorage.removeItem(CONFIG.USER_KEY);
  window.location.href = 'login.html';
}

// Redirects to login if not authenticated, or to home if wrong role.
// Call this at the top of any protected page.
// requiredRole is optional: 'buyer' | 'seller' | 'admin'
function requireAuth(requiredRole) {
  const token = getToken();
  const user = getCurrentUser();

  if (!token || !user) {
    window.location.href = 'login.html';
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    window.location.href = 'index.html';
    return null;
  }

  return user;
}

// Core request function. Handles JSON, auth header, and error shape consistently.
// method: 'GET' | 'POST'
// body: plain object or null
// auth: true if this request needs the Authorization header
async function apiRequest(endpoint, method = 'GET', body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (!token) {
      window.location.href = 'login.html';
      throw new Error('Not authenticated');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${CONFIG.API_BASE}/${endpoint}`, options);
  } catch (networkErr) {
    throw new Error('Network error — check your connection and try again.');
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    throw new Error('Unexpected response from server.');
  }

  if (!response.ok) {
    // If the token is invalid/expired, force a re-login
    if (response.status === 401) {
      logout();
    }
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }

  return data;
}

// Formats a number as Ghana Cedi currency for display
function formatCurrency(amount) {
  return `${CONFIG.CURRENCY} ${parseFloat(amount).toFixed(2)}`;
}