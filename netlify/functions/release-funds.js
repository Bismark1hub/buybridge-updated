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
    .select('id, buyer_id, seller_id, total, platform_fee, subtotal, payment_status, status, otp_verified')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
  }

  const isParticipant = order.buyer_id === user.userId || order.seller_id === user.userId;
  const isAdmin = user.role === 'admin';

  if (!isParticipant && !isAdmin) {
    return { statusCode: 403, body: JSON.stringify({ error: 'You are not authorized to release funds for this order' }) };
  }

  if (order.status === 'disputed') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cannot release funds while order is under dispute' }) };
  }

  if (!order.otp_verified) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Delivery must be confirmed via OTP before releasing funds' }) };
  }

  if (order.payment_status !== 'escrowed') {
    return { statusCode: 400, body: JSON.stringify({ error: `Funds cannot be released. Current payment status: '${order.payment_status}'` }) };
  }

  // ==========================================================
  // MOOLRE DISBURSEMENTS API PLACEHOLDER
  // TODO: Replace with a real call to Moolre's Disbursements API
  // ==========================================================
  const payoutReference = `MOOLRE-PAYOUT-SIM-${Date.now()}`;
  const sellerPayoutAmount = order.subtotal;

  console.log(`[SIMULATED PAYOUT] Sending GHS ${sellerPayoutAmount} to seller ${order.seller_id} for order ${order.id}`);

  // Atomic guard: only update if the order is STILL escrowed and STILL not disputed
  // at the exact moment of the update. If another request changed either of these
  // between our check above and now, this matches zero rows and we catch it below.
  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ payment_status: 'released', status: 'completed' })
    .eq('id', order.id)
    .eq('payment_status', 'escrowed')
    .neq('status', 'disputed')
    .select()
    .single();

  if (updateError || !updatedOrder) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Order state changed before funds could be released. Please refresh and check the order status.' }) };
  }

  const { error: transactionError } = await supabase
    .from('transactions')
    .insert([
      {
        order_id: order.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        amount: sellerPayoutAmount,
        fee: order.platform_fee,
        type: 'payout',
        moolre_reference: payoutReference,
        status: 'success',
      },
    ]);

  if (transactionError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Order updated, but failed to log payout transaction', details: transactionError.message }) };
  }

  await supabase
    .from('notifications')
    .insert([
      {
        user_id: order.seller_id,
        type: 'payment',
        title: 'Funds Released',
        message: `GHS ${sellerPayoutAmount} has been released to you for order ${order.id}.`,
        sms_sent: false,
        read: false,
      },
    ]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Funds released to seller successfully (simulated)',
      payout_reference: payoutReference,
      amount_paid_to_seller: sellerPayoutAmount,
      platform_fee_retained: order.platform_fee,
      order: updatedOrder,
    }),
  };
}

exports.handler = withErrorHandling(handler, ['POST']);