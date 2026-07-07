// requireAuth MUST run before anything else — this line either returns
// the logged-in buyer, or redirects away and stops this script.
const currentUser = requireAuth('buyer');

const params = new URLSearchParams(window.location.search);
const productId = params.get('product_id');
const quantity = parseInt(params.get('quantity'), 10) || 1;

const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const checkoutContent = document.getElementById('checkout-content');
const orderSummary = document.getElementById('order-summary');
const checkoutForm = document.getElementById('checkout-form');
const processingState = document.getElementById('processing-state');
const processingMessage = document.getElementById('processing-message');
const submitBtn = document.getElementById('submit-btn');

let product = null;

async function loadSummary() {
  if (!productId) {
    showError();
    return;
  }

  try {
    const data = await apiRequest(`get-product?product_id=${productId}`, 'GET', null, false);
    product = data.product;
    renderSummary();
  } catch (err) {
    showError();
  }
}

function showError() {
  loadingState.style.display = 'none';
  errorState.style.display = 'block';
}

function renderSummary() {
  loadingState.style.display = 'none';
  checkoutContent.style.display = 'block';

  const subtotal = product.price * quantity;

  orderSummary.innerHTML = `
    <h2>Order Summary</h2>
    <p><strong>${product.name}</strong></p>
    <p>Quantity: ${quantity}</p>
    <p>Price each: ${formatCurrency(product.price)}</p>
    <p>Subtotal: ${formatCurrency(subtotal)}</p>
    <p class="product-stock">Final total (with platform fee) will be confirmed after order creation.</p>
  `;
}

// Repeatedly calls verify-payment until it resolves to 'success' or 'failed'.
// Moolre payments require the buyer to approve a prompt on their phone, so
// this can take anywhere from a few seconds to about a minute in real use.
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

    // status === 'pending' — wait, then try again
    processingMessage.textContent = 'Waiting for you to approve payment on your phone...';
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Payment confirmation timed out. Please check your orders page shortly.');
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

  try {
    processingMessage.textContent = 'Creating your order...';
    const orderData = await apiRequest('create-order', 'POST', {
      product_id: productId,
      quantity: quantity,
      delivery_address: deliveryAddress
    }, true);

    const orderId = orderData.order.id;

    processingMessage.textContent = 'Sending you to payment...';
    await apiRequest('initiate-payment', 'POST', { order_id: orderId }, true);

    processingMessage.textContent = 'Confirming payment...';
    await pollForPaymentConfirmation(orderId);

    showToast('Order placed successfully!', 'success');
    window.location.href = `order-detail.html?id=${orderId}`;

  } catch (err) {
    showToast(err.message || 'Something went wrong. Please try again.', 'error');
    // Let the buyer try again instead of stranding them on a dead page
    checkoutForm.style.display = 'block';
    processingState.style.display = 'none';
    submitBtn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSummary();
  checkoutForm.addEventListener('submit', handleSubmit);
});