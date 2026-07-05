const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { isAllowedValue } = require('./utils/validation');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (user.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only admins can view platform transactions' }) };
  }

  const { type, status, order_id, page, limit } = event.queryStringParameters || {};

  if (type && !isAllowedValue(type, ['escrow_hold', 'escrow_release', 'refund', 'payout'])) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid type filter' }) };
  }

  if (status && !isAllowedValue(status, ['pending', 'success', 'failed'])) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid status filter' }) };
  }

  const pageNum = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 20;
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('transactions')
    .select('id, order_id, buyer_id, seller_id, amount, fee, type, moolre_reference, status, created_at', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (type) query = query.eq('type', type);
  if (status) query = query.eq('status', status);
  if (order_id) query = query.eq('order_id', order_id);

  const { data: transactions, error, count } = await query;

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch transactions', details: error.message }) };
  }

  // Calculate summary totals for the CURRENT filtered page's results
  const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalFees = transactions.reduce((sum, t) => sum + parseFloat(t.fee), 0);

  return {
    statusCode: 200,
    body: JSON.stringify({
      transactions,
      summary: {
        count_on_page: transactions.length,
        total_amount_on_page: totalAmount,
        total_fees_on_page: totalFees,
      },
      pagination: { page: pageNum, limit: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    }),
  };
}

exports.handler = withErrorHandling(handler, ['GET']);