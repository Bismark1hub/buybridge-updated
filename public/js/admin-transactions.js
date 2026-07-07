const currentUser = requireAuth('admin');

const typeFilter = document.getElementById('type-filter');
const statusFilter = document.getElementById('status-filter');

async function loadTransactions() {
  const queryParams = new URLSearchParams();
  if (typeFilter.value) queryParams.set('type', typeFilter.value);
  if (statusFilter.value) queryParams.set('status', statusFilter.value);

  try {
    const data = await apiRequest(`platform-transactions?${queryParams.toString()}`, 'GET', null, true);
    renderTransactions(data.transactions);
  } catch (err) {
    showToast(err.message || 'Failed to load transactions', 'error');
  }
}

function renderTransactions(transactions) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('table-wrapper').style.display = 'block';

  document.getElementById('tx-tbody').innerHTML = transactions.map(tx => `
    <tr>
      <td>${tx.order_id}</td>
      <td>${tx.type}</td>
      <td>${formatCurrency(tx.amount)}</td>
      <td><span class="badge">${tx.status}</span></td>
      <td>${new Date(tx.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

typeFilter.addEventListener('change', loadTransactions);
statusFilter.addEventListener('change', loadTransactions);
document.addEventListener('DOMContentLoaded', loadTransactions);