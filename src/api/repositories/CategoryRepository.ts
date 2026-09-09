import { CategoryModel, ICategory } from '../models/Category';
import { ObjectId } from '../models/common';
import { ownerVaultScope } from './scopes';

export const categoryRepository = {
  findByIdForOwner(categoryId: ObjectId, vaultId: ObjectId, ownerUserId: ObjectId) {
    return CategoryModel.findOne({ _id: categoryId, ...ownerVaultScope(ownerUserId, vaultId) }).lean().exec() as Promise<ICategory | null>;
  },

  listForOwner(vaultId: ObjectId, ownerUserId: ObjectId) {
    return CategoryModel.find(ownerVaultScope(ownerUserId, vaultId)).sort({ displayName: 1 }).lean().exec() as Promise<ICategory[]>;
  },

  create(input: Pick<ICategory, 'vaultId' | 'ownerUserId' | 'normalizedName' | 'displayName'> & Partial<ICategory>) {
    return CategoryModel.create(input);
  },

  renameForOwner(categoryId: ObjectId, vaultId: ObjectId, ownerUserId: ObjectId, expectedUpdatedAt: Date, displayName: string, normalizedName: string) {
    return CategoryModel.findOneAndUpdate(
      { _id: categoryId, vaultId, ownerUserId, deletedAt: null, updatedAt: expectedUpdatedAt },
      { $set: { displayName, normalizedName } },
      { new: true, runValidators: true },
    ).lean().exec() as Promise<ICategory | null>;
  },
};
