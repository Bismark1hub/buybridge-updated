const { supabase } = require('./utils/supabaseClient');
const bcrypt = require('bcryptjs');
const { generateToken } = require('./utils/jwt');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, requireFields, isAllowedValue } = require('./utils/validation');

async function handler(event, context) {
  const { data, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  const { email, password, full_name, phone, role } = data;

  const missingError = requireFields(data, ['email', 'password', 'full_name', 'phone']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  if (password.length < 8) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
  }

  const finalRole = isAllowedValue(role, ['buyer', 'seller']) ? role : 'buyer';

  const { data: existingUsers, error: lookupError } = await supabase
    .from('users')
    .select('id, email, phone')
    .or(`email.eq.${email},phone.eq.${phone}`);

  if (lookupError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error while checking existing user' }) };
  }

  if (existingUsers && existingUsers.length > 0) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Email or phone number already registered' }) };
  }

  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([{ email, password_hash, full_name, phone, role: finalRole }])
    .select('id, email, full_name, phone, role, created_at')
    .single();

  if (insertError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create account', details: insertError.message }) };
  }

 const token = generateToken(newUser);

  return {
    statusCode: 201,
    body: JSON.stringify({ message: 'Account created successfully', token, user: newUser }),
  };
}

exports.handler = withErrorHandling(handler, ['POST']);