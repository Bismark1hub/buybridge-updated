const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Step 1: Must be logged in
  const user = getUserFromEvent(event);
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  // Step 2: Parse and validate input
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  const { product_id, quantity, delivery_address } = data;

  if (!product_id || !quantity || !delivery_address) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: product_id, quantity, delivery_address' }),
    };
  }

  if (typeof quantity !== 'number' || quantity <= 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Quantity must be a positive number' }),
    };
  }

  // Step 3: Fetch the product and confirm it's actually purchasable
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, seller_id, name, price, quantity_available, status')
    .eq('id', product_id)
    .single();

  if (productError || !product) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Product not found' }),
    };
  }

  if (product.status !== 'active') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'This product is not currently available for purchase' }),
    };
  }

  if (product.quantity_available < quantity) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Only ${product.quantity_available} units available` }),
    };
  }

  // Step 4: Prevent a seller from buying their own product
  if (product.seller_id === user.userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'You cannot order your own product' }),
    };
  }

// Step 5: Fetch the current platform fee percentage from settings
  const { data: feeSetting } = await supabase
    .from('platform_settings')
    .select('setting_value')
    .eq('setting_key', 'platform_fee_percent')
    .single();

  const feePercent = feeSetting ? parseFloat(feeSetting.setting_value) : 5;

  // Step 6: Calculate pricing
  const unit_price = product.price;
  const subtotal = unit_price * quantity;
  const platform_fee = Math.round((subtotal * (feePercent / 100)) * 100) / 100;
  const total = subtotal + platform_fee;

  // Step 7: Generate a human-friendly order number
  const order_number = `BB-${Date.now()}`;

  // Step 8: Generate a 6-digit OTP for delivery confirmation later
  const otp_code = Math.floor(100000 + Math.random() * 900000).toString();

  // Step 9: Insert the order
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create order', details: insertError.message }),
    };
  }

  return {
    statusCode: 201,
    body: JSON.stringify({ message: 'Order created successfully', order: newOrder }),
  };
}; 
