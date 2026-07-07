const currentUser = requireAuth('admin');

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const value = document.getElementById('platform_fee_percent').value;

  try {
    await apiRequest('update-settings', 'POST', {
      setting_key: 'platform_fee_percent',
      setting_value: value
    }, true);
    showToast('Setting updated', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update setting', 'error');
  }
});