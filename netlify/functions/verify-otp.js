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

  const { order_id, otp_code } = data;
  const missingError = requireFields(data, ['order_id', 'otp_code']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, otp_code, otp_verified, payment_status, status')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (order.buyer_id !== user.userId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only the buyer can confirm delivery' }) };
  }

  if (order.payment_status !== 'escrowed') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Payment must be escrowed before confirming delivery' }) };
  }

  if (order.otp_verified) {
    return { statusCode: 400, body: JSON.stringify({ error: 'This order has already been confirmed as delivered' }) };
  }

  if (order.otp_code !== otp_code) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Incorrect OTP code' }) };
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ otp_verified: true, status: 'delivered' })
    .eq('id', order.id)
    .select()
    .single();

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to confirm delivery', details: updateError.message }) };
  }

  await supabase
    .from('notifications')
    .insert([
      {
        user_id: order.seller_id,
        type: 'order_update',
        title: 'Delivery Confirmed',
        message: 'The buyer has confirmed delivery. Funds will now be released to you.',
        sms_sent: false,
        read: false,
      },
    ]);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Delivery confirmed successfully. Funds will now be released to the seller.', order: updatedOrder }),
  };
}

exports.handler = withErrorHandling(handler, ['POST']);