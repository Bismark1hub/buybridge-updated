const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody } = require('./utils/validation');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { data: body, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  // Case 1: mark ALL notifications as read
  if (body && body.markAll === true) {
    const { error: updateAllError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.userId)
      .eq('read', false);

    if (updateAllError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to mark notifications as read' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'All notifications marked as read' }) };
  }

  // Case 2: mark ONE specific notification as read
  if (!body || !body.notificationId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'notificationId is required (or set markAll: true)' }) };
  }

  const { data: updatedNotification, error: updateError } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', body.notificationId)
    .eq('user_id', user.userId)
    .select()
    .single();

  if (updateError || !updatedNotification) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Notification not found' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ message: 'Notification marked as read', notification: updatedNotification }) };
}

exports.handler = withErrorHandling(handler, ['POST']);