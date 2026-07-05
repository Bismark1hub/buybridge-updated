const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, requireFields } = require('./utils/validation');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (user.role !== 'seller') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only seller accounts can submit a seller application' }) };
  }

  const { data, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  const { business_name, business_address, business_category, store_description, verification_document_url } = data;

  const missingError = requireFields(data, ['business_name', 'business_address']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  // Check if this user already has a profile (avoid duplicates)
  const { data: existing } = await supabase
    .from('seller_profiles')
    .select('id, application_status')
    .eq('user_id', user.userId)
    .maybeSingle();

  if (existing) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `You already have a seller application with status '${existing.application_status}'` }),
    };
  }

  const { data: newProfile, error: insertError } = await supabase
    .from('seller_profiles')
    .insert([
      {
        user_id: user.userId,
        business_name,
        business_address,
        business_category: business_category || null,
        store_description: store_description || null,
        verification_document_url: verification_document_url || null,
        application_status: 'pending',
      },
    ])
    .select()
    .single();

  if (insertError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to submit application', details: insertError.message }) };
  }

  return {
    statusCode: 201,
    body: JSON.stringify({ message: 'Seller application submitted. An admin will review it shortly.', seller_profile: newProfile }),
  };
}

exports.handler = withErrorHandling(handler, ['POST']);