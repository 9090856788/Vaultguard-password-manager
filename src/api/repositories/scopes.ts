import { ObjectId } from '../models/common';

export function ownerScope(ownerUserId: ObjectId) {
  return { ownerUserId, deletedAt: null };
}

export function userScope(userId: ObjectId) {
  return { userId };
}

export function ownerVaultScope(ownerUserId: ObjectId, vaultId: ObjectId) {
  return { ownerUserId, vaultId, deletedAt: null };
}

export function ownerVaultItemScope(ownerUserId: ObjectId, vaultId: ObjectId, itemId: ObjectId) {
  return { _id: itemId, ownerUserId, vaultId, deletedAt: null };
}
