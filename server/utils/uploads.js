// Where uploaded images live. Served at /uploads (see index.js).
// - Hostinger / local: server/uploads (persistent).
// - Vercel: the code folder is read-only, so /tmp/uploads. That disk is per-instance and
//   temporary — images vanish on the next cold start. Use Hostinger (or object storage)
//   for images that must last.
// UPLOAD_DIR overrides both.
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR
  || (process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads'));

// Creates a folder under UPLOAD_DIR if needed. Never throws at startup: a read-only disk only
// fails the upload request that needs it, not the whole API.
function ensureDir(dir = UPLOAD_DIR) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    console.warn(`Upload folder ${dir} unavailable: ${error.message}`);
  }
  return dir;
}

module.exports = { UPLOAD_DIR, ensureDir };
