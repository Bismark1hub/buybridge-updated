const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { as } = event.queryStringParameters || {};
  const role = as === 'seller' ? 'seller' : 'buyer'; // default to buyer if missing/invalid

  const column = role === 'seller' ? 'seller_id' : 'buyer_id';

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq(column, user.userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch orders' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ orders }) };
}

exports.handler = withErrorHandling(handler, ['GET']);