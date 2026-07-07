const currentUser = requireAuth('seller');

async function loadMyProducts() {
  try {
    // WORKAROUND: no dedicated endpoint yet — pulling all products and filtering client-side.
    // TODO: replace with a real `list-my-products` (auth, seller) endpoint when available.
    const data = await apiRequest('list-products?limit=100', 'GET', null, false);
    const myProducts = data.products.filter(p => p.seller_id === currentUser.id);
    renderProducts(myProducts);
  } catch (err) {
    showToast(err.message || 'Failed to load products', 'error');
    document.getElementById('loading-state').style.display = 'none';
  }
}

function renderProducts(products) {
  document.getElementById('loading-state').style.display = 'none';

  if (products.length === 0) {
    document.getElementById('empty-state').style.display = 'block';
    return;
  }

  const grid = document.getElementById('product-grid');
  grid.style.display = 'grid';
  grid.innerHTML = products.map(p => `
    <div class="card product-card">
      <img src="${p.image_url || 'https://placehold.co/300x300?text=No+Image'}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p>${formatCurrency(p.price)}</p>
      <p>${p.quantity_available} in stock</p>
      <a href="edit-product.html?id=${p.id}" class="btn btn-sm btn-secondary">Edit</a>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', loadMyProducts);