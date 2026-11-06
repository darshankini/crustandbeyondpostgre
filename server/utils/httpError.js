// Error with an HTTP status; the error handler in index.js sends it as { error, errors? }.
class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    if (errors) this.errors = errors;
  }
}

// Maps Postgres constraint violations to friendly HTTP errors; rethrows anything else.
// messages: { unique?: string, foreignKey?: string }
function rethrowDbError(error, messages = {}) {
  if (error.code === '23505' && messages.unique) throw new HttpError(409, messages.unique);
  // 23503 foreign_key_violation, 23001 restrict_violation (ON DELETE RESTRICT)
  if ((error.code === '23503' || error.code === '23001') && messages.foreignKey) {
    throw new HttpError(409, messages.foreignKey);
  }
  throw error;
}

module.exports = { HttpError, rethrowDbError };
