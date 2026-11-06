const { Pool, types } = require('pg');
require('dotenv').config();

// pg returns NUMERIC / BIGINT (COUNT, SUM) as strings and DATE as a local-midnight Date.
// Parse them so the API keeps returning plain numbers and 'YYYY-MM-DD' days.
types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC
types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT
types.setTypeParser(1082, (v) => v);             // DATE

// Single shared pool, reused across requests.
// DATABASE_URL (postgresql://user:pass@host:5432/db, e.g. the Supabase connection string)
// wins if set; otherwise the DB_* vars are used.
const url = process.env.DATABASE_URL;
const host = url ? new URL(url).hostname : process.env.DB_HOST || 'localhost';
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);

// On Vercel every function instance has its own pool, and many instances can run at once,
// so keep each small (use Supabase's transaction pooler URL, port 6543, there).
const options = {
  max: Number(process.env.DB_POOL_MAX) || (process.env.VERCEL ? 3 : 10),
  ssl: isLocal ? false : { rejectUnauthorized: false }, // Supabase requires SSL
};

const pool = url
  ? new Pool({ connectionString: url, ...options })
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

// Runs fn(conn) inside BEGIN/COMMIT on one pooled connection; rolls back if it throws.
// Repositories take that conn so every query of a transaction shares it.
// conn.afterCommit(cb) queues work (e.g. emails) that should only happen once the data is saved;
// callbacks run in the background and their errors are only logged. On Vercel they are awaited
// instead: a serverless function is frozen once it responds, which would drop them.
async function transaction(fn) {
  const conn = await pool.connect();
  const afterCommit = [];
  conn.afterCommit = (cb) => afterCommit.push(cb);
  try {
    await conn.query('BEGIN');
    const result = await fn(conn);
    await conn.query('COMMIT');
    const runs = afterCommit.map((cb) =>
      Promise.resolve().then(cb).catch((e) => console.error('afterCommit failed:', e)));
    if (process.env.VERCEL) await Promise.all(runs);
    return result;
  } catch (error) {
    await conn.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    delete conn.afterCommit;
    conn.release();
  }
}

module.exports = {
  query,
  transaction,
  pool,               // raw pg pool (use pool.connect() + BEGIN/COMMIT for transactions)
  TZ,
  end: () => pool.end(),
};
