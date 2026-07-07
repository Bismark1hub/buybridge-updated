const currentUser = requireAuth('seller');

document.getElementById('seller-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    business_name: document.getElementById('business_name').value.trim(),
    business_address: document.getElementById('business_address').value.trim(),
    business_category: document.getElementById('business_category').value.trim(),
    store_description: document.getElementById('store_description').value.trim(),
    verification_document_url: document.getElementById('verification_document_url').value.trim()
  };

  try {
    await apiRequest('submit-seller-application', 'POST', payload, true);
    showToast('Application submitted! We\'ll review it shortly.', 'success');
    setTimeout(() => window.location.href = 'seller-dashboard.html', 1000);
  } catch (err) {
    showToast(err.message || 'Failed to submit application', 'error');
  }
});