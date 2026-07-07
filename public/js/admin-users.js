const currentUser = requireAuth('admin');

const roleFilter = document.getElementById('role-filter');
const searchInput = document.getElementById('search-input');
let debounceTimer = null;

async function loadUsers() {
  const role = roleFilter.value;
  const search = searchInput.value.trim();

  const queryParams = new URLSearchParams();
  if (role) queryParams.set('role', role);
  if (search) queryParams.set('search', search);

  try {
    const data = await apiRequest(`list-users?${queryParams.toString()}`, 'GET', null, true);
    renderUsers(data.users);
  } catch (err) {
    showToast(err.message || 'Failed to load users', 'error');
  }
}

function renderUsers(users) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('table-wrapper').style.display = 'block';

  document.getElementById('users-tbody').innerHTML = users.map(u => `
    <tr>
      <td>${u.full_name}</td>
      <td>${u.email}</td>
      <td>${u.phone || '-'}</td>
      <td><span class="badge">${u.role}</span></td>
      <td>${new Date(u.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

roleFilter.addEventListener('change', loadUsers);

// Debounce search so we don't fire an API call on every keystroke
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadUsers, 400);
});

document.addEventListener('DOMContentLoaded', loadUsers);