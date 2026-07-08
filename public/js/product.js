// Grab the product ID from the URL, e.g. product.html?id=abc123
const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const detailContainer = document.getElementById('product-detail');

async function loadProduct() {
  if (!productId) {
    showError();
    return;
  }

  try {
    const data = await apiRequest(`get-product?product_id=${productId}`, 'GET', null, false);
    renderProduct(data.product);
  } catch (err) {
    showError();
  }
}

function showError() {
  loadingState.style.display = 'none';
  errorState.style.display = 'block';
}

function renderProduct(product) {
  loadingState.style.display = 'none';
  detailContainer.style.display = 'grid';

  const inStock = product.quantity_available > 0;

  detailContainer.innerHTML = `
    <div class="product-detail-image">
      <img src="${product.image_url || 'https://placehold.co/500x500?text=No+Image'}" alt="${product.name}">
    </div>
    <div class="product-detail-info">
      <h1>${product.name}</h1>
      <p class="product-price">${formatCurrency(product.price)}</p>
      <p class="product-description">${product.description || 'No description provided.'}</p>
      <p class="product-stock">
        ${inStock ? (product.quantity_available <= 5 ? `Only ${product.quantity_available} left in stock` : 'In Stock') : 'Out of stock'}
      </p>

   ${inStock ? `
        <div class="quantity-selector">
          <label for="quantity">Quantity</label>
          <input type="number" id="quantity" value="1" min="1" max="${product.quantity_available}">
        </div>
        <div class="product-detail-actions">
          <button id="add-to-cart-btn" class="btn btn-secondary btn-full">Add to Cart</button>
          <button id="buy-now-btn" class="btn btn-primary btn-full">Buy Now</button>
        </div>
      ` : `
        <button class="btn btn-secondary btn-full" disabled>Out of Stock</button>
      `}
    </div>
  `;
  if (inStock) {
    document.getElementById('buy-now-btn').addEventListener('click', handleBuyNow);
    document.getElementById('add-to-cart-btn').addEventListener('click', () => handleAddToCart(product));
  }
}

function handleAddToCart(product) {
  const quantityInput = document.getElementById('quantity');
  const quantity = parseInt(quantityInput.value, 10);
  if (!quantity || quantity < 1) {
    showToast('Please enter a valid quantity', 'error');
    return;
  }
  addToCart(product, quantity);
  showToast(`${product.name} added to cart`, 'success');
  updateCartBadge();
}
function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return; // navbar might not have loaded yet, or badge doesn't exist on this page
  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-block' : 'none';
}

function handleBuyNow() {
  const quantityInput = document.getElementById('quantity');
  const quantity = parseInt(quantityInput.value, 10);

  if (!quantity || quantity < 1) {
    showToast('Please enter a valid quantity', 'error');
    return;
  }

  window.location.href = `checkout.html?product_id=${productId}&quantity=${quantity}`;
}

document.addEventListener('DOMContentLoaded', loadProduct);
