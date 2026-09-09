import { timingSafeEqual } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE = 'vaultguard_csrf';

function readCookie(request: Request, name: string): string | undefined {
  const header = request.header('cookie');
  const pair = header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : undefined;
}

function tokensMatch(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = readCookie(req, CSRF_COOKIE);
  const headerToken = req.header('x-csrf-token');
  if (!cookieToken || !headerToken || !tokensMatch(cookieToken, headerToken)) {
    next(new AppError(403, 'CSRF_TOKEN_INVALID', 'CSRF validation failed.'));
    return;
  }

  next();
}

export { CSRF_COOKIE };
