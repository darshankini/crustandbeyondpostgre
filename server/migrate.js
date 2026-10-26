// Runs schema.sql against the database (on Supabase the `postgres` database already exists).
const fs = require('fs');
const path = require('path');
const db = require('./db');

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.pool.query(sql);
    console.log('✔ Tables created.');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();
