// Vercel serverless entry: the whole Express API (server/) as one function.
// vercel.json rewrites /api/* and /uploads/* here; Express sees the original path, so the
// same routes work as on Hostinger (server/server.js). Dependencies come from the root
// package.json, which lists everything server/ needs.
module.exports = require('../server/index');
