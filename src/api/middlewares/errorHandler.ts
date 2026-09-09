import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const appError = err instanceof AppError ? err : undefined;
  const statusCode = appError?.statusCode ?? 500;
  const requestId = (req as AuthenticatedRequest).requestId;
  console.error(`[API Error] ${req.method} ${req.originalUrl} ${statusCode} ${appError?.code ?? 'INTERNAL_ERROR'}${requestId ? ` requestId=${requestId}` : ''}`);
  res.status(statusCode).json({
    error: {
      code: appError?.code ?? 'INTERNAL_ERROR',
      message: appError?.expose ? appError.message : 'Internal server error.',
      requestId,
    },
  });
}
