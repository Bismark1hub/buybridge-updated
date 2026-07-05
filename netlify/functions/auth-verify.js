const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');

async function handler(event, context) {
  const decodedUser = getUserFromEvent(event);

  if (!decodedUser) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, full_name, phone, role, avatar_url, is_verified, created_at')
    .eq('id', decodedUser.userId)
    .single();

  if (error || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'User no longer exists' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Token valid', user }),
  };
}

exports.handler = withErrorHandling(handler, ['GET', 'POST']);