// Login auth middleware: every inventory-module route requires a valid Bearer JWT
// (issued by POST /api/auth/login). Implementation lives in ../auth.js.
const { requireAuth } = require('../auth');

module.exports = requireAuth;