// Standard CORS headers to allow your frontend to call these functions
// from a browser. Without these, browsers block the request entirely
// due to the Same-Origin security policy.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: restrict to your real frontend domain once deployed
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Handles the "preflight" request browsers send automatically before
// the real request, when using headers like Authorization or Content-Type.
function handleCorsPreflightRequest(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }
  return null;
}

module.exports = { corsHeaders, handleCorsPreflightRequest };