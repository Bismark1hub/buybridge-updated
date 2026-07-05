const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, isPositiveNumber, isNonNegativeNumber, isAllowedValue } = require('./utils/validation');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (user.role !== 'seller') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only sellers can update products' }) };
  }

  const { data: body, error: parseError } = parseJsonBody(event);
if (parseError) {
  return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
}
if (!body || !body.productId) {
  return { statusCode: 400, body: JSON.stringify({ error: 'productId is required' }) };
}

  // Fetch the existing product first so we can check ownership
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('id, seller_id')
    .eq('id', body.productId)
    .single();

  if (fetchError || !existingProduct) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
  }

  if (existingProduct.seller_id !== user.userId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'You do not own this product' }) };
  }

  // Build the update object from only the fields that were actually provided
  const updates = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;

  if (body.price !== undefined) {
    if (!isPositiveNumber(body.price)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'price must be a positive number' }) };
    }
    updates.price = body.price;
  }

 if (body.quantity !== undefined) {
    if (!isNonNegativeNumber(body.quantity)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'quantity must be zero or a positive number' }) };
    }
    updates.quantity_available = body.quantity;
  }

  if (body.status !== undefined) {
    if (!isAllowedValue(body.status, ['active', 'inactive', 'sold_out'])) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid status value' }) };
    }
    updates.status = body.status;
  }

  if (body.image_url !== undefined) updates.image_url = body.image_url;

  if (Object.keys(updates).length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No valid fields provided to update' }) };
  }

  const { data: updatedProduct, error: updateError } = await supabase
    .from('products')
    .update(updates)
    .eq('id', body.productId)
    .select()
    .single();

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update product' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ message: 'Product updated successfully', product: updatedProduct }) };
}

exports.handler = withErrorHandling(handler, ['POST']);