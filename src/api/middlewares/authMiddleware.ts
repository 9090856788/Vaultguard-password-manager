import { NextFunction, Response } from 'express';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/tokenUtils';

export function authenticateToken(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token || token.length > 4096) {
    next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required.'));
    return;
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    next(new AppError(401, 'INVALID_ACCESS_TOKEN', 'Authentication required.'));
    return;
  }

  req.user = { id: decoded.sub, email: decoded.email, type: decoded.type, securityVersion: decoded.securityVersion };
  next();
}
