// ==================== BUYBRIDGE TOAST SYSTEM ====================

function showToast(message, type = 'info') {
  // Remove any existing toasts
  const existing = document.querySelector('.toast-container');
  if (existing) existing.remove();

  // Create container
  const container = document.createElement('div');
  container.className = 'toast-container';

  // Create toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Icon based on type
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);
  document.body.appendChild(container);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (container.parentElement) {
      container.remove();
    }
  }, 4000);
}