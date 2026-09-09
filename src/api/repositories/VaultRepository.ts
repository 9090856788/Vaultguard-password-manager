import { IVault, VaultModel } from '../models/Vault';
import { ObjectId } from '../models/common';
import { ownerScope } from './scopes';

export const vaultRepository = {
  findByIdForOwner(vaultId: ObjectId, ownerUserId: ObjectId) {
    return VaultModel.findOne({ _id: vaultId, ...ownerScope(ownerUserId) }).lean().exec() as Promise<IVault | null>;
  },

  listForOwner(ownerUserId: ObjectId) {
    return VaultModel.find(ownerScope(ownerUserId))
      .select('name currentKeyId encryptionFormatVersion migrationState createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean()
      .exec() as Promise<IVault[]>;
  },

  findKeyMaterialForOwner(vaultId: ObjectId, ownerUserId: ObjectId) {
    return VaultModel.findOne({ _id: vaultId, ...ownerScope(ownerUserId) })
      .select('name wrappedVekEnvelope kdf currentKeyId encryptionFormatVersion migrationState createdAt updatedAt')
      .lean()
      .exec() as Promise<IVault | null>;
  },

  create(input: Pick<IVault, 'ownerUserId' | 'name' | 'wrappedVekEnvelope' | 'kdf' | 'currentKeyId' | 'encryptionFormatVersion' | 'migrationState'> & Partial<IVault>) {
    return VaultModel.create(input);
  },

  prepareForOwner(vaultId: ObjectId, ownerUserId: ObjectId, name: string) {
    return VaultModel.create({ _id: vaultId, ownerUserId, name, migrationState: 'preparing' });
  },

  finalizePreparedForOwner(
    vaultId: ObjectId,
    ownerUserId: ObjectId,
    expectedUpdatedAt: Date,
    update: Pick<IVault, 'wrappedVekEnvelope' | 'kdf' | 'currentKeyId' | 'encryptionFormatVersion'>,
  ) {
    return VaultModel.findOneAndUpdate(
      { _id: vaultId, ownerUserId, deletedAt: null, migrationState: 'preparing', updatedAt: expectedUpdatedAt },
      { $set: { ...update, migrationState: 'verified' } },
      { new: true, runValidators: true },
    ).lean().exec() as Promise<IVault | null>;
  },

  updateKeyMetadataForOwner(
    vaultId: ObjectId,
    ownerUserId: ObjectId,
    expectedUpdatedAt: Date,
    update: Pick<IVault, 'wrappedVekEnvelope' | 'kdf' | 'currentKeyId' | 'encryptionFormatVersion' | 'migrationState'>,
  ) {
    return VaultModel.findOneAndUpdate(
      { _id: vaultId, ownerUserId, deletedAt: null, migrationState: 'verified', updatedAt: expectedUpdatedAt },
      { $set: update },
      { new: true, runValidators: true },
    ).lean().exec() as Promise<IVault | null>;
  },

  updateNameForOwner(vaultId: ObjectId, ownerUserId: ObjectId, expectedUpdatedAt: Date, name: string) {
    return VaultModel.findOneAndUpdate(
      { _id: vaultId, ownerUserId, deletedAt: null, updatedAt: expectedUpdatedAt },
      { $set: { name } },
      { new: true, runValidators: true },
    )
      .select('name currentKeyId encryptionFormatVersion migrationState createdAt updatedAt')
      .lean()
      .exec() as Promise<IVault | null>;
  },
};
