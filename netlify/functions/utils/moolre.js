// ⚠️ PLACEHOLDER MOOLRE INTEGRATION
// Moolre account is pending verification, so real API calls aren't possible yet.
// This file simulates realistic behavior: a payment stays "pending" for a
// few seconds (mimicking the buyer approving a prompt on their phone),
// then resolves to "success". Once verified, replace the two functions
// below with real fetch() calls to Moolre's Collections API.

const SIMULATE = !process.env.MOOLRE_API_KEY; // auto-detects: no key = simulate
const MOOLRE_BASE_URL =
  process.env.MOOLRE_ENV === 'live'
    ? 'https://api.moolre.com'
    : 'https://sandbox.moolre.com';

// How long the simulated payment stays "pending" before resolving to success
const SIMULATED_DELAY_MS = 8000; // 8 seconds

/**
 * Starts a collection (payment request) for the given order.
 * Returns { reference, status } where status is always 'pending' at first.
 */
async function initiateCollection({ amount, phone, orderId }) {
  if (SIMULATE) {
    // Embed the current timestamp in the reference so checkCollectionStatus
    // can later calculate how much time has passed, without needing a database.
    const reference = `SIM-${Date.now()}-${orderId}`;
    return { reference, status: 'pending' };
  }

  // TODO: Replace with real Moolre Collections API call once account is verified.
  // Placeholder shape only — confirm real endpoint path + field names in docs.
  const response = await fetch(`${MOOLRE_BASE_URL}/open/transact/collect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-USER': process.env.MOOLRE_API_USER,
      'X-API-KEY': process.env.MOOLRE_API_KEY,
      'X-API-PUBKEY': process.env.MOOLRE_API_PUBKEY,
    },
    body: JSON.stringify({ amount, phone, orderId }),
  });

  const data = await response.json();
  return data; // shape TBD — will need to adjust once we see a real response
}

/**
 * Checks the status of a previously-initiated collection.
 * Returns { status } where status is 'pending', 'success', or 'failed'.
 */
async function checkCollectionStatus({ reference }) {
  if (SIMULATE) {
    const match = reference.match(/^SIM-(\d+)-/);
    if (!match) return { status: 'failed' };

    const initiatedAt = parseInt(match[1], 10);
    const elapsed = Date.now() - initiatedAt;

    return { status: elapsed >= SIMULATED_DELAY_MS ? 'success' : 'pending' };
  }

  // TODO: Replace with real Moolre status-check call once account is verified.
  const response = await fetch(
    `${MOOLRE_BASE_URL}/open/transact/status?reference=${reference}`,
    {
      headers: {
        'X-API-USER': process.env.MOOLRE_API_USER,
        'X-API-KEY': process.env.MOOLRE_API_KEY,
      },
    }
  );

  const data = await response.json();
  return data; // shape TBD
}

module.exports = { initiateCollection, checkCollectionStatus, SIMULATE };