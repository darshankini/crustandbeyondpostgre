const { Pool, types } = require('pg');
require('dotenv').config();

types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC
types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT
types.setTypeParser(1082, (v) => v);             // DATE

const url = (process.env.VERCEL && process.env.DATABASE_URL_POOLED)
  || process.env.DATABASE_URL
  || process.env.POSTGRES_URL;
const host = url ? new URL(url).hostname : process.env.DB_HOST || 'localhost';
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);

function withoutSslMode(connectionString) {
  const u = new URL(connectionString);
  u.searchParams.delete('sslmode');
  return u.toString();
}

const options = {
  // Every Vercel function instance has its own pool and many can run at once, so keep it small.
  max: Number(process.env.DB_POOL_MAX) || (process.env.VERCEL ? 3 : 10),
  connectionTimeoutMillis: 15000,
  ssl: isLocal ? false : { rejectUnauthorized: false },
};

const pool = url
  ? new Pool({ connectionString: withoutSslMode(url), ...options })
  : new Pool({
      host,
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'postgres',
      ...options,
    });

// Timezone used for "today" / per-day grouping on the dashboard (DB stores timestamptz).
const TZ = process.env.APP_TZ || 'Asia/Kolkata';

// Returns [rows] so `const [rows] = await query(...)` works.
// Use $1, $2... placeholders; INSERTs that need the new id should add `RETURNING id`.
async function query(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return [rows];
}

// Which database the API uses, host and name only (never the password), for logs / health.
function describe() {
  return url ? `${host} (${new URL(url).pathname.slice(1)})` : `${host}:${process.env.DB_PORT || 5432} (${process.env.DB_NAME || 'postgres'})`;
}

module.exports = {
  query,
  describe,
  pool,              // raw pg pool (use pool.connect() + BEGIN/COMMIT for transactions)
  TZ,
  end: () => pool.end(),
};
