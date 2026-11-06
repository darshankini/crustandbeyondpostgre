const cors = require('cors');

// Browsers may only call the API from the POS frontend (plus the local dev server).
// Extra origins can be added as a comma-separated CORS_ORIGINS env var.
const ALLOWED_ORIGINS = [
  'https://divinex.tech',
  'https://www.divinex.tech',
  'http://localhost:3000',
  ...(process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
];

module.exports = cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
  maxAge: 600, // cache preflights for 10 minutes
});
