const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, requireFields, isPositiveNumber } = require('./utils/validation');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (user.role !== 'seller') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only sellers can create products' }) };
  }

  const { data, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  const { name, description, price, quantity_available, category_id, image_url } = data;

  const missingError = requireFields(data, ['name', 'description', 'price', 'quantity_available', 'category_id']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  if (!isPositiveNumber(price)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Price must be a positive number' }) };
  }

  if (!isPositiveNumber(quantity_available)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Quantity available must be a positive number' }) };
  }

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', category_id)
    .single();

  if (categoryError || !category) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid category_id' }) };
  }

  const { data: newProduct, error: insertError } = await supabase
    .from('products')
    .insert([
      {
        seller_id: user.userId,
        name,
        description,
        price,
        quantity_available,
        category_id,
        image_url: image_url || null,
        status: 'active',
      },
    ])
    .select()
    .single();

  if (insertError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create product', details: insertError.message }) };
  }

  return { statusCode: 201, body: JSON.stringify({ message: 'Product created successfully', product: newProduct }) };
}

exports.handler = withErrorHandling(handler, ['POST']);