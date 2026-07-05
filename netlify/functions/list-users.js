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
    return { statusCode: 403, body: JSON.stringify({ error: 'Only admins can view all users' }) };
  }

  const { role, search, page, limit } = event.queryStringParameters || {};

  if (role && !isAllowedValue(role, ['buyer', 'seller', 'admin'])) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid role filter. Must be one of: buyer, seller, admin' }) };
  }

  const pageNum = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 20;
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('users')
    .select('id, email, full_name, phone, role, avatar_url, is_verified, created_at', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (role) {
    query = query.eq('role', role);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: users, error, count } = await query;

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch users', details: error.message }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      users,
      pagination: { page: pageNum, limit: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    }),
  };
}

exports.handler = withErrorHandling(handler, ['GET']);