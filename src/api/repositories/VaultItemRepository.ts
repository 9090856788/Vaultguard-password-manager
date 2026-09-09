import { IVaultItem, VaultItemModel } from '../models/VaultItem';
import { ObjectId } from '../models/common';
import { ownerVaultItemScope, ownerVaultScope } from './scopes';

const SAFE_ITEM_PROJECTION = '+encryptedSecrets';

export const vaultItemRepository = {
  findByIdForOwner(vaultItemId: ObjectId, vaultId: ObjectId, ownerUserId: ObjectId) {
    return VaultItemModel.findOne(ownerVaultItemScope(ownerUserId, vaultId, vaultItemId))
      .select(SAFE_ITEM_PROJECTION)
      .lean()
      .exec() as Promise<IVaultItem | null>;
  },

  listForOwner(vaultId: ObjectId, ownerUserId: ObjectId, options: { categoryId?: ObjectId; favoriteOnly?: boolean } = {}) {
    const filter: Record<string, unknown> = ownerVaultScope(ownerUserId, vaultId);
    if (options.categoryId) filter['metadata.categoryId'] = options.categoryId;
    if (options.favoriteOnly) filter['metadata.isFavorite'] = true;
    return VaultItemModel.find(filter).select(SAFE_ITEM_PROJECTION).sort({ updatedAt: -1 }).lean().exec() as Promise<IVaultItem[]>;
  },

  create(input: Pick<IVaultItem, 'vaultId' | 'ownerUserId' | 'metadata' | 'encryptedSecrets'> & Partial<IVaultItem>) {
    return VaultItemModel.create(input);
  },

  updateForOwnerWithRevision(
    vaultItemId: ObjectId,
    vaultId: ObjectId,
    ownerUserId: ObjectId,
    expectedRevision: number,
    update: Pick<IVaultItem, 'metadata' | 'encryptedSecrets'>,
  ) {
    return VaultItemModel.findOneAndUpdate(
      { ...ownerVaultItemScope(ownerUserId, vaultId, vaultItemId), revision: expectedRevision },
      { $set: update, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    ).select(SAFE_ITEM_PROJECTION).lean().exec() as Promise<IVaultItem | null>;
  },

  softDeleteForOwner(vaultItemId: ObjectId, vaultId: ObjectId, ownerUserId: ObjectId, expectedRevision: number) {
    return VaultItemModel.findOneAndUpdate(
      { ...ownerVaultItemScope(ownerUserId, vaultId, vaultItemId), revision: expectedRevision },
      { $set: { deletedAt: new Date() }, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    ).select(SAFE_ITEM_PROJECTION).lean().exec() as Promise<IVaultItem | null>;
  },
};

export { SAFE_ITEM_PROJECTION };
