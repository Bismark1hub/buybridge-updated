const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');

async function handler(event, context) {
  const productId = event.queryStringParameters && event.queryStringParameters.id;

  if (!productId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Product id is required' }) };
  }

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error || !product) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ product }) };
}

exports.handler = withErrorHandling(handler, ['GET']);