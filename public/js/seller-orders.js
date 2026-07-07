const currentUser = requireAuth('seller');

async function loadOrders() {
  try {
    const data = await apiRequest('get-my-orders?as=seller', 'GET', null, true);
    renderOrders(data.orders);
  } catch (err) {
    showToast(err.message || 'Failed to load orders', 'error');
    document.getElementById('loading-state').style.display = 'none';
  }
}

function renderOrders(orders) {
  document.getElementById('loading-state').style.display = 'none';

  if (orders.length === 0) {
    document.getElementById('empty-state').style.display = 'block';
    return;
  }

  document.getElementById('orders-table-wrapper').style.display = 'block';
  document.getElementById('orders-tbody').innerHTML = orders.map(order => {
    const canSendOtp = order.payment_status === 'escrowed' && !order.otp_verified;
    return `
      <tr>
        <td>${order.order_number}</td>
        <td>${formatCurrency(order.total)}</td>
        <td><span class="badge badge-${order.status}">${order.status}</span></td>
        <td><span class="badge badge-${order.payment_status}">${order.payment_status}</span></td>
        <td>
          <a href="order-detail.html?id=${order.id}" class="btn btn-sm btn-secondary">View</a>
          ${canSendOtp ? `<button class="btn btn-sm btn-primary send-otp-btn" data-order-id="${order.id}">Send OTP</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.send-otp-btn').forEach(btn => {
    btn.addEventListener('click', () => handleSendOtp(btn.dataset.orderId));
  });
}

async function handleSendOtp(orderId) {
  try {
    await apiRequest('send-otp', 'POST', { order_id: orderId }, true);
    showToast('OTP sent to buyer', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to send OTP', 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadOrders);