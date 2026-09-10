import { AES_GCM_ALGORITHM, buildCanonicalAad, CRYPTO_VERSION } from '../../crypto';
import { AppError } from '../errors/AppError';
import { EncryptedSecrets, VAULT_ITEM_SECRET_FIELDS, VaultItemSecretField } from '../models/VaultItem';

const BASE64URL = /^[A-Za-z0-9_-]+$/;
const METADATA_FIELDS = ['title', 'websiteUrl', 'categoryId', 'tags', 'colorLabel', 'websiteLogo', 'isFavorite', 'isPinned'] as const;
const UPDATE_FIELDS = ['metadata', 'encryptedSecrets'] as const;

export type VaultItemMetadata = {
  title: string;
  websiteUrl?: string;
  categoryId?: string;
  tags: string[];
  colorLabel?: string;
  websiteLogo?: string;
  isFavorite: boolean;
  isPinned: boolean;
};

export type VaultItemUpdateInput = {
  metadata?: Partial<VaultItemMetadata>;
  encryptedSecrets?: EncryptedSecrets;
};

function invalid(message: string): never {
  throw new AppError(400, 'VAULT_ITEM_INVALID_REQUEST', message);
}

function assertObject(value: unknown, message: string): asserts value is object {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(message);
}

function assertAllowedKeys(value: object, allowed: readonly string[], message: string): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) invalid(message);
}

function assertText(value: unknown, message: string, maxLength: number): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) invalid(message);
}

function assertBoolean(value: unknown, message: string): asserts value is boolean {
  if (typeof value !== 'boolean') invalid(message);
}

function assertObjectId(value: unknown, message: string): asserts value is string {
  assertText(value, message, 24);
  if (!/^[a-f\d]{24}$/i.test(value)) invalid(message);
}

function assertUrl(value: unknown, message: string): asserts value is string {
  assertText(value, message, 2048);
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') invalid(message);
  } catch {
    invalid(message);
  }
}

function parseMetadata(input: unknown, partial: boolean): VaultItemMetadata | Partial<VaultItemMetadata> {
  assertObject(input, 'Vault item metadata is invalid.');
  assertAllowedKeys(input, METADATA_FIELDS, 'Vault item metadata contains unsupported fields.');
  const candidate = input as Record<string, unknown>;

  if (!partial || 'title' in candidate) assertText(candidate.title, 'Vault item title is invalid.', 240);
  if ('websiteUrl' in candidate && candidate.websiteUrl !== undefined) assertUrl(candidate.websiteUrl, 'Vault item website URL is invalid.');
  if ('websiteLogo' in candidate && candidate.websiteLogo !== undefined) assertUrl(candidate.websiteLogo, 'Vault item website logo URL is invalid.');
  if ('categoryId' in candidate && candidate.categoryId !== undefined) assertObjectId(candidate.categoryId, 'Vault item category is invalid.');
  if ('tags' in candidate) {
    if (!Array.isArray(candidate.tags) || candidate.tags.length > 50 || candidate.tags.some((tag) => typeof tag !== 'string' || tag.trim().length === 0 || tag.length > 64)) {
      invalid('Vault item tags are invalid.');
    }
  }
  if ('colorLabel' in candidate && candidate.colorLabel !== undefined) assertText(candidate.colorLabel, 'Vault item color label is invalid.', 64);
  if ('isFavorite' in candidate) assertBoolean(candidate.isFavorite, 'Vault item favorite flag is invalid.');
  if ('isPinned' in candidate) assertBoolean(candidate.isPinned, 'Vault item pinned flag is invalid.');

  if (partial) {
    if (Object.keys(candidate).length === 0) invalid('Vault item metadata is empty.');
    return candidate as Partial<VaultItemMetadata>;
  }

  return {
    title: (candidate.title as string).trim(),
    ...(candidate.websiteUrl !== undefined ? { websiteUrl: candidate.websiteUrl as string } : {}),
    ...(candidate.categoryId !== undefined ? { categoryId: candidate.categoryId as string } : {}),
    tags: (candidate.tags as string[] | undefined)?.map((tag) => tag.trim()) ?? [],
    ...(candidate.colorLabel !== undefined ? { colorLabel: candidate.colorLabel as string } : {}),
    ...(candidate.websiteLogo !== undefined ? { websiteLogo: candidate.websiteLogo as string } : {}),
    isFavorite: (candidate.isFavorite as boolean | undefined) ?? false,
    isPinned: (candidate.isPinned as boolean | undefined) ?? false,
  };
}

export function validatePrepareVaultItemInput(input: unknown): { metadata: VaultItemMetadata } {
  assertObject(input, 'Vault item preparation request is invalid.');
  assertAllowedKeys(input, ['metadata'], 'Vault item preparation request contains unsupported fields.');
  return { metadata: parseMetadata((input as { metadata?: unknown }).metadata, false) as VaultItemMetadata };
}

function decodeBase64Url(value: unknown, message: string, minBytes: number, maxBytes: number): Buffer {
  if (typeof value !== 'string' || value.length === 0 || !BASE64URL.test(value)) invalid(message);
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.toString('base64url') !== value || decoded.length < minBytes || decoded.length > maxBytes) invalid(message);
  return decoded;
}

function validateEnvelope(value: unknown, context: {
  vaultId: string;
  itemId: string;
  field: VaultItemSecretField;
  revision: number;
  keyId?: string;
}): EncryptedSecrets[VaultItemSecretField] {
  assertObject(value, 'Vault item encrypted envelope is invalid.');
  assertAllowedKeys(value, ['version', 'keyId', 'algorithm', 'nonce', 'ciphertext', 'tag', 'aad'], 'Vault item encrypted envelope contains unsupported fields.');
  const envelope = value as Record<string, unknown>;
  if (envelope.version !== CRYPTO_VERSION || envelope.algorithm !== AES_GCM_ALGORITHM) invalid('Vault item encrypted envelope is unsupported.');
  assertText(envelope.keyId, 'Vault item encrypted envelope is invalid.', 128);
  if (context.keyId !== undefined && envelope.keyId !== context.keyId) invalid('Vault item encrypted envelope key is invalid.');
  decodeBase64Url(envelope.nonce, 'Vault item encrypted envelope is invalid.', 12, 12);
  decodeBase64Url(envelope.ciphertext, 'Vault item encrypted envelope is invalid.', 0, 1_000_000);
  decodeBase64Url(envelope.tag, 'Vault item encrypted envelope is invalid.', 16, 16);
  const aad = decodeBase64Url(envelope.aad, 'Vault item encrypted envelope is invalid.', 1, 4096);
  const expectedAad = buildCanonicalAad({
    purpose: 'vault-secret',
    vaultId: context.vaultId,
    itemId: context.itemId,
    field: context.field,
    revision: context.revision,
    keyId: envelope.keyId,
    cryptoVersion: CRYPTO_VERSION,
  });
  if (aad.length !== expectedAad.length || !aad.equals(expectedAad)) invalid('Vault item encrypted envelope context is invalid.');
  return value as EncryptedSecrets[VaultItemSecretField];
}

export function validateEncryptedSecrets(input: unknown, context: { vaultId: string; itemId: string; revision: number; keyId?: string }): EncryptedSecrets {
  assertObject(input, 'Vault item encrypted secrets are invalid.');
  assertAllowedKeys(input, VAULT_ITEM_SECRET_FIELDS, 'Vault item encrypted secrets contain unsupported fields.');
  const candidate = input as Record<string, unknown>;
  if (Object.keys(candidate).length === 0) invalid('Vault item encrypted secrets are empty.');
  const result: EncryptedSecrets = {};
  for (const field of Object.keys(candidate) as VaultItemSecretField[]) {
    result[field] = validateEnvelope(candidate[field], { ...context, field });
  }
  return result;
}

export function validateFinalizeVaultItemInput(input: unknown, context: { vaultId: string; revision: number; keyId?: string }): { itemId: string; encryptedSecrets: EncryptedSecrets } {
  assertObject(input, 'Vault item creation request is invalid.');
  assertAllowedKeys(input, ['itemId', 'encryptedSecrets'], 'Vault item creation request contains unsupported fields.');
  const candidate = input as { itemId?: unknown; encryptedSecrets?: unknown };
  assertObjectId(candidate.itemId, 'Vault item ID is invalid.');
  return {
    itemId: candidate.itemId,
    encryptedSecrets: validateEncryptedSecrets(candidate.encryptedSecrets, { ...context, itemId: candidate.itemId }),
  };
}

export function validateVaultItemUpdateInput(input: unknown, context: { vaultId: string; itemId: string; revision: number; keyId?: string }): VaultItemUpdateInput {
  assertObject(input, 'Vault item update request is invalid.');
  assertAllowedKeys(input, UPDATE_FIELDS, 'Vault item update request contains unsupported fields.');
  const candidate = input as { metadata?: unknown; encryptedSecrets?: unknown };
  if (candidate.metadata === undefined && candidate.encryptedSecrets === undefined) invalid('Vault item update request is empty.');
  return {
    ...(candidate.metadata !== undefined ? { metadata: parseMetadata(candidate.metadata, true) as Partial<VaultItemMetadata> } : {}),
    ...(candidate.encryptedSecrets !== undefined ? { encryptedSecrets: validateEncryptedSecrets(candidate.encryptedSecrets, context) } : {}),
  };
}

export function validateVaultItemId(value: unknown): string {
  assertObjectId(value, 'Vault item ID is invalid.');
  return value;
}

export function validateVaultItemRevision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) invalid('Vault item revision is invalid.');
  return value;
}

export function validateVaultItemListQuery(input: unknown): { categoryId?: string; favoriteOnly?: boolean } {
  assertObject(input, 'Vault item query is invalid.');
  assertAllowedKeys(input, ['categoryId', 'favoriteOnly'], 'Vault item query contains unsupported fields.');
  const candidate = input as { categoryId?: unknown; favoriteOnly?: unknown };
  if (candidate.categoryId !== undefined) assertObjectId(candidate.categoryId, 'Vault item category is invalid.');
  if (candidate.favoriteOnly !== undefined && candidate.favoriteOnly !== 'true' && candidate.favoriteOnly !== 'false') invalid('Vault item favorite filter is invalid.');
  return {
    ...(candidate.categoryId !== undefined ? { categoryId: candidate.categoryId as string } : {}),
    ...(candidate.favoriteOnly !== undefined ? { favoriteOnly: candidate.favoriteOnly === 'true' } : {}),
  };
}

export function mergeVaultItemMetadata(current: VaultItemMetadata, patch: Partial<VaultItemMetadata>): VaultItemMetadata {
  return {
    ...current,
    ...patch,
    tags: patch.tags ?? current.tags,
    isFavorite: patch.isFavorite ?? current.isFavorite,
    isPinned: patch.isPinned ?? current.isPinned,
  };
}
