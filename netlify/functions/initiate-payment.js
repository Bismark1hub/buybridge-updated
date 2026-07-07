const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, requireFields } = require('./utils/validation');
const { initiateCollection } = require('./utils/moolre');

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
    .select('id, buyer_id, seller_id, total, payment_status, status')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (order.buyer_id !== user.userId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'This order does not belong to you' }) };
  }

  if (order.payment_status !== 'unpaid') {
    return { statusCode: 400, body: JSON.stringify({ error: `Order payment status is already '${order.payment_status}'` }) };
  }

  // Fetch the buyer's phone number — Moolre needs this to send the payment prompt
  const { data: buyer, error: buyerError } = await supabase
    .from('users')
    .select('phone')
    .eq('id', order.buyer_id)
    .single();

  if (buyerError || !buyer || !buyer.phone) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Buyer phone number not found' }) };
  }

  // ==========================================================
  // MOOLRE COLLECTIONS API (simulated until account is verified)
  // ==========================================================
  const collection = await initiateCollection({
    amount: order.total,
    phone: buyer.phone,
    orderId: order.id,
  });

  const moolreReference = collection.reference;
  const escrow_id = `ESCROW-${order.id}-${Date.now()}`;

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ escrow_id })
    .eq('id', order.id)
    .select()
    .single();

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to initiate payment', details: updateError.message }) };
  }

  await supabase
    .from('transactions')
    .insert([
      {
        order_id: order.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        amount: order.total,
        fee: 0,
        type: 'escrow_hold',
        moolre_reference: moolreReference,
        status: 'pending',
      },
    ]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Payment initiated (simulated). Buyer would now approve payment on their phone via Moolre.',
      escrow_id,
      moolre_reference: moolreReference,
      amount: order.total,
      order: updatedOrder,
    }),
  };
}

exports.handler = withErrorHandling(handler, ['POST']);