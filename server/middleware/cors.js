const cors = require('cors');

// Browsers may only call the API from the POS frontends (plus the local dev server).
// Origins are scheme + host only — no trailing slash, or the browser's Origin never matches.
// Extra origins can be added as a comma-separated CORS_ORIGINS env var.
const ALLOWED_ORIGINS = [
  'https://divinex.tech',                     // production
  'https://www.divinex.tech',                 // production
  'https://crustandbeyondpostgre.vercel.app', // staging
  'http://localhost:3000',                    // local dev
  ...(process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
];

module.exports = cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
  maxAge: 600, // cache preflights for 10 minutes
});