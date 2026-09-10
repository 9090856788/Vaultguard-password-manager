import { Response } from 'express';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types';
import { vaultItemService } from '../services/vaultItemService';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.user?.id) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required.');
  return req.user.id;
}

function parseRevision(value: string | undefined): number {
  if (!value) throw new AppError(428, 'VAULT_ITEM_VERSION_REQUIRED', 'Vault item version is required.');
  const normalized = value.replace(/^"|"$/g, '');
  if (!/^\d+$/.test(normalized)) throw new AppError(400, 'VAULT_ITEM_VERSION_INVALID', 'Vault item version is invalid.');
  const revision = Number(normalized);
  if (!Number.isSafeInteger(revision) || revision < 1) throw new AppError(400, 'VAULT_ITEM_VERSION_INVALID', 'Vault item version is invalid.');
  return revision;
}

export const vaultItemController = {
  async prepare(req: AuthenticatedRequest, res: Response) {
    res.status(201).json(await vaultItemService.prepare(requireUser(req), req.params.vaultId, req.body));
  },

  async finalize(req: AuthenticatedRequest, res: Response) {
    const result = await vaultItemService.finalize(requireUser(req), req.params.vaultId, parseRevision(req.header('if-match')), req.body);
    res.status(result.status).json({ item: result.item, ...(result.replay ? { replay: true } : {}) });
  },

  async list(req: AuthenticatedRequest, res: Response) {
    res.json(await vaultItemService.list(requireUser(req), req.params.vaultId, req.query));
  },

  async get(req: AuthenticatedRequest, res: Response) {
    res.json(await vaultItemService.get(requireUser(req), req.params.vaultId, req.params.itemId));
  },

  async update(req: AuthenticatedRequest, res: Response) {
    res.json(await vaultItemService.update(requireUser(req), req.params.vaultId, req.params.itemId, parseRevision(req.header('if-match')), req.body));
  },

  async remove(req: AuthenticatedRequest, res: Response) {
    res.json(await vaultItemService.remove(requireUser(req), req.params.vaultId, req.params.itemId, parseRevision(req.header('if-match'))));
  },

  async restore(req: AuthenticatedRequest, res: Response) {
    res.json(await vaultItemService.restore(requireUser(req), req.params.vaultId, req.params.itemId, parseRevision(req.header('if-match'))));
  },
};
