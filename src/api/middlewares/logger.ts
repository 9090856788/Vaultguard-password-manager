import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const requestId = res.getHeader('X-Request-Id') || 'unknown';
    console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} requestId=${requestId} durationMs=${duration}`);
  });
  next();
}
