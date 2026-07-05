// Parses the JSON body of a request safely.
// Returns { data: {...} } on success, or { error: "message" } on failure.
function parseJsonBody(event) {
  try {
    const data = JSON.parse(event.body || '{}');
    return { data };
  } catch (err) {
    return { error: 'Invalid JSON in request body' };
  }
}

// Checks that all required fields are present (not undefined, null, or empty string).
// Returns null if valid, or an error message string if something is missing.
function requireFields(data, fieldNames) {
  const missing = fieldNames.filter(
    (field) => data[field] === undefined || data[field] === null || data[field] === ''
  );
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}`;
  }
  return null;
}

// Checks that a value is a positive number (used for price, quantity, etc.)
function isPositiveNumber(value) {
  return typeof value === 'number' && value > 0;
}

// Checks that a value is a non-negative number (0 is allowed — used for stock quantity)
function isNonNegativeNumber(value) {
  return typeof value === 'number' && value >= 0;
}

// Checks that a value is one of a fixed set of allowed strings
// (used for role, status, issue_type, etc. — matches our database CHECK constraints)
function isAllowedValue(value, allowedValues) {
  return allowedValues.includes(value);
}

module.exports = {
  parseJsonBody,
  requireFields,
  isPositiveNumber,
  isNonNegativeNumber,
  isAllowedValue,
};