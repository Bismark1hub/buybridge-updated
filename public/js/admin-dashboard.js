const currentUser = requireAuth('admin');

async function loadStats() {
  try {
    const [usersData, txData, disputesData] = await Promise.all([
      apiRequest('list-users?limit=1', 'GET', null, true),
      apiRequest('platform-transactions?limit=1', 'GET', null, true),
      apiRequest('list-disputes', 'GET', null, true)
    ]);

    renderStats({
      totalUsers: usersData.pagination ? usersData.pagination.total : usersData.users.length,
      totalTransactions: txData.pagination ? txData.pagination.total : txData.transactions.length,
      openDisputes: disputesData.disputes.filter(d => !d.resolved_at).length
    });
  } catch (err) {
    showToast(err.message || 'Failed to load dashboard', 'error');
    document.getElementById('loading-state').style.display = 'none';
  }
}

function renderStats(stats) {
  document.getElementById('loading-state').style.display = 'none';
  const grid = document.getElementById('stats-grid');
  grid.style.display = 'grid';
  grid.innerHTML = `
    <div class="card"><h3>${stats.totalUsers}</h3><p>Total Users</p></div>
    <div class="card"><h3>${stats.totalTransactions}</h3><p>Total Transactions</p></div>
    <div class="card"><h3>${stats.openDisputes}</h3><p>Open Disputes</p></div>
  `;
}

document.addEventListener('DOMContentLoaded', loadStats);