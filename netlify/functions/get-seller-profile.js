const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');

async function handler(event, context) {
  const params = event.queryStringParameters || {};
  const sellerUserId = params.user_id;

  if (!sellerUserId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'user_id is required' }) };
  }

  const { data: profile, error } = await supabase
    .from('seller_profiles')
    .select('business_name, business_address, business_category, store_description, rating, application_status, created_at')
    .eq('user_id', sellerUserId)
    .eq('application_status', 'approved')
    .single();

  if (error || !profile) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Seller profile not found' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ profile }) };
}

exports.handler = withErrorHandling(handler, ['GET']);