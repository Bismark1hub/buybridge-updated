const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const params = event.queryStringParameters || {};
  const unreadOnly = params.unread_only === 'true';

  const pageSize = 20;
  let page = parseInt(params.page, 10);
  if (!Number.isInteger(page) || page < 1) {
    page = 1;
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data: notifications, error, count } = await query;

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch notifications' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      notifications,
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.ceil(count / pageSize)
    })
  };
}

exports.handler = withErrorHandling(handler, ['GET']);