import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

function requestIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown_ip';
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  accountKey?: (req: Request) => string | undefined;
}) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later.', accountKey } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const keys = [`ip:${req.baseUrl}:${requestIp(req)}`];
    const account = accountKey?.(req);
    if (account) keys.push(`account:${req.baseUrl}:${account}`);
    const now = Date.now();

    const records = keys.map((key) => {
      let record = rateLimitStore.get(key);
      if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + windowMs };
        rateLimitStore.set(key, record);
      } else {
        record.count += 1;
      }
      return record;
    });

    const limitingRecord = records.find((record) => record.count > maxRequests);
    const remaining = Math.max(0, ...records.map((record) => maxRequests - record.count));
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(Math.max(...records.map((record) => record.resetTime)) / 1000));

    if (limitingRecord) {
      res.status(429).json({
        error: message,
        retryAfterSeconds: Math.ceil((limitingRecord.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

// Global general API rate limiter
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 300,
  message: 'Global rate limit exceeded. Please slow down your requests.',
});

// Stricter limiter for sensitive auth endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  accountKey: (req) => {
    const email = req.body?.email;
    return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined;
  },
});
