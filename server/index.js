require('dotenv').config();
require('express-async-errors');

const express = require('express');
const { UPLOAD_DIR } = require('./utils/uploads');
const cors = require('./middleware/cors');
const rateLimit = require('./middleware/rateLimit');
const db = require('./db');

const app = express();

// Which environment this API is: APP_ENV, else staging on Vercel, production elsewhere (Hostinger).
const APP_ENV = process.env.APP_ENV || (process.env.VERCEL ? 'staging' : 'production');

// Behind Hostinger's / Vercel's proxy: trust X-Forwarded-Proto so upload URLs come out as https.
app.set('trust proxy', 1);

app.use(cors); // allowed origins: middleware/cors.js
app.use(express.json({ limit: '200kb' }));

// Rate limits per client IP: a general cap on the whole API, a tight one on login attempts.
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX) || 300 }));
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again in a few minutes',
}));

// Serve uploaded product images. SVGs may carry scripts, so never let them run.
app.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res, file) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (file.endsWith('.svg')) res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  },
}));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: APP_ENV });
});

// GET /api/health/db — is the database reachable? (shows host + database name, never credentials)
app.get('/api/health/db', async (_req, res) => {
  const started = Date.now();
  try {
    await db.pool.query('SELECT 1');
    res.json({ ok: true, env: APP_ENV, database: db.describe(), ms: Date.now() - started });
  } catch (error) {
    res.status(503).json({ ok: false, env: APP_ENV, database: db.describe(), error: error.message });
  }
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/categories', require('./routes/categories.routes'));
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/subitems', require('./routes/subitems.routes'));
app.use('/api/orders', require('./routes/orders.routes'));
app.use('/api/carts', require('./routes/carts.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/customers', require('./routes/customers.routes'));

app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    error: err.message || 'Server error'
  });
});

// Exported without listening so Vercel (api/index.js) can wrap it; server.js starts it everywhere else.
module.exports = app;