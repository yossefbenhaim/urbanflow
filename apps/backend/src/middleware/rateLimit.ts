import rateLimit from 'express-rate-limit'

/**
 * Rate limiter for authentication endpoints (signIn, signUp, resetPassword).
 * 10 requests per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'יותר מדי ניסיונות. נסה שוב בעוד 15 דקות.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
})

/**
 * Rate limiter for sensitive operations (voting, signing documents).
 * 30 requests per 15 minutes per IP.
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'יותר מדי בקשות. נסה שוב בעוד מספר דקות.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
})

/**
 * Rate limiter for file uploads.
 * 20 uploads per 15 minutes per IP.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'יותר מדי העלאות. נסה שוב בעוד מספר דקות.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
})

/**
 * General API rate limiter.
 * 100 requests per minute per IP.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'יותר מדי בקשות. נסה שוב בעוד דקה.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
})
