const currentUser = requireAuth();

async function loadNotifications() {
  try {
    const data = await apiRequest('list-notifications', 'GET', null, true);
    renderNotifications(data.notifications);
  } catch (err) {
    showToast(err.message || 'Failed to load notifications', 'error');
    document.getElementById('loading-state').style.display = 'none';
  }
}

function renderNotifications(notifications) {
  document.getElementById('loading-state').style.display = 'none';

  if (notifications.length === 0) {
    document.getElementById('empty-state').style.display = 'block';
    return;
  }

  const list = document.getElementById('notifications-list');
  list.style.display = 'block';
  list.innerHTML = notifications.map(n => `
    <div class="card ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
      <p>${n.message}</p>
      <p class="product-stock">${new Date(n.created_at).toLocaleString()}</p>
      ${!n.is_read ? `<button class="btn btn-sm btn-secondary mark-read-btn" data-id="${n.id}">Mark Read</button>` : ''}
    </div>
  `).join('');

  document.querySelectorAll('.mark-read-btn').forEach(btn => {
    btn.addEventListener('click', () => markRead(btn.dataset.id));
  });
}

async function markRead(notificationId) {
  try {
    await apiRequest('mark-notification-read', 'POST', { notification_id: notificationId }, true);
    loadNotifications();
  } catch (err) {
    showToast(err.message || 'Failed to update notification', 'error');
  }
}

document.getElementById('mark-all-btn').addEventListener('click', async () => {
  try {
    await apiRequest('mark-notification-read', 'POST', { mark_all: true }, true);
    showToast('All notifications marked as read', 'success');
    loadNotifications();
  } catch (err) {
    showToast(err.message || 'Failed to mark all read', 'error');
  }
});

document.addEventListener('DOMContentLoaded', loadNotifications);