const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, requireFields } = require('./utils/validation');

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (user.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only admins can update platform settings' }) };
  }

  const { data, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  const { setting_key, setting_value } = data;

  const missingError = requireFields(data, ['setting_key', 'setting_value']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  // Extra safety check specifically for the platform fee — must be a sane percentage
  if (setting_key === 'platform_fee_percent') {
    const feeValue = parseFloat(setting_value);
    if (isNaN(feeValue) || feeValue < 0 || feeValue > 100) {
      return { statusCode: 400, body: JSON.stringify({ error: 'platform_fee_percent must be a number between 0 and 100' }) };
    }
  }

  // Check if the setting already exists
  const { data: existingSetting } = await supabase
    .from('platform_settings')
    .select('id')
    .eq('setting_key', setting_key)
    .maybeSingle();

  let result;

  if (existingSetting) {
    // Update existing setting
    const { data: updated, error: updateError } = await supabase
      .from('platform_settings')
      .update({
        setting_value: String(setting_value),
        updated_by: user.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', setting_key)
      .select()
      .single();

    if (updateError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update setting', details: updateError.message }) };
    }
    result = updated;
  } else {
    // Create new setting
    const { data: created, error: insertError } = await supabase
      .from('platform_settings')
      .insert([
        {
          setting_key,
          setting_value: String(setting_value),
          updated_by: user.userId,
        },
      ])
      .select()
      .single();

    if (insertError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create setting', details: insertError.message }) };
    }
    result = created;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Setting '${setting_key}' saved successfully`, setting: result }),
  };
}

exports.handler = withErrorHandling(handler, ['POST']);