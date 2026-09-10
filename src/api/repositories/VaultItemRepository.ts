import { EncryptedSecrets, IVaultItem, VaultItemModel } from '../models/VaultItem';
import { ObjectId } from '../models/common';
import { ownerVaultItemScope, ownerVaultScope } from './scopes';

const SAFE_ITEM_PROJECTION = '+encryptedSecrets';

export const vaultItemRepository = {
  findByIdForOwner(vaultItemId: ObjectId, vaultId: ObjectId, ownerUserId: ObjectId) {
    return VaultItemModel.findOne({ _id: vaultItemId, vaultId, ownerUserId, deletedAt: null })
      .select(SAFE_ITEM_PROJECTION)
      .lean()
      .exec() as Promise<IVaultItem | null>;
  },

  listForOwner(vaultId: ObjectId, ownerUserId: ObjectId, options: { categoryId?: ObjectId; favoriteOnly?: boolean } = {}) {
    const filter: Record<string, unknown> = { ...ownerVaultScope(ownerUserId, vaultId), lifecycleState: 'active' };
    if (options.categoryId) filter['metadata.categoryId'] = options.categoryId;
    if (options.favoriteOnly) filter['metadata.isFavorite'] = true;
    return VaultItemModel.find(filter).select(SAFE_ITEM_PROJECTION).sort({ updatedAt: -1 }).lean().exec() as Promise<IVaultItem[]>;
  },

  findByIdForOwnerIncludingDeleted(vaultItemId: ObjectId, vaultId: ObjectId, ownerUserId: ObjectId) {
    return VaultItemModel.findOne({ _id: vaultItemId, vaultId, ownerUserId })
      .select(SAFE_ITEM_PROJECTION)
      .lean()
      .exec() as Promise<IVaultItem | null>;
  },

  prepareForOwner(vaultItemId: ObjectId, vaultId: ObjectId, ownerUserId: ObjectId, metadata: IVaultItem['metadata']) {
    return VaultItemModel.create({
      _id: vaultItemId,
      vaultId,
      ownerUserId,
      metadata,
      revision: 1,
      lifecycleState: 'preparing',
    });
  },

  finalizePreparedForOwnerWithCas(
    vaultItemId: ObjectId,
    vaultId: ObjectId,
    ownerUserId: ObjectId,
    expectedRevision: number,
    encryptedSecrets: EncryptedSecrets,
  ) {
    return VaultItemModel.findOneAndUpdate(
      { _id: vaultItemId, vaultId, ownerUserId, deletedAt: null, lifecycleState: 'preparing', revision: expectedRevision },
      { $set: { encryptedSecrets, lifecycleState: 'active' } },
      { new: true, runValidators: true },
    ).select(SAFE_ITEM_PROJECTION).lean().exec() as Promise<IVaultItem | null>;
  },

  updateForOwnerWithRevision(
    vaultItemId: ObjectId,
    vaultId: ObjectId,
    ownerUserId: ObjectId,
    expectedRevision: number,
    update: { metadata?: IVaultItem['metadata']; encryptedSecrets?: EncryptedSecrets },
  ) {
    return VaultItemModel.findOneAndUpdate(
      { ...ownerVaultItemScope(ownerUserId, vaultId, vaultItemId), lifecycleState: 'active', revision: expectedRevision },
      { $set: update, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    ).select(SAFE_ITEM_PROJECTION).lean().exec() as Promise<IVaultItem | null>;
  },

  softDeleteForOwner(vaultItemId: ObjectId, vaultId: ObjectId, ownerUserId: ObjectId, expectedRevision: number) {
    return VaultItemModel.findOneAndUpdate(
      { _id: vaultItemId, vaultId, ownerUserId, deletedAt: null, lifecycleState: 'active', revision: expectedRevision },
      { $set: { deletedAt: new Date(), lifecycleState: 'deleted' }, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    ).select(SAFE_ITEM_PROJECTION).lean().exec() as Promise<IVaultItem | null>;
  },

  restoreForOwner(vaultItemId: ObjectId, vaultId: ObjectId, ownerUserId: ObjectId, expectedRevision: number) {
    return VaultItemModel.findOneAndUpdate(
      { _id: vaultItemId, vaultId, ownerUserId, deletedAt: { $ne: null }, lifecycleState: 'deleted', revision: expectedRevision },
      { $set: { deletedAt: null, lifecycleState: 'active' }, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    ).select(SAFE_ITEM_PROJECTION).lean().exec() as Promise<IVaultItem | null>;
  },
};

export { SAFE_ITEM_PROJECTION };
