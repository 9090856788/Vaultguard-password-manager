import jwt from 'jsonwebtoken';
import { envConfig } from '../config/env';

export function signAccessToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, envConfig.JWT_SECRET, { expiresIn: '24h' });
}

export function signRefreshToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, envConfig.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): { id: string; email: string } | null {
  try {
    return jwt.verify(token, envConfig.JWT_SECRET) as { id: string; email: string };
  } catch (err) {
    return null;
  }
}

export function verifyRefreshToken(token: string): { id: string; email: string } | null {
  try {
    return jwt.verify(token, envConfig.JWT_REFRESH_SECRET) as { id: string; email: string };
  } catch (err) {
    return null;
  }
}
