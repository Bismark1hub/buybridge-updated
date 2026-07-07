const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { order_id } = event.queryStringParameters || {};
  if (!order_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required query parameter: order_id' }) };
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', order_id)
    .single();

  if (error || !order) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
  }

  const isParticipant = order.buyer_id === user.userId || order.seller_id === user.userId;
  if (!isParticipant && user.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'You do not have access to this order' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ order }) };
}

exports.handler = withErrorHandling(handler, ['GET']);