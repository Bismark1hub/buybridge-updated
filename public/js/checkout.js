const currentUser = requireAuth('buyer');

const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const checkoutContent = document.getElementById('checkout-content');
const orderSummary = document.getElementById('order-summary');
const checkoutForm = document.getElementById('checkout-form');
const processingState = document.getElementById('processing-state');
const processingMessage = document.getElementById('processing-message');
const submitBtn = document.getElementById('submit-btn');

let cartItems = [];

function loadSummary() {
  cartItems = getCart();

  if (cartItems.length === 0) {
    showError();
    return;
  }

  renderSummary();
}

function showError() {
  loadingState.style.display = 'none';
  errorState.style.display = 'block';
}

function renderSummary() {
  loadingState.style.display = 'none';
  checkoutContent.style.display = 'block';

  const itemsHtml = cartItems.map((item) => `
    <p><strong>${item.name}</strong> — Qty: ${item.quantity} — ${formatCurrency(item.price * item.quantity)}</p>
  `).join('');

  orderSummary.innerHTML = `
    <h2>Order Summary</h2>
    ${itemsHtml}
    <p>Total: ${formatCurrency(getCartTotal())}</p>
    <p class="product-stock">Final total (with platform fee) will be confirmed after order creation. Since your cart has ${cartItems.length} item(s), you'll approve ${cartItems.length} payment${cartItems.length > 1 ? 's' : ''} on your phone, one at a time.</p>
  `;
}

// Repeatedly calls verify-payment until it resolves to 'success' or 'failed'.
async function pollForPaymentConfirmation(orderId) {
  const POLL_INTERVAL_MS = 2500;
  const MAX_ATTEMPTS = 24; // ~60 seconds total before giving up

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await apiRequest('verify-payment', 'POST', { order_id: orderId }, true);

    if (result.status === 'success') {
      return result;
    }
    if (result.status === 'failed') {
      throw new Error(result.message || 'Payment failed or was declined');
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Payment confirmation timed out. Please check your orders page shortly.');
}

// Creates + pays for ONE cart item, start to finish
async function processOneItem(item, index, total) {
  processingMessage.textContent = `Creating order ${index + 1} of ${total} (${item.name})...`;
  const orderData = await apiRequest('create-order', 'POST', {
    product_id: item.product_id,
    quantity: item.quantity,
    delivery_address: document.getElementById('delivery_address').value.trim()
  }, true);

  const orderId = orderData.order.id;

  processingMessage.textContent = `Sending you to payment for order ${index + 1} of ${total}...`;
  await apiRequest('initiate-payment', 'POST', { order_id: orderId }, true);

  processingMessage.textContent = `Approve payment on your phone for order ${index + 1} of ${total} (${item.name})...`;
  await pollForPaymentConfirmation(orderId);

  return orderId;
}

async function handleSubmit(e) {
  e.preventDefault();

  const deliveryAddress = document.getElementById('delivery_address').value.trim();
  if (!deliveryAddress) {
    showToast('Please enter a delivery address', 'error');
    return;
  }

  checkoutForm.style.display = 'none';
  processingState.style.display = 'block';
  submitBtn.disabled = true;

  const createdOrderIds = [];

  try {
    // Process items ONE AT A TIME (not Promise.all) — each payment needs the
    // buyer's phone approval in sequence, so parallel calls would just
    // confuse Moolre and the buyer with overlapping prompts.
    for (let i = 0; i < cartItems.length; i++) {
      const orderId = await processOneItem(cartItems[i], i, cartItems.length);
      createdOrderIds.push(orderId);
    }

   
    clearCart();
    showToast('All orders placed successfully!', 'success');
    window.location.href = 'my-orders.html';

  } catch (err) {
    showToast(err.message || 'Something went wrong. Please try again.', 'error');
    checkoutForm.style.display = 'block';
    processingState.style.display = 'none';
    submitBtn.disabled = false;

    if (createdOrderIds.length > 0) {
      processingMessage.textContent = '';
      showToast(`${createdOrderIds.length} order(s) were already created before this error. Check your orders page.`, 'info');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSummary();
  checkoutForm.addEventListener('submit', handleSubmit);
});
