// cart.js - shared cart state, stored in localStorage.
// Every page (product page, cart page, nav badge) reads/writes through these
// functions only — nobody should touch localStorage directly elsewhere.
// This keeps the storage format in one place if we ever need to change it.

const CART_STORAGE_KEY = 'buybridge_cart';

// Returns the raw cart array: [{ product_id, seller_id, name, price, image_url, quantity }, ...]
function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read cart:', err.message);
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

// product must include: id, seller_id, name, price, image_url
function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.product_id === product.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      product_id: product.id,
      seller_id: product.seller_id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity: quantity,
    });
  }

  saveCart(cart);
}

function updateCartItemQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find((i) => i.product_id === productId);
  if (!item) return;

  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  item.quantity = quantity;
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter((i) => i.product_id !== productId);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
}

// Total number of items (used for the nav badge)
function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

// Total price across all items
function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}
