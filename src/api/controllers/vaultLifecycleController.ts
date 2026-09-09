import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../errors/AppError';
import { vaultLifecycleService } from '../services/vaultLifecycleService';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.user?.id) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required.');
  return req.user.id;
}

function parseIfMatch(value: string | undefined): Date {
  if (!value) throw new AppError(428, 'VAULT_VERSION_REQUIRED', 'Vault version is required.');
  const normalized = value.replace(/^"|"$/g, '');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) throw new AppError(400, 'VAULT_VERSION_INVALID', 'Vault version is invalid.');
  return parsed;
}

export const vaultLifecycleController = {
  async prepare(req: AuthenticatedRequest, res: Response) {
    res.status(201).json(await vaultLifecycleService.prepare(requireUser(req), req.body));
  },

  async list(req: AuthenticatedRequest, res: Response) {
    res.json(await vaultLifecycleService.list(requireUser(req)));
  },

  async finalize(req: AuthenticatedRequest, res: Response) {
    const result = await vaultLifecycleService.finalize(requireUser(req), req.params.vaultId, parseIfMatch(req.header('if-match')), req.body);
    res.status(result.status).json({ item: result.item, ...(result.replay ? { replay: true } : {}) });
  },

  async keyMaterial(req: AuthenticatedRequest, res: Response) {
    res.json(await vaultLifecycleService.getKeyMaterial(requireUser(req), req.params.vaultId));
  },

  async updateMetadata(req: AuthenticatedRequest, res: Response) {
    const result = await vaultLifecycleService.updateMetadata(requireUser(req), req.params.vaultId, parseIfMatch(req.header('if-match')), req.body);
    res.json(result);
  },
};
