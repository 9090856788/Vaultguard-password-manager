import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';

export function encryptedVaultRequired(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(503, 'VAULT_ENCRYPTION_NOT_READY', 'Encrypted vault operations are not available yet.'));
}
