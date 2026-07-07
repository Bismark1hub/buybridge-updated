async function loadCategories() {
  try {
    const result = await apiRequest('list-categories', 'GET', null, false);
    const select = document.getElementById('category');
    result.categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = `${cat.icon || ''} ${cat.name}`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load categories:', err.message);
  }
}

async function loadProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '<p>Loading products...</p>';

  const search = document.getElementById('search').value;
  const category_id = document.getElementById('category').value;
  const min_price = document.getElementById('min_price').value;
  const max_price = document.getElementById('max_price').value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category_id) params.append('category_id', category_id);
  if (min_price) params.append('min_price', min_price);
  if (max_price) params.append('max_price', max_price);

  try {
    const result = await apiRequest(`list-products?${params.toString()}`, 'GET', null, false);

    if (result.products.length === 0) {
      grid.innerHTML = '<p>No products found.</p>';
      return;
    }

    grid.innerHTML = result.products.map((p) => `
      <a href="product.html?id=${p.id}" class="product-card">
        <img src="${p.image_url || 'https://placehold.co/300x300?text=No+Image'}"
             alt="${p.name}"
             onerror="this.onerror=null;this.src='https://placehold.co/300x300?text=No+Image';">
        <h3>${p.name}</h3>
        <p class="price">${formatCurrency(p.price)}</p>
      </a>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<p>Error loading products: ${err.message}</p>`;
  }
}

document.getElementById('apply-filters').addEventListener('click', loadProducts);
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadProducts();
});