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
    .select('id, buyer_id, payment_status, status')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (order.buyer_id !== user.userId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only the buyer can cancel this order' }) };
  }

  if (order.payment_status !== 'unpaid') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'This order has already been paid for. Please raise a dispute instead of cancelling.' }),
    };
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', order_id)
    .select()
    .single();

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to cancel order', details: updateError.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ message: 'Order cancelled successfully', order: updatedOrder }) };
}

exports.handler = withErrorHandling(handler, ['POST']);