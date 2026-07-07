const currentUser = requireAuth();

const params = new URLSearchParams(window.location.search);
const orderId = params.get('id');

const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const orderContent = document.getElementById('order-content');

let order = null;
let isBuyer = false;
let isSeller = false;

async function loadOrder() {
  if (!orderId) {
    showError();
    return;
  }
  try {
    const data = await apiRequest(`get-order?order_id=${orderId}`, 'GET', null, true);
    order = data.order;
    isBuyer = currentUser.id === order.buyer_id;
    isSeller = currentUser.id === order.seller_id;
    renderOrder();
  } catch (err) {
    showError();
  }
}

function showError() {
  loadingState.style.display = 'none';
  errorState.style.display = 'block';
}

function renderOrder() {
  loadingState.style.display = 'none';
  orderContent.style.display = 'block';

  document.getElementById('order-number').textContent = `Order ${order.order_number}`;
  document.getElementById('order-total').textContent = `Total: ${formatCurrency(order.total)}`;
  renderTimeline();
  renderActions();
}

function renderTimeline() {
  const steps = ['pending', 'paid', 'delivered', 'completed'];
  const currentIndex = steps.indexOf(order.status);

  document.getElementById('order-timeline').innerHTML = steps.map((step, i) => `
    <div class="step ${i <= currentIndex ? 'active' : ''}">${step}</div>
  `).join('') + (order.status === 'disputed' ? `<div class="step active">disputed</div>` : '')
    + (order.status === 'cancelled' ? `<div class="step active">cancelled</div>` : '');
}

function renderActions() {
  const notFinal = order.status !== 'completed' && order.status !== 'cancelled';

  // Buyer: OTP input to confirm delivery
  if (isBuyer && order.payment_status === 'escrowed' && !order.otp_verified) {
    document.getElementById('otp-section').style.display = 'block';
    document.getElementById('confirm-delivery-btn').addEventListener('click', handleConfirmDelivery);
  }

  // Seller: send OTP button
  if (isSeller && order.payment_status === 'escrowed' && !order.otp_verified) {
    document.getElementById('send-otp-section').style.display = 'block';
    document.getElementById('send-otp-btn').addEventListener('click', handleSendOtp);
  }

  // Buyer: cancel button, only if unpaid
  if (isBuyer && order.payment_status === 'unpaid') {
    document.getElementById('cancel-section').style.display = 'block';
    document.getElementById('cancel-order-btn').addEventListener('click', handleCancel);
  }

  // Either party: raise dispute, if not already final
  if ((isBuyer || isSeller) && notFinal && order.status !== 'disputed') {
    document.getElementById('dispute-section').style.display = 'block';
    document.getElementById('dispute-form').addEventListener('submit', handleDispute);
  }
}


async function handleConfirmDelivery() {
  const otpCode = document.getElementById('otp_code').value.trim();
  if (!otpCode) {
    showToast('Enter the OTP code', 'error');
    return;
  }
  try {
    await apiRequest('verify-otp', 'POST', { order_id: orderId, otp_code: otpCode }, true);
    showToast('Delivery confirmed! Releasing funds to seller...', 'success');

    await apiRequest('release-funds', 'POST', { order_id: orderId }, true);
    showToast('Funds released to seller!', 'success');

    location.reload();
  } catch (err) {
    showToast(err.message || 'Something went wrong', 'error');
  }
}

async function handleSendOtp() {
  try {
    await apiRequest('send-otp', 'POST', { order_id: orderId }, true);
    showToast('OTP sent to buyer', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to send OTP', 'error');
  }
}

async function handleCancel() {
  if (!confirm('Are you sure you want to cancel this order?')) return;
  try {
    await apiRequest('cancel-order', 'POST', { order_id: orderId }, true);
    showToast('Order cancelled', 'success');
    location.reload();
  } catch (err) {
    showToast(err.message || 'Failed to cancel order', 'error');
  }
}

async function handleDispute(e) {
  e.preventDefault();
  const issueType = document.getElementById('issue_type').value;
  const description = document.getElementById('description').value.trim();

  if (!description) {
    showToast('Please describe the issue', 'error');
    return;
  }

  try {
    await apiRequest('raise-dispute', 'POST', {
      order_id: orderId,
      issue_type: issueType,
      description: description
    }, true);
    showToast('Dispute raised', 'success');
    location.reload();
  } catch (err) {
    showToast(err.message || 'Failed to raise dispute', 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadOrder);