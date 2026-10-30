require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Behind Hostinger's / Vercel's proxy: trust X-Forwarded-Proto so upload URLs come out as https.
app.set('trust proxy', 1);

// Browsers may only call the API from the POS frontend (plus the local dev server).
// Extra origins can be added as a comma-separated CORS_ORIGINS env var.
const ALLOWED_ORIGINS = [
  'https://divinex.tech',
  'https://www.divinex.tech',
  'http://localhost:3000',
  ...(process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
];
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// Serve uploaded product images.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
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