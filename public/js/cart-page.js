// cart-page.js - renders the cart.html page using cart.js's stored data.
// This file only handles DISPLAY; all actual cart state logic lives in cart.js.

const emptyState = document.getElementById('empty-cart-state');
const cartContent = document.getElementById('cart-content');
const itemsContainer = document.getElementById('cart-items');
const totalAmountEl = document.getElementById('cart-total-amount');

function renderCartPage() {
  const cart = getCart();

  if (cart.length === 0) {
    emptyState.style.display = 'block';
    cartContent.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  cartContent.style.display = 'block';

  itemsContainer.innerHTML = cart.map((item) => `
    <div class="cart-item" data-product-id="${item.product_id}">
      <img src="${item.image_url || 'https://placehold.co/100x100?text=No+Image'}" alt="${item.name}">
      <div class="cart-item-info">
        <h3>${item.name}</h3>
        <p class="cart-item-price">${formatCurrency(item.price)}</p>
      </div>
      <div class="cart-item-quantity">
        <input type="number" class="cart-qty-input" value="${item.quantity}" min="1" data-product-id="${item.product_id}">
      </div>
      <p class="cart-item-subtotal">${formatCurrency(item.price * item.quantity)}</p>
      <button class="cart-remove-btn" data-product-id="${item.product_id}" aria-label="Remove item">&times;</button>
    </div>
  `).join('');

  totalAmountEl.textContent = formatCurrency(getCartTotal());

  // Wire up quantity changes
  document.querySelectorAll('.cart-qty-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const productId = e.target.dataset.productId;
      const newQty = parseInt(e.target.value, 10);
      if (!newQty || newQty < 1) {
        e.target.value = 1;
        return;
      }
      updateCartItemQuantity(productId, newQty);
      renderCartPage();
      updateCartBadge();
    });
  });

  // Wire up remove buttons
  document.querySelectorAll('.cart-remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const productId = e.target.dataset.productId;
      removeFromCart(productId);
      renderCartPage();
      updateCartBadge();
    });
  });
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-block' : 'none';
}

document.getElementById('checkout-btn').addEventListener('click', () => {
  window.location.href = 'checkout.html';
});

document.addEventListener('DOMContentLoaded', () => {
  renderCartPage();
  updateCartBadge();
});
