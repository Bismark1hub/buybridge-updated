const currentUser = requireAuth('admin');

const modal = document.getElementById('resolve-modal');

async function loadDisputes() {
  try {
    const data = await apiRequest('list-disputes', 'GET', null, true);
    renderDisputes(data.disputes);
  } catch (err) {
    showToast(err.message || 'Failed to load disputes', 'error');
    document.getElementById('loading-state').style.display = 'none';
  }
}

function renderDisputes(disputes) {
  document.getElementById('loading-state').style.display = 'none';

  if (disputes.length === 0) {
    document.getElementById('empty-state').style.display = 'block';
    return;
  }

  const list = document.getElementById('disputes-list');
  list.style.display = 'block';
  list.innerHTML = disputes.map(d => `
    <div class="card">
      <h3>${d.issue_type.replace(/_/g, ' ')}</h3>
      <p>Order: ${d.order_id}</p>
      <p>${d.description}</p>
      <button class="btn btn-primary resolve-btn" data-id="${d.id}">Resolve</button>
    </div>
  `).join('');

  document.querySelectorAll('.resolve-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.id));
  });
}

function openModal(disputeId) {
  document.getElementById('dispute_id').value = disputeId;
  modal.style.display = 'flex';
}

function closeModal() {
  modal.style.display = 'none';
  document.getElementById('resolve-form').reset();
}

document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);

document.getElementById('resolve-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    dispute_id: document.getElementById('dispute_id').value,
    outcome: document.getElementById('outcome').value,
    resolution_notes: document.getElementById('resolution_notes').value.trim()
  };

  try {
    await apiRequest('resolve-dispute', 'POST', payload, true);
    showToast('Dispute resolved', 'success');
    closeModal();
    loadDisputes();
  } catch (err) {
    showToast(err.message || 'Failed to resolve dispute', 'error');
  }
});

document.addEventListener('DOMContentLoaded', loadDisputes);