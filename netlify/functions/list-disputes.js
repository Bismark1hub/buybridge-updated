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
    return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) };
  }

  const params = event.queryStringParameters || {};
  const statusFilter = params.status;

  const allowedStatuses = ['open', 'under_review', 'resolved_buyer', 'resolved_seller', 'closed'];
  if (statusFilter !== undefined && !isAllowedValue(statusFilter, allowedStatuses)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid status filter' }) };
  }

  const pageSize = 20;
  let page = parseInt(params.page, 10);
  if (!Number.isInteger(page) || page < 1) {
    page = 1;
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('disputes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data: disputes, error, count } = await query;

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch disputes' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      disputes,
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.ceil(count / pageSize)
    })
  };
}

exports.handler = withErrorHandling(handler, ['GET']);