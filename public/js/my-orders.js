const currentUser = requireAuth('buyer');

const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const tableWrapper = document.getElementById('orders-table-wrapper');
const tbody = document.getElementById('orders-tbody');

async function loadOrders() {
  try {
    const data = await apiRequest('get-my-orders?as=buyer', 'GET', null, true);
    renderOrders(data.orders);
  } catch (err) {
    showToast(err.message || 'Failed to load orders', 'error');
    loadingState.style.display = 'none';
  }
}

function renderOrders(orders) {
  loadingState.style.display = 'none';

  if (!orders || orders.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  tableWrapper.style.display = 'block';
  tbody.innerHTML = orders.map(order => `
    <tr>
      <td>${order.order_number}</td>
      <td>${formatCurrency(order.total)}</td>
      <td><span class="badge badge-${order.status}">${order.status}</span></td>
      <td><span class="badge badge-${order.payment_status}">${order.payment_status}</span></td>
      <td>${new Date(order.created_at).toLocaleDateString()}</td>
      <td><a href="order-detail.html?id=${order.id}" class="btn btn-sm btn-secondary">View</a></td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', loadOrders);