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
    .select('id, buyer_id, seller_id, otp_code, otp_verified, payment_status, status')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (order.buyer_id !== user.userId && order.seller_id !== user.userId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'You are not part of this order' }) };
  }

  if (order.payment_status !== 'escrowed') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Payment must be confirmed before sending the delivery OTP' }) };
  }

  if (order.otp_verified) {
    return { statusCode: 400, body: JSON.stringify({ error: 'This order has already been confirmed as delivered' }) };
  }

  // ==========================================================
  // MOOLRE SMS API PLACEHOLDER
  // TODO: Replace with a real call to Moolre's SMS API using order.otp_code
  // ==========================================================
  console.log(`[SIMULATED SMS] Sending OTP ${order.otp_code} to buyer for order ${order.id}`);

  const { error: notificationError } = await supabase
    .from('notifications')
    .insert([
      {
        user_id: order.buyer_id,
        type: 'otp',
        title: 'Delivery Confirmation Code',
        message: `Your delivery confirmation code is ${order.otp_code}. Share this with the seller only after you've received your order.`,
        sms_sent: true,
        read: false,
      },
    ]);

  if (notificationError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to log OTP notification', details: notificationError.message }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'OTP sent to buyer (simulated)',
      otp_code_for_testing: order.otp_code, // TODO: remove before going live
    }),
  };
}

exports.handler = withErrorHandling(handler, ['POST']);