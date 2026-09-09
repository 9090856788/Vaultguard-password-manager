import { Types } from 'mongoose';
import { IVault } from '../models/Vault';
import { ObjectId } from '../models/common';
import { AppError } from '../errors/AppError';
import { vaultRepository } from '../repositories/VaultRepository';
import {
  FinalizeVaultInput,
  validateFinalizeVaultInput,
  validateMetadataPatch,
  validatePrepareVaultInput,
  validateVaultId,
} from '../validation/vaultValidation';

type VaultRepository = typeof vaultRepository;

function asObjectId(value: string): ObjectId {
  return new Types.ObjectId(value);
}

function persistedId(vault: IVault): string | undefined {
  return (vault as IVault & { _id?: ObjectId })._id?.toString();
}

function safeVault(vault: IVault) {
  return {
    id: persistedId(vault),
    name: vault.name,
    ...(vault.currentKeyId ? { currentKeyId: vault.currentKeyId } : {}),
    ...(vault.encryptionFormatVersion ? { encryptionFormatVersion: vault.encryptionFormatVersion } : {}),
    migrationState: vault.migrationState,
    createdAt: vault.createdAt,
    updatedAt: vault.updatedAt,
  };
}

function keyMaterial(vault: IVault) {
  return {
    vaultId: persistedId(vault),
    wrappedVekEnvelope: vault.wrappedVekEnvelope,
    kdf: vault.kdf,
    currentKeyId: vault.currentKeyId,
    encryptionFormatVersion: vault.encryptionFormatVersion,
    migrationState: vault.migrationState,
  };
}

function sameFinalizePayload(vault: IVault, input: FinalizeVaultInput): boolean {
  return vault.name === input.name
    && vault.currentKeyId === input.currentKeyId
    && vault.encryptionFormatVersion === input.encryptionFormatVersion
    && JSON.stringify(vault.wrappedVekEnvelope) === JSON.stringify(input.wrappedVekEnvelope)
    && JSON.stringify(vault.kdf) === JSON.stringify(input.kdf);
}

function conflict(): never {
  throw new AppError(409, 'VAULT_CREATION_CONFLICT', 'Vault creation conflicts with an existing resource.');
}

export function createVaultLifecycleService(dependencies: VaultRepository = vaultRepository) {
  async function prepare(ownerUserId: string, input: unknown) {
    const ownerId = asObjectId(ownerUserId);
    const { name } = validatePrepareVaultInput(input);
    const vaultId = new Types.ObjectId();
    const prepared = await dependencies.prepareForOwner(vaultId, ownerId, name);
    return {
      vaultId: vaultId.toString(),
      contractVersion: 1,
      migrationState: prepared.migrationState,
      updatedAt: prepared.updatedAt,
    };
  }

  async function list(ownerUserId: string) {
    const ownerId = asObjectId(ownerUserId);
    const vaults = await dependencies.listForOwner(ownerId);
    return { items: vaults.map(safeVault) };
  }

  async function finalize(ownerUserId: string, vaultIdInput: string, expectedUpdatedAt: Date, input: unknown) {
    const vaultId = validateVaultId(vaultIdInput);
    const ownerId = asObjectId(ownerUserId);
    const prepared = await dependencies.findByIdForOwner(asObjectId(vaultId), ownerId);
    if (!prepared) throw new AppError(404, 'VAULT_PREPARATION_REQUIRED', 'Vault preparation not found.');
    const validated = validateFinalizeVaultInput(input, vaultId);

    if (prepared.migrationState === 'verified') {
      if (sameFinalizePayload(prepared, validated)) return { status: 200 as const, item: safeVault(prepared), replay: true };
      conflict();
    }

    if (prepared.migrationState !== 'preparing') throw new AppError(409, 'VAULT_PREPARATION_REQUIRED', 'Vault is not ready for finalization.');
    const finalized = await dependencies.finalizePreparedForOwner(asObjectId(vaultId), ownerId, expectedUpdatedAt, validated);
    if (finalized) return { status: 201 as const, item: safeVault(finalized) };

    const current = await dependencies.findByIdForOwner(asObjectId(vaultId), ownerId);
    if (current?.migrationState === 'verified' && sameFinalizePayload(current, validated)) {
      return { status: 200 as const, item: safeVault(current), replay: true };
    }
    if (current?.migrationState === 'preparing') throw new AppError(412, 'VAULT_VERSION_CONFLICT', 'Vault preparation is stale.');
    conflict();
  }

  async function getKeyMaterial(ownerUserId: string, vaultIdInput: string) {
    const vaultId = validateVaultId(vaultIdInput);
    const vault = await dependencies.findKeyMaterialForOwner(asObjectId(vaultId), asObjectId(ownerUserId));
    if (!vault) throw new AppError(404, 'VAULT_NOT_FOUND', 'Vault not found.');
    try {
      validateFinalizeVaultInput({
        name: vault.name,
        wrappedVekEnvelope: vault.wrappedVekEnvelope,
        kdf: vault.kdf,
        currentKeyId: vault.currentKeyId,
        encryptionFormatVersion: vault.encryptionFormatVersion,
      }, vaultId);
    } catch {
      throw new AppError(500, 'VAULT_INTEGRITY_ERROR', 'Vault key material is unavailable.', false);
    }
    return keyMaterial(vault);
  }

  async function updateMetadata(ownerUserId: string, vaultIdInput: string, expectedUpdatedAt: Date, input: unknown) {
    const vaultId = validateVaultId(vaultIdInput);
    const update = validateMetadataPatch(input);
    const updated = await dependencies.updateNameForOwner(asObjectId(vaultId), asObjectId(ownerUserId), expectedUpdatedAt, update.name);
    if (!updated) throw new AppError(412, 'VAULT_VERSION_CONFLICT', 'Vault metadata is stale.');
    return { item: safeVault(updated) };
  }

  return { prepare, list, finalize, getKeyMaterial, updateMetadata };
}

export const vaultLifecycleService = createVaultLifecycleService();
