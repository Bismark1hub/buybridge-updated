const { supabase } = require('./utils/supabaseClient');
const bcrypt = require('bcryptjs');
const { generateToken } = require('./utils/jwt');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, requireFields } = require('./utils/validation');

async function handler(event, context) {
  const { data, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  const { email, password } = data;

  const missingError = requireFields(data, ['email', 'password']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  const { data: user, error: lookupError } = await supabase
    .from('users')
    .select('id, email, password_hash, full_name, role, is_verified')
    .eq('email', email)
    .single();

  if (lookupError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid email or password' }) };
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid email or password' }) };
  }

  const token = generateToken(user);
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_verified: user.is_verified,
      },
    }),
  };
}

exports.handler = withErrorHandling(handler, ['POST']);