// Helpers shared by the aggregator adapters.
const crypto = require('crypto');

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

// HMAC-SHA256 of the raw request body, compared in constant time.
// With no secret configured, webhooks are only accepted outside production (local testing).
function verifyHmac(req, secret, headerName) {
  if (!secret) return process.env.NODE_ENV !== 'production';
  const given = String(req.headers[headerName] || '').replace(/^sha256=/, '');
  const expected = crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');
  const a = Buffer.from(given, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// POST JSON to a platform API. Returns { skipped: true } when the platform isn't configured,
// so the POS works fully offline (and never calls out) until real credentials are added.
async function postJson(url, apiKey, body) {
  if (!url || !apiKey) return { skipped: true };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `platform responded ${res.status}`);
  return data;
}

module.exports = { num, verifyHmac, postJson };
