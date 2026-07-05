const { getUserFromEvent } = require('./utils/auth');
const { supabase } = require('./utils/supabaseClient');
const { withErrorHandling } = require('./utils/wrapper');
const { parseJsonBody, requireFields, isAllowedValue } = require('./utils/validation');

const ALLOWED_ISSUE_TYPES = ['item_not_received', 'item_not_as_described', 'damaged_item', 'seller_unresponsive', 'other'];

async function handler(event, context) {
  const user = getUserFromEvent(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { data, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  const { order_id, issue_type, description, attachment_url } = data;

  const missingError = requireFields(data, ['order_id', 'issue_type', 'description']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  if (!isAllowedValue(issue_type, ALLOWED_ISSUE_TYPES)) {
    return { statusCode: 400, body: JSON.stringify({ error: `Invalid issue_type. Must be one of: ${ALLOWED_ISSUE_TYPES.join(', ')}` }) };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, status, payment_status')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (order.buyer_id !== user.userId && order.seller_id !== user.userId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'You are not part of this order' }) };
  }

  if (order.status === 'completed' || order.status === 'cancelled') {
    return { statusCode: 400, body: JSON.stringify({ error: `Cannot raise a dispute on an order that is already '${order.status}'` }) };
  }

  const { data: existingDispute } = await supabase
    .from('disputes')
    .select('id, status')
    .eq('order_id', order_id)
    .in('status', ['open', 'under_review'])
    .maybeSingle();

  if (existingDispute) {
    return { statusCode: 400, body: JSON.stringify({ error: 'An active dispute already exists for this order' }) };
  }

  const { data: newDispute, error: insertError } = await supabase
    .from('disputes')
    .insert([
      {
        order_id,
        raised_by: user.userId,
        issue_type,
        description,
        attachment_url: attachment_url || null,
        status: 'open',
      },
    ])
    .select()
    .single();

  if (insertError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create dispute', details: insertError.message }) };
  }

  await supabase.from('orders').update({ status: 'disputed' }).eq('id', order_id);

  const otherPartyId = order.buyer_id === user.userId ? order.seller_id : order.buyer_id;
  await supabase
    .from('notifications')
    .insert([
      {
        user_id: otherPartyId,
        type: 'dispute',
        title: 'Dispute Raised',
        message: 'A dispute has been raised on your order. Our team will review it shortly.',
        sms_sent: false,
        read: false,
      },
    ]);

  return { statusCode: 201, body: JSON.stringify({ message: 'Dispute raised successfully', dispute: newDispute }) };
}

exports.handler = withErrorHandling(handler, ['POST']);