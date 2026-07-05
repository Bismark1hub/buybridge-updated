const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, requireFields, isPositiveNumber } = require('./utils/validation');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { data, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  const { product_id, quantity, delivery_address } = data;

  const missingError = requireFields(data, ['product_id', 'quantity', 'delivery_address']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  if (!isPositiveNumber(quantity)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Quantity must be a positive number' }) };
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, seller_id, name, price, quantity_available, status')
    .eq('id', product_id)
    .single();

  if (productError || !product) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
  }

  if (product.status !== 'active') {
    return { statusCode: 400, body: JSON.stringify({ error: 'This product is not currently available for purchase' }) };
  }

  if (product.quantity_available < quantity) {
    return { statusCode: 400, body: JSON.stringify({ error: `Only ${product.quantity_available} units available` }) };
  }

  if (product.seller_id === user.userId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'You cannot order your own product' }) };
  }

  const { data: feeSetting } = await supabase
    .from('platform_settings')
    .select('setting_value')
    .eq('setting_key', 'platform_fee_percent')
    .single();

  const feePercent = feeSetting ? parseFloat(feeSetting.setting_value) : 5;

  const unit_price = product.price;
  const subtotal = unit_price * quantity;
  const platform_fee = Math.round((subtotal * (feePercent / 100)) * 100) / 100;
  const total = subtotal + platform_fee;
  const order_number = `BB-${Date.now()}`;
  const otp_code = Math.floor(100000 + Math.random() * 900000).toString();

  const { data: newOrder, error: insertError } = await supabase
    .from('orders')
    .insert([
      {
        order_number,
        buyer_id: user.userId,
        seller_id: product.seller_id,
        product_id: product.id,
        quantity,
        unit_price,
        subtotal,
        platform_fee,
        total,
        delivery_address,
        status: 'pending',
        payment_status: 'unpaid',
        otp_code,
        otp_verified: false,
      },
    ])
    .select()
    .single();

  if (insertError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create order', details: insertError.message }) };
  }

  return { statusCode: 201, body: JSON.stringify({ message: 'Order created successfully', order: newOrder }) };
}

exports.handler = withErrorHandling(handler, ['POST']);