import rateLimit from 'express-rate-limit';

/** Rate-limit por IP además de las cuotas por plan (ver IMPLEMENTACION.md §4). */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
