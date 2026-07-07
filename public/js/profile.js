// js/profile.js
const currentUser = requireAuth();

document.getElementById('profile-name').textContent = currentUser.full_name;
document.getElementById('profile-email').textContent = currentUser.email;
document.getElementById('profile-phone').textContent = currentUser.phone || '-';
document.getElementById('profile-role').textContent = currentUser.role;

// Optional: re-verify against the backend in case the cached user is stale
apiRequest('auth-verify', 'GET', null, true)
  .then(data => {
    document.getElementById('profile-name').textContent = data.user.full_name;
    document.getElementById('profile-email').textContent = data.user.email;
    document.getElementById('profile-phone').textContent = data.user.phone || '-';
    document.getElementById('profile-role').textContent = data.user.role;
  })
  .catch(() => {
    // silent fail — cached user data is still shown, no need to alarm the user
  });