const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { as, status, page, limit } = event.queryStringParameters || {};
  // "as" lets a user viewing both roles specify which side to view — defaults to buyer
  const viewAs = as === 'seller' ? 'seller_id' : 'buyer_id';

  const pageNum = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 20;
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq(viewAs, user.userId)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: orders, error, count } = await query;

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch orders', details: error.message }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      orders,
      pagination: { page: pageNum, limit: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    }),
  };
}

exports.handler = withErrorHandling(handler, ['GET']);