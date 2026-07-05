const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, requireFields, isAllowedValue } = require('./utils/validation');

const ALLOWED_DECISIONS = ['approved', 'rejected'];

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (user.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only admins can review seller applications' }) };
  }

  const { data, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  const { seller_profile_id, decision, notes } = data;

  const missingError = requireFields(data, ['seller_profile_id', 'decision']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  if (!isAllowedValue(decision, ALLOWED_DECISIONS)) {
    return { statusCode: 400, body: JSON.stringify({ error: `Invalid decision. Must be one of: ${ALLOWED_DECISIONS.join(', ')}` }) };
  }

  // Fetch the seller profile
  const { data: profile, error: profileError } = await supabase
    .from('seller_profiles')
    .select('id, user_id, business_name, application_status')
    .eq('id', seller_profile_id)
    .single();

  if (profileError || !profile) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Seller profile not found' }) };
  }

  if (profile.application_status !== 'pending') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `This application has already been '${profile.application_status}'` }),
    };
  }

  // Update the application status
  const { data: updatedProfile, error: updateError } = await supabase
    .from('seller_profiles')
    .update({ application_status: decision })
    .eq('id', seller_profile_id)
    .select()
    .single();

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update application status', details: updateError.message }) };
  }

  // Notify the seller of the outcome
  const notificationMessage =
    decision === 'approved'
      ? `Congratulations! Your seller application for "${profile.business_name}" has been approved. You can now list products.`
      : `Your seller application for "${profile.business_name}" was not approved.${notes ? ` Reason: ${notes}` : ''}`;

  await supabase
    .from('notifications')
    .insert([
      {
        user_id: profile.user_id,
        type: 'system',
        title: decision === 'approved' ? 'Seller Application Approved' : 'Seller Application Rejected',
        message: notificationMessage,
        sms_sent: false,
        read: false,
      },
    ]);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Seller application ${decision}`, seller_profile: updatedProfile }),
  };
}

exports.handler = withErrorHandling(handler, ['POST']);