// Fixed-window rate limiter keyed by client IP (req.ip honours `trust proxy`).
// In-memory, so each server instance counts on its own — enough for a single POS API.
function rateLimit({ windowMs = 60 * 1000, max = 3000, message = 'Too many requests, please try again later' } = {}) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Forget expired windows so the map doesn't grow forever.
  setInterval(() => {
    const now = Date.now();
    for (const [ip, h] of hits) if (h.resetAt <= now) hits.delete(ip);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    let h = hits.get(req.ip);
    if (!h || h.resetAt <= now) {
      h = { count: 0, resetAt: now + windowMs };
      hits.set(req.ip, h);
    }
    h.count += 1;

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - h.count));
    res.setHeader('RateLimit-Reset', Math.ceil((h.resetAt - now) / 1000));

    if (h.count > max) {
      res.setHeader('Retry-After', Math.ceil((h.resetAt - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

module.exports = rateLimit;
