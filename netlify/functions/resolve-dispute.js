const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, requireFields, isAllowedValue } = require('./utils/validation');

const ALLOWED_OUTCOMES = ['resolved_buyer', 'resolved_seller'];

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (user.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only admins can resolve disputes' }) };
  }

  const { data, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  const { dispute_id, outcome, resolution_notes } = data;

  const missingError = requireFields(data, ['dispute_id', 'outcome', 'resolution_notes']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  if (!isAllowedValue(outcome, ALLOWED_OUTCOMES)) {
    return { statusCode: 400, body: JSON.stringify({ error: `Invalid outcome. Must be one of: ${ALLOWED_OUTCOMES.join(', ')}` }) };
  }

  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select('id, order_id, status')
    .eq('id', dispute_id)
    .single();

  if (disputeError || !dispute) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Dispute not found' }) };
  }

  if (['resolved_buyer', 'resolved_seller', 'closed'].includes(dispute.status)) {
    return { statusCode: 400, body: JSON.stringify({ error: `This dispute is already resolved (status: '${dispute.status}')` }) };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, total, subtotal, platform_fee, payment_status, status')
    .eq('id', dispute.order_id)
    .single();

  if (orderError || !order) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Related order not found' }) };
  }

  // Guard against double-processing: if the order's payment_status is no longer
  // 'escrowed' (e.g. a previous resolve attempt already moved the money but failed
  // to update the dispute status), refuse to move money again.
  if (order.payment_status !== 'escrowed') {
    return { statusCode: 400, body: JSON.stringify({ error: `Cannot resolve dispute. Order payment status is already '${order.payment_status}'` }) };
  }

  if (outcome === 'resolved_buyer') {
    // TODO: Replace with real Moolre refund/disbursement API call
    const refundReference = `MOOLRE-REFUND-SIM-${Date.now()}`;
    console.log(`[SIMULATED REFUND] Refunding GHS ${order.total} to buyer ${order.buyer_id} for order ${order.id}`);

    // Atomic guard: only update if the order is STILL escrowed at this exact moment.
    // If a race changed payment_status between our check above and now, this
    // matches zero rows and we catch it below instead of refunding twice.
    const { data: refundedOrder, error: refundUpdateError } = await supabase
      .from('orders')
      .update({ payment_status: 'refunded', status: 'cancelled' })
      .eq('id', order.id)
      .eq('payment_status', 'escrowed')
      .select()
      .single();

    if (refundUpdateError || !refundedOrder) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Order payment status changed before the refund could be processed. Please review this order manually.' }) };
    }

    await supabase.from('transactions').insert([
      {
        order_id: order.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        amount: order.total,
        fee: 0,
        type: 'refund',
        moolre_reference: refundReference,
        status: 'success',
      },
    ]);

    await supabase.from('notifications').insert([
      { user_id: order.buyer_id, type: 'dispute', title: 'Dispute Resolved — Refund Issued', message: `Your dispute was resolved in your favor. GHS ${order.total} has been refunded.`, sms_sent: false, read: false },
      { user_id: order.seller_id, type: 'dispute', title: 'Dispute Resolved', message: "The dispute for your order was resolved in the buyer's favor.", sms_sent: false, read: false },
    ]);
  } else if (outcome === 'resolved_seller') {
    // TODO: Replace with real Moolre Disbursements API call
    const payoutReference = `MOOLRE-PAYOUT-SIM-${Date.now()}`;
    console.log(`[SIMULATED PAYOUT] Sending GHS ${order.subtotal} to seller ${order.seller_id} for order ${order.id}`);

    // Atomic guard: same reasoning as the refund branch above, applied to payouts.
    const { data: paidOutOrder, error: payoutUpdateError } = await supabase
      .from('orders')
      .update({ payment_status: 'released', status: 'completed' })
      .eq('id', order.id)
      .eq('payment_status', 'escrowed')
      .select()
      .single();

    if (payoutUpdateError || !paidOutOrder) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Order payment status changed before the payout could be processed. Please review this order manually.' }) };
    }

    await supabase.from('transactions').insert([
      {
        order_id: order.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        amount: order.subtotal,
        fee: order.platform_fee,
        type: 'payout',
        moolre_reference: payoutReference,
        status: 'success',
      },
    ]);

    await supabase.from('notifications').insert([
      { user_id: order.seller_id, type: 'dispute', title: 'Dispute Resolved — Funds Released', message: `The dispute was resolved in your favor. GHS ${order.subtotal} has been released to you.`, sms_sent: false, read: false },
      { user_id: order.buyer_id, type: 'dispute', title: 'Dispute Resolved', message: "The dispute for your order was resolved in the seller's favor.", sms_sent: false, read: false },
    ]);
  }

  const { data: updatedDispute, error: disputeUpdateError } = await supabase
    .from('disputes')
    .update({ status: outcome, resolution_notes, resolved_by: user.userId, resolved_at: new Date().toISOString() })
    .eq('id', dispute_id)
    .select()
    .single();

  if (disputeUpdateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Outcome processed, but failed to update dispute record', details: disputeUpdateError.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ message: `Dispute resolved: ${outcome}`, dispute: updatedDispute }) };
}

exports.handler = withErrorHandling(handler, ['POST']);