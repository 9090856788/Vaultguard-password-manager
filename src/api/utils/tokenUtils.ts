import jwt from 'jsonwebtoken';
import { envConfig } from '../config/env';

const JWT_ALGORITHM = 'HS256' as const;
const JWT_ISSUER = 'vaultguard-api';
const JWT_AUDIENCE = 'vaultguard-client';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  type: 'access';
  securityVersion: number;
}

export function signAccessToken(payload: { id: string; email: string; securityVersion: number }): string {
  return jwt.sign(
    { sub: payload.id, email: payload.email, type: 'access', securityVersion: payload.securityVersion },
    envConfig.JWT_SECRET,
    { algorithm: JWT_ALGORITHM, expiresIn: '15m', issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
  );
}

export function verifyAccessToken(token: string): AccessTokenClaims | null {
  try {
    const decoded = jwt.verify(token, envConfig.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof decoded === 'string' || decoded.type !== 'access' || typeof decoded.sub !== 'string' || typeof decoded.email !== 'string' || typeof decoded.securityVersion !== 'number') {
      return null;
    }
    return {
      sub: decoded.sub,
      email: decoded.email,
      type: 'access',
      securityVersion: decoded.securityVersion,
    };
  } catch {
    return null;
  }
}
