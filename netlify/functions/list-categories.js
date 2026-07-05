const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');

async function handler(event, context) {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch categories', details: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ categories }) };
}

exports.handler = withErrorHandling(handler, ['GET']);