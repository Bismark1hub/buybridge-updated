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
    return { statusCode: 403, body: JSON.stringify({ error: 'Only sellers can upload product images' }) };
  }

  const { data, error: parseError } = parseJsonBody(event);
  if (parseError) {
    return { statusCode: 400, body: JSON.stringify({ error: parseError }) };
  }

  const { file_base64, file_name, file_type } = data;

  const missingError = requireFields(data, ['file_base64', 'file_name', 'file_type']);
  if (missingError) {
    return { statusCode: 400, body: JSON.stringify({ error: missingError }) };
  }

  // Basic safety check: only allow image types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file_type)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Only JPEG, PNG, or WEBP images are allowed' }) };
  }

  // Basic safety check: limit file size (base64 is ~33% larger than raw bytes)
  const approxBytes = (file_base64.length * 3) / 4;
  const maxBytes = 5 * 1024 * 1024; // 5MB
  if (approxBytes > maxBytes) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Image must be under 5MB' }) };
  }

  // Build a unique file path so sellers can't overwrite each other's files
  const fileExt = file_name.split('.').pop();
  const uniquePath = `${user.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  // Decode base64 into raw binary buffer
  const buffer = Buffer.from(file_base64, 'base64');

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(uniquePath, buffer, {
      contentType: file_type,
      upsert: false,
    });

  if (uploadError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Upload failed', details: uploadError.message }) };
  }

  // Get the public URL for the uploaded file
  const { data: publicUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(uniquePath);

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: 'Image uploaded successfully',
      image_url: publicUrlData.publicUrl,
    }),
  };
}

exports.handler = withErrorHandling(handler, ['POST']);