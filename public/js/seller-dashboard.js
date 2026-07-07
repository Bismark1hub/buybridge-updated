const currentUser = requireAuth('seller');

async function loadStats() {
  try {
    const data = await apiRequest('get-my-orders?as=seller', 'GET', null, true);
    renderStats(data.orders);
  } catch (err) {
    showToast(err.message || 'Failed to load dashboard', 'error');
    document.getElementById('loading-state').style.display = 'none';
  }
}

function renderStats(orders) {
  document.getElementById('loading-state').style.display = 'none';

  const counts = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    paid: orders.filter(o => o.status === 'paid').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    completed: orders.filter(o => o.status === 'completed').length,
    disputed: orders.filter(o => o.status === 'disputed').length
  };

  const revenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.total), 0);

  const grid = document.getElementById('stats-grid');
  grid.style.display = 'grid';
  grid.innerHTML = `
    <div class="card"><h3>${counts.total}</h3><p>Total Orders</p></div>
    <div class="card"><h3>${counts.pending}</h3><p>Pending</p></div>
    <div class="card"><h3>${counts.paid}</h3><p>Paid</p></div>
    <div class="card"><h3>${counts.delivered}</h3><p>Delivered</p></div>
    <div class="card"><h3>${counts.completed}</h3><p>Completed</p></div>
    <div class="card"><h3>${counts.disputed}</h3><p>Disputed</p></div>
    <div class="card"><h3>${formatCurrency(revenue)}</h3><p>Revenue (Completed)</p></div>
  `;
}

document.addEventListener('DOMContentLoaded', loadStats);