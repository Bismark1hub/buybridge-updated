// ==================== BUYBRIDGE CONFIGURATION ====================

// API Base URL - change this when deploying
// For local dev with Netlify CLI: http://localhost:8888
// For production: https://your-site.netlify.app
const API_BASE = 'http://localhost:8888';

// ==================== AUTH HELPERS ====================

// Store token in localStorage
function setToken(token) {
  localStorage.setItem('buybridge_token', token);
}

// Get stored token
function getToken() {
  return localStorage.getItem('buybridge_token');
}

// Remove token (logout)
function clearToken() {
  localStorage.removeItem('buybridge_token');
  localStorage.removeItem('buybridge_user');
}

// Check if user is logged in
function isLoggedIn() {
  return !!getToken();
}

// Store user data
function setUser(user) {
  localStorage.setItem('buybridge_user', JSON.stringify(user));
}

// Get stored user
function getUser() {
  const user = localStorage.getItem('buybridge_user');
  return user ? JSON.parse(user) : null;
}

// Get user role
function getUserRole() {
  const user = getUser();
  return user ? user.role : null;
}