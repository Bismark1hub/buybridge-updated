// Initializes a shared Supabase client for direct Storage uploads from the browser.
// Requires the Supabase CDN script to be loaded BEFORE this file.
const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Uploads a single image file to the product-images bucket.
// Returns the public URL on success, throws an Error on failure.
async function uploadProductImage(file) {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from('product-images')
    .upload(fileName, file);

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  const { data } = supabaseClient
    .storage
    .from('product-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}