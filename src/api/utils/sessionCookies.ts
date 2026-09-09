import { randomBytes } from 'node:crypto';
import { Request, Response } from 'express';
import { CSRF_COOKIE } from '../middleware/csrf';

export const REFRESH_COOKIE = 'vaultguard_refresh';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return { httpOnly: true, secure: true, sameSite: 'strict' as const, path: '/api' };
}

export function setAuthCookies(response: Response, refreshToken: string) {
  response.cookie(REFRESH_COOKIE, refreshToken, { ...cookieOptions(), maxAge: REFRESH_MAX_AGE });
  response.cookie(CSRF_COOKIE, randomBytes(32).toString('hex'), {
    httpOnly: false,
    secure: true,
    sameSite: 'strict',
    maxAge: REFRESH_MAX_AGE,
    path: '/api',
  });
}

export function clearAuthCookies(response: Response) {
  response.clearCookie(REFRESH_COOKIE, cookieOptions());
  response.clearCookie(CSRF_COOKIE, { secure: true, sameSite: 'strict', path: '/api' });
}

export function readRequestCookie(request: Request, name: string): string | undefined {
  const header = request.header('cookie');
  const pair = header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : undefined;
}
