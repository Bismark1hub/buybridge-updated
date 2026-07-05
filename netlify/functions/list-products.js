const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');

async function handler(event, context) {
  const { category_id, search, min_price, max_price, page, limit } = event.queryStringParameters || {};

  const pageNum = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 20;
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('products')
    .select('id, seller_id, category_id, name, description, price, quantity_available, image_url, status, created_at', { count: 'exact' })
    .eq('status', 'active')
    .range(from, to)
    .order('created_at', { ascending: false });

  if (category_id) query = query.eq('category_id', category_id);
  if (search) query = query.ilike('name', `%${search}%`);
  if (min_price) query = query.gte('price', parseFloat(min_price));
  if (max_price) query = query.lte('price', parseFloat(max_price));

  const { data: products, error, count } = await query;

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch products', details: error.message }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      products,
      pagination: { page: pageNum, limit: pageSize, total: count, total_pages: Math.ceil(count / pageSize) },
    }),
  };
}

exports.handler = withErrorHandling(handler, ['GET']);