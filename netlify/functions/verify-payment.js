const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, requireFields } = require('./utils/validation');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { data, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  const { order_id } = data;
  const missingError = requireFields(data, ['order_id']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, total, payment_status, status, escrow_id')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (order.buyer_id !== user.userId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'This order does not belong to you' }) };
  }

  if (!order.escrow_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Payment has not been initiated for this order yet' }) };
  }

  if (order.payment_status !== 'unpaid') {
    return { statusCode: 400, body: JSON.stringify({ error: `Order payment status is already '${order.payment_status}'` }) };
  }

  // ==========================================================
  // MOOLRE COLLECTIONS API PLACEHOLDER — simulate confirmed payment
  // ==========================================================
  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ payment_status: 'escrowed', status: 'paid' })
    .eq('id', order.id)
    .select()
    .single();

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update order', details: updateError.message }) };
  }

  await supabase
    .from('transactions')
    .update({ status: 'success' })
    .eq('order_id', order.id)
    .eq('type', 'escrow_hold');

  const { data: orderWithProduct } = await supabase
    .from('orders')
    .select('product_id, quantity')
    .eq('id', order.id)
    .single();

  if (orderWithProduct) {
    const { data: product } = await supabase
      .from('products')
      .select('quantity_available')
      .eq('id', orderWithProduct.product_id)
      .single();

    if (product) {
      const newQuantity = product.quantity_available - orderWithProduct.quantity;
      await supabase
        .from('products')
        .update({ quantity_available: newQuantity < 0 ? 0 : newQuantity })
        .eq('id', orderWithProduct.product_id);
    }
  }

  await supabase
    .from('notifications')
    .insert([
      {
        user_id: order.seller_id,
        type: 'payment',
        title: 'Payment Received',
        message: 'Payment for order has been received and is held in escrow. Please prepare for delivery.',
        sms_sent: false,
        read: false,
      },
    ]);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Payment confirmed and held in escrow', order: updatedOrder }),
  };
}

exports.handler = withErrorHandling(handler, ['POST']);