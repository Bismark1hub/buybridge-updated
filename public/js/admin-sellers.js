const currentUser = requireAuth('admin');

async function loadApplications() {
  try {
    // WORKAROUND: no dedicated endpoint yet.
    // TODO: replace with a real `list-seller-applications` (admin) endpoint when available.
    const usersData = await apiRequest('list-users?role=seller&limit=100', 'GET', null, true);

    const profiles = await Promise.all(
      usersData.users.map(u =>
        apiRequest(`get-seller-profile?user_id=${u.id}`, 'GET', null, false)
          .then(res => ({ user: u, profile: res.seller_profile }))
          .catch(() => null) // seller with no profile yet — skip
      )
    );

    const pending = profiles
      .filter(p => p && p.profile && p.profile.status === 'pending');

    renderApplications(pending);
  } catch (err) {
    showToast(err.message || 'Failed to load applications', 'error');
    document.getElementById('loading-state').style.display = 'none';
  }
}

function renderApplications(applications) {
  document.getElementById('loading-state').style.display = 'none';

  if (applications.length === 0) {
    document.getElementById('empty-state').style.display = 'block';
    return;
  }

  const list = document.getElementById('applications-list');
  list.style.display = 'block';
  list.innerHTML = applications.map(({ user, profile }) => `
    <div class="card">
      <h3>${profile.business_name}</h3>
      <p>Applicant: ${user.full_name} (${user.email})</p>
      <p>Category: ${profile.business_category}</p>
      <p>Address: ${profile.business_address}</p>
      <p>${profile.store_description}</p>
      <a href="${profile.verification_document_url}" target="_blank" rel="noopener">View Document</a>
      <div>
        <button class="btn btn-primary decision-btn" data-id="${profile.id}" data-decision="approved">Approve</button>
        <button class="btn btn-danger decision-btn" data-id="${profile.id}" data-decision="rejected">Reject</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.decision-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDecision(btn.dataset.id, btn.dataset.decision));
  });
}

async function handleDecision(sellerProfileId, decision) {
  try {
    await apiRequest('approve-seller', 'POST', {
      seller_profile_id: sellerProfileId,
      decision: decision
    }, true);
    showToast(`Application ${decision}`, 'success');
    loadApplications(); // refresh the list
  } catch (err) {
    showToast(err.message || 'Failed to update application', 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadApplications);