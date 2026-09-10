import { Types } from 'mongoose';
import { AppError } from '../errors/AppError';
import { categoryRepository } from '../repositories/CategoryRepository';
import { vaultItemRepository } from '../repositories/VaultItemRepository';
import { vaultRepository } from '../repositories/VaultRepository';
import { EncryptedSecrets, IVaultItem } from '../models/VaultItem';
import {
  mergeVaultItemMetadata,
  validateEncryptedSecrets,
  validateFinalizeVaultItemInput,
  validatePrepareVaultItemInput,
  validateVaultItemId,
  validateVaultItemListQuery,
  validateVaultItemRevision,
  validateVaultItemUpdateInput,
  VaultItemMetadata,
} from '../validation/vaultItemValidation';

type Dependencies = {
  itemRepository: typeof vaultItemRepository;
  vaultRepository: typeof vaultRepository;
  categoryRepository: typeof categoryRepository;
};

function asObjectId(value: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) throw new AppError(404, 'VAULT_ITEM_NOT_FOUND', message);
  return new Types.ObjectId(value);
}

function safeItem(item: IVaultItem) {
  return {
    id: item._id?.toString(),
    vaultId: item.vaultId.toString(),
    metadata: item.metadata,
    ...(item.encryptedSecrets ? { encryptedSecrets: item.encryptedSecrets } : {}),
    revision: item.revision,
    lifecycleState: item.lifecycleState,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    ...(item.deletedAt ? { deletedAt: item.deletedAt } : {}),
  };
}

function currentMetadata(item: IVaultItem): VaultItemMetadata {
  return {
    title: item.metadata.title,
    ...(item.metadata.websiteUrl !== undefined ? { websiteUrl: item.metadata.websiteUrl } : {}),
    ...(item.metadata.categoryId ? { categoryId: item.metadata.categoryId.toString() } : {}),
    tags: item.metadata.tags,
    ...(item.metadata.colorLabel !== undefined ? { colorLabel: item.metadata.colorLabel } : {}),
    ...(item.metadata.websiteLogo !== undefined ? { websiteLogo: item.metadata.websiteLogo } : {}),
    isFavorite: item.metadata.isFavorite,
    isPinned: item.metadata.isPinned,
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function conflict(): never {
  throw new AppError(409, 'VAULT_ITEM_CONFLICT', 'Vault item request conflicts with the current resource.');
}

export function createVaultItemService(dependencies: Dependencies = {
  itemRepository: vaultItemRepository,
  vaultRepository,
  categoryRepository,
}) {
  async function requireVerifiedVault(ownerUserId: string, vaultIdInput: string): Promise<{ ownerId: Types.ObjectId; vaultId: Types.ObjectId; currentKeyId: string }> {
    const ownerId = asObjectId(ownerUserId, 'Vault not found.');
    const vaultId = asObjectId(vaultIdInput, 'Vault not found.');
    const vault = await dependencies.vaultRepository.findByIdForOwner(vaultId, ownerId);
    if (!vault) throw new AppError(404, 'VAULT_NOT_FOUND', 'Vault not found.');
    if (vault.migrationState !== 'verified') throw new AppError(503, 'VAULT_ENCRYPTION_NOT_READY', 'Encrypted vault operations are not available yet.');
    if (!vault.currentKeyId) throw new AppError(500, 'VAULT_INTEGRITY_ERROR', 'Vault encryption metadata is unavailable.', false);
    return { ownerId, vaultId, currentKeyId: vault.currentKeyId };
  }

  async function validateCategory(ownerId: Types.ObjectId, vaultId: Types.ObjectId, metadata: { categoryId?: string }) {
    if (!metadata.categoryId) return;
    const category = await dependencies.categoryRepository.findByIdForOwner(new Types.ObjectId(metadata.categoryId), vaultId, ownerId);
    if (!category) throw new AppError(400, 'VAULT_ITEM_CATEGORY_INVALID', 'Vault item category is invalid.');
  }

  async function prepare(ownerUserId: string, vaultIdInput: string, input: unknown) {
    const { ownerId, vaultId } = await requireVerifiedVault(ownerUserId, vaultIdInput);
    const { metadata } = validatePrepareVaultItemInput(input);
    await validateCategory(ownerId, vaultId, metadata);
    const itemId = new Types.ObjectId();
    const metadataForPersistence = {
      ...metadata,
      ...(metadata.categoryId ? { categoryId: new Types.ObjectId(metadata.categoryId) } : {}),
    } as unknown as IVaultItem['metadata'];
    const prepared = await dependencies.itemRepository.prepareForOwner(itemId, vaultId, ownerId, metadataForPersistence);
    return {
      itemId: itemId.toString(),
      vaultId: vaultId.toString(),
      revision: prepared.revision,
      lifecycleState: prepared.lifecycleState,
    };
  }

  async function finalize(ownerUserId: string, vaultIdInput: string, expectedRevisionInput: number, input: unknown) {
    const { ownerId, vaultId, currentKeyId } = await requireVerifiedVault(ownerUserId, vaultIdInput);
    const expectedRevision = validateVaultItemRevision(expectedRevisionInput);
    const preliminary = validateFinalizeVaultItemInput(input, { vaultId: vaultId.toString(), revision: expectedRevision, keyId: currentKeyId });
    const itemId = asObjectId(preliminary.itemId, 'Vault item not found.');
    const prepared = await dependencies.itemRepository.findByIdForOwner(itemId, vaultId, ownerId);
    if (!prepared) throw new AppError(404, 'VAULT_ITEM_PREPARATION_REQUIRED', 'Vault item preparation not found.');
    if (prepared.lifecycleState === 'active') {
      if (expectedRevision === prepared.revision && sameJson(prepared.encryptedSecrets, preliminary.encryptedSecrets)) {
        return { status: 200 as const, item: safeItem(prepared), replay: true };
      }
      conflict();
    }
    if (prepared.lifecycleState !== 'preparing' || prepared.revision !== expectedRevision || expectedRevision !== 1) {
      throw new AppError(412, 'VAULT_ITEM_VERSION_CONFLICT', 'Vault item preparation is stale.');
    }
    const finalized = await dependencies.itemRepository.finalizePreparedForOwnerWithCas(itemId, vaultId, ownerId, expectedRevision, preliminary.encryptedSecrets);
    if (finalized) return { status: 201 as const, item: safeItem(finalized) };

    const current = await dependencies.itemRepository.findByIdForOwner(itemId, vaultId, ownerId);
    if (current?.lifecycleState === 'active' && sameJson(current.encryptedSecrets, preliminary.encryptedSecrets)) {
      return { status: 200 as const, item: safeItem(current), replay: true };
    }
    if (current?.lifecycleState === 'preparing') throw new AppError(412, 'VAULT_ITEM_VERSION_CONFLICT', 'Vault item preparation is stale.');
    conflict();
  }

  async function list(ownerUserId: string, vaultIdInput: string, query: unknown) {
    const { ownerId, vaultId } = await requireVerifiedVault(ownerUserId, vaultIdInput);
    const options = validateVaultItemListQuery(query);
    const items = await dependencies.itemRepository.listForOwner(vaultId, ownerId, {
      ...(options.categoryId ? { categoryId: new Types.ObjectId(options.categoryId) } : {}),
      ...(options.favoriteOnly !== undefined ? { favoriteOnly: options.favoriteOnly } : {}),
    });
    return { items: items.map(safeItem) };
  }

  async function get(ownerUserId: string, vaultIdInput: string, itemIdInput: string) {
    const { ownerId, vaultId } = await requireVerifiedVault(ownerUserId, vaultIdInput);
    const itemId = asObjectId(validateVaultItemId(itemIdInput), 'Vault item not found.');
    const item = await dependencies.itemRepository.findByIdForOwner(itemId, vaultId, ownerId);
    if (!item || item.lifecycleState !== 'active') throw new AppError(404, 'VAULT_ITEM_NOT_FOUND', 'Vault item not found.');
    return { item: safeItem(item) };
  }

  async function update(ownerUserId: string, vaultIdInput: string, itemIdInput: string, expectedRevisionInput: number, input: unknown) {
    const { ownerId, vaultId, currentKeyId } = await requireVerifiedVault(ownerUserId, vaultIdInput);
    const itemId = asObjectId(validateVaultItemId(itemIdInput), 'Vault item not found.');
    const item = await dependencies.itemRepository.findByIdForOwner(itemId, vaultId, ownerId);
    if (!item || item.lifecycleState !== 'active') throw new AppError(404, 'VAULT_ITEM_NOT_FOUND', 'Vault item not found.');
    const expectedRevision = validateVaultItemRevision(expectedRevisionInput);
    if (item.revision !== expectedRevision) throw new AppError(412, 'VAULT_ITEM_VERSION_CONFLICT', 'Vault item revision is stale.');
    const nextRevision = expectedRevision + 1;
    const update = validateVaultItemUpdateInput(input, { vaultId: vaultId.toString(), itemId: itemId.toString(), revision: nextRevision, keyId: currentKeyId });
    const metadata = update.metadata ? mergeVaultItemMetadata(currentMetadata(item), update.metadata) : undefined;
    if (metadata) await validateCategory(ownerId, vaultId, metadata);
    const metadataForPersistence = metadata ? {
      ...metadata,
      ...(metadata.categoryId ? { categoryId: new Types.ObjectId(metadata.categoryId) } : {}),
    } as IVaultItem['metadata'] : undefined;
    const updated = await dependencies.itemRepository.updateForOwnerWithRevision(itemId, vaultId, ownerId, expectedRevision, {
      ...(metadataForPersistence ? { metadata: metadataForPersistence } : {}),
      ...(update.encryptedSecrets ? { encryptedSecrets: update.encryptedSecrets } : {}),
    });
    if (!updated) throw new AppError(412, 'VAULT_ITEM_VERSION_CONFLICT', 'Vault item revision is stale.');
    return { item: safeItem(updated) };
  }

  async function remove(ownerUserId: string, vaultIdInput: string, itemIdInput: string, expectedRevisionInput: number) {
    const { ownerId, vaultId } = await requireVerifiedVault(ownerUserId, vaultIdInput);
    const itemId = asObjectId(validateVaultItemId(itemIdInput), 'Vault item not found.');
    const expectedRevision = validateVaultItemRevision(expectedRevisionInput);
    const deleted = await dependencies.itemRepository.softDeleteForOwner(itemId, vaultId, ownerId, expectedRevision);
    if (!deleted) throw new AppError(412, 'VAULT_ITEM_VERSION_CONFLICT', 'Vault item revision is stale or item is unavailable.');
    return { item: safeItem(deleted) };
  }

  async function restore(ownerUserId: string, vaultIdInput: string, itemIdInput: string, expectedRevisionInput: number) {
    const { ownerId, vaultId } = await requireVerifiedVault(ownerUserId, vaultIdInput);
    const itemId = asObjectId(validateVaultItemId(itemIdInput), 'Vault item not found.');
    const expectedRevision = validateVaultItemRevision(expectedRevisionInput);
    const existing = await dependencies.itemRepository.findByIdForOwnerIncludingDeleted(itemId, vaultId, ownerId);
    if (!existing || existing.lifecycleState !== 'deleted') throw new AppError(404, 'VAULT_ITEM_NOT_FOUND', 'Vault item not found.');
    const restored = await dependencies.itemRepository.restoreForOwner(itemId, vaultId, ownerId, expectedRevision);
    if (!restored) throw new AppError(412, 'VAULT_ITEM_VERSION_CONFLICT', 'Vault item revision is stale.');
    return { item: safeItem(restored) };
  }

  return { prepare, finalize, list, get, update, remove, restore };
}

export const vaultItemService = createVaultItemService();
