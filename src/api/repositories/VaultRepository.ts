import { IVault, VaultModel } from '../models/Vault';
import { ObjectId } from '../models/common';
import { ownerScope } from './scopes';

export const vaultRepository = {
  findByIdForOwner(vaultId: ObjectId, ownerUserId: ObjectId) {
    return VaultModel.findOne({ _id: vaultId, ...ownerScope(ownerUserId) }).lean().exec() as Promise<IVault | null>;
  },

  listForOwner(ownerUserId: ObjectId) {
    return VaultModel.find(ownerScope(ownerUserId)).sort({ updatedAt: -1 }).lean().exec() as Promise<IVault[]>;
  },

  create(input: Pick<IVault, 'ownerUserId' | 'name' | 'wrappedVekEnvelope' | 'kdf' | 'currentKeyId' | 'encryptionFormatVersion' | 'migrationState'> & Partial<IVault>) {
    return VaultModel.create(input);
  },

  updateKeyMetadataForOwner(
    vaultId: ObjectId,
    ownerUserId: ObjectId,
    expectedUpdatedAt: Date,
    update: Pick<IVault, 'wrappedVekEnvelope' | 'kdf' | 'currentKeyId' | 'encryptionFormatVersion' | 'migrationState'>,
  ) {
    return VaultModel.findOneAndUpdate(
      { _id: vaultId, ownerUserId, deletedAt: null, updatedAt: expectedUpdatedAt },
      { $set: update },
      { new: true, runValidators: true },
    ).lean().exec() as Promise<IVault | null>;
  },
};
