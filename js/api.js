// ==================== BUYBRIDGE API HELPERS ====================

// Generic fetch wrapper with auth
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add auth header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    // Handle 401 - redirect to login
    if (response.status === 401) {
      clearToken();
      window.location.href = '/pages/login.html';
      return null;
    }

    // Handle 403 - access denied
    if (response.status === 403) {
      showToast('Access denied. You do not have permission.', 'error');
      return null;
    }

    const data = await response.json();

    // If not OK, throw with error message
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    return data;
  } catch (error) {
    // Handle 409 conflict
    if (error.message.includes('refresh and try again')) {
      showToast('Please refresh and try again.', 'warning');
    } else {
      showToast(error.message, 'error');
    }
    throw error;
  }
}

// ==================== SPECIFIC API CALLS ====================

// Auth
async function apiSignup(email, password, fullName, phone, role) {
  return apiFetch('/api/auth-signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: fullName, phone, role })
  });
}

async function apiLogin(email, password) {
  return apiFetch('/api/auth-login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

async function apiVerifyToken() {
  return apiFetch('/api/auth-verify');
}

// Products (public)
async function apiListProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/api/list-products${query ? '?' + query : ''}`);
}

async function apiGetProduct(productId) {
  return apiFetch(`/api/get-product?id=${productId}`);
}

// Seller products
async function apiCreateProduct(productData) {
  return apiFetch('/api/create-product', {
    method: 'POST',
    body: JSON.stringify(productData)
  });
}

async function apiUpdateProduct(productData) {
  return apiFetch('/api/update-product', {
    method: 'POST',
    body: JSON.stringify(productData)
  });
}

// Orders
async function apiCreateOrder(orderData) {
  return apiFetch('/api/create-order', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
}

async function apiGetMyOrders() {
  return apiFetch('/api/get-my-orders');
}

async function apiGetOrder(orderId) {
  return apiFetch(`/api/get-order?id=${orderId}`);
}

async function apiCancelOrder(orderId) {
  return apiFetch('/api/cancel-order', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId })
  });
}

// Payments
async function apiInitiatePayment(orderId) {
  return apiFetch('/api/initiate-payment', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId })
  });
}

async function apiVerifyPayment(orderId) {
  return apiFetch('/api/verify-payment', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId })
  });
}

async function apiReleaseFunds(orderId) {
  return apiFetch('/api/release-funds', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId })
  });
}

// OTP
async function apiSendOTP(orderId) {
  return apiFetch('/api/send-otp', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId })
  });
}

async function apiVerifyOTP(orderId, otpCode) {
  return apiFetch('/api/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, otp_code: otpCode })
  });
}

// Disputes
async function apiRaiseDispute(disputeData) {
  return apiFetch('/api/raise-dispute', {
    method: 'POST',
    body: JSON.stringify(disputeData)
  });
}

async function apiListDisputes(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/api/list-disputes${query ? '?' + query : ''}`);
}

async function apiResolveDispute(disputeData) {
  return apiFetch('/api/resolve-dispute', {
    method: 'POST',
    body: JSON.stringify(disputeData)
  });
}

// Notifications
async function apiListNotifications(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/api/list-notifications${query ? '?' + query : ''}`);
}

async function apiMarkNotificationRead(data) {
  return apiFetch('/api/mark-notification-read', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// Seller
async function apiSubmitSellerApplication(data) {
  return apiFetch('/api/submit-seller-application', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function apiGetSellerProfile(userId) {
  return apiFetch(`/api/get-seller-profile?user_id=${userId}`);
}

// Admin
async function apiListUsers() {
  return apiFetch('/api/list-users');
}

async function apiApproveSeller(profileId) {
  return apiFetch('/api/approve-seller', {
    method: 'POST',
    body: JSON.stringify({ seller_profile_id: profileId })
  });
}

async function apiPlatformTransactions(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/api/platform-transactions${query ? '?' + query : ''}`);
}

async function apiUpdateSettings(key, value) {
  return apiFetch('/api/update-settings', {
    method: 'POST',
    body: JSON.stringify({ setting_key: key, setting_value: value })
  });
}