const { corsHeaders, handleCorsPreflightRequest } = require('./cors');

function withErrorHandling(handlerFn, allowedMethods = ['POST']) {
  return async (event, context) => {
    const preflightResponse = handleCorsPreflightRequest(event);
    if (preflightResponse) return preflightResponse;

    if (!allowedMethods.includes(event.httpMethod)) {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    try {
      const result = await handlerFn(event, context);
      return {
        ...result,
        headers: { ...corsHeaders, ...(result.headers || {}) },
      };
    } catch (err) {
      console.error('Unhandled error in function:', err);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Internal server error', details: err.message }),
      };
    }
  };
}

module.exports = { withErrorHandling };