import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const value = req.header('x-request-id');
  const id = value && /^[a-zA-Z0-9._:-]{1,128}$/.test(value) ? value : randomUUID();
  (req as AuthenticatedRequest).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
