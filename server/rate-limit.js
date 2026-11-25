// A tiny in-memory limiter so a public demo can't burn through the API key.
// Counts analyses per client IP inside a sliding window. `max` may be a function, read per request.
export function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  return function rateLimit(req, res, next) {
    const limit = typeof max === 'function' ? max() : max;
    const now = Date.now();
    const key = req.ip || 'local';
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);

    if (recent.length >= limit) {
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        code: 'LOCAL_RATE_LIMIT',
        error: `This server has run ${limit} ${limit === 1 ? 'analysis' : 'analyses'} in the last ${Math.round(windowMs / 60000)} minutes. Try again in ${retryAfter} seconds.`,
      });
    }

    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 2000) {
      for (const [k, list] of hits) if (!list.some((t) => now - t < windowMs)) hits.delete(k);
    }
    return next();
  };
}
