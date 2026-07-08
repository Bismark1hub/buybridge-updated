const currentUser = requireAuth('seller');

const params = new URLSearchParams(window.location.search);
const productId = params.get('id'); // present only in edit mode
const isEditMode = !!productId;

const form = document.getElementById('product-form');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const categorySelect = document.getElementById('category_id');
const imageFileInput = document.getElementById('image_file');
const imagePreview = document.getElementById('image_preview');

let existingImageUrl = null; // used in edit mode if seller doesn't pick a new file

// Show a live preview when a file is chosen
imageFileInput.addEventListener('change', () => {
  const file = imageFileInput.files[0];
  if (!file) return;
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display = 'block';
});

async function loadCategories() {
  try {
    const data = await apiRequest('list-categories', 'GET', null, false);
    categorySelect.innerHTML = data.categories.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');
  } catch (err) {
    showToast('Failed to load categories', 'error');
  }
}

async function loadExistingProduct() {
  if (!isEditMode) return;

  formTitle.textContent = 'Edit Product';
  submitBtn.textContent = 'Save Changes';

  try {
    const data = await apiRequest(`get-product?product_id=${productId}`, 'GET', null, false);
    const p = data.product;
    document.getElementById('name').value = p.name;
    document.getElementById('description').value = p.description;
    document.getElementById('price').value = p.price;
    document.getElementById('quantity_available').value = p.quantity_available;
    categorySelect.value = p.category_id;

    existingImageUrl = p.image_url || null;
    if (existingImageUrl) {
      imagePreview.src = existingImageUrl;
      imagePreview.style.display = 'block';
    }
  } catch (err) {
    showToast('Failed to load product for editing', 'error');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  submitBtn.disabled = true;
  submitBtn.textContent = isEditMode ? 'Saving...' : 'Uploading...';

  try {
    const file = imageFileInput.files[0];
    let image_url = existingImageUrl; // keep existing image if no new file chosen

    if (file) {
      image_url = await uploadProductImage(file);
    }

    const payload = {
      name: document.getElementById('name').value.trim(),
      description: document.getElementById('description').value.trim(),
      price: parseFloat(document.getElementById('price').value),
      quantity_available: parseInt(document.getElementById('quantity_available').value, 10),
      category_id: categorySelect.value,
      image_url: image_url
    };

    if (isEditMode) {
      await apiRequest('update-product', 'POST', { product_id: productId, ...payload }, true);
      showToast('Product updated!', 'success');
    } else {
      await apiRequest('create-product', 'POST', payload, true);
      showToast('Product added!', 'success');
    }
    setTimeout(() => window.location.href = 'my-products.html', 1000);

  } catch (err) {
    showToast(err.message || 'Failed to save product', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = isEditMode ? 'Save Changes' : 'Add Product';
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  await loadExistingProduct();
});
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result looks like "data:image/png;base64,iVBORw0KG..."
      // we only want the part AFTER the comma
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
// Resizes + compresses an image in the browser before upload.
// Why: sellers uploading photos straight from their phone can be 3-5MB+,
// which makes every page that shows that image slow to load. Shrinking to
// a reasonable max size (1200px) and compressing to JPEG at 80% quality
// cuts most product photos down to a few hundred KB with no visible
// quality loss on a product listing.
function resizeImage(file, maxDimension = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl); // free memory once the image is loaded

      let { width, height } = img;

      // Only shrink if the image is bigger than maxDimension — never upscale
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image compression failed'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for resizing'));
    };

    img.src = objectUrl;
  });
}
async function uploadProductImage(file) {
  const resizedBlob = await resizeImage(file);
  const base64 = await fileToBase64(resizedBlob);

  const data = await apiRequest('upload-image', 'POST', {
    file_base64: base64,
    file_name: file.name.replace(/\.[^/.]+$/, '.jpg'), // extension now matches the actual JPEG output
    file_type: 'image/jpeg'
  }, true);

  return data.image_url;
}
