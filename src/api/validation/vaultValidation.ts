import { AES_GCM_ALGORITHM, buildCanonicalAad, CRYPTO_VERSION, KDF_ALGORITHM, validateKdfMetadata } from '../../crypto';
import { AppError } from '../errors/AppError';

export type VaultEnvelopeInput = {
  version: number;
  keyId: string;
  algorithm: typeof AES_GCM_ALGORITHM;
  nonce: string;
  ciphertext: string;
  tag: string;
  aad: string;
};

export type VaultKdfInput = {
  algorithm: typeof KDF_ALGORITHM;
  version: typeof CRYPTO_VERSION;
  salt: string;
  memoryKiB: 65536;
  timeCost: 3;
  parallelism: 1;
  outputBytes: 32;
  purpose: 'vault-kek';
};

export type FinalizeVaultInput = {
  name: string;
  wrappedVekEnvelope: VaultEnvelopeInput;
  kdf: VaultKdfInput;
  currentKeyId: string;
  encryptionFormatVersion: typeof CRYPTO_VERSION;
};

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function invalid(message: string): never {
  throw new AppError(400, 'VAULT_VALIDATION_ERROR', message);
}

function assertBase64Url(value: unknown, name: string, minBytes: number, maxBytes: number): void {
  if (typeof value !== 'string' || !BASE64URL.test(value)) invalid(`${name} is invalid.`);
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.toString('base64url') !== value || decoded.length < minBytes || decoded.length > maxBytes) {
    invalid(`${name} is invalid.`);
  }
}

function assertText(value: unknown, name: string, maxLength: number): asserts value is string {
  if (typeof value !== 'string' || value.trim().length < 1 || value.length > maxLength) invalid(`${name} is invalid.`);
}

function assertAllowedKeys(value: object, allowed: readonly string[], name: string): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) invalid(`${name} contains unsupported fields.`);
}

export function validateVaultName(value: unknown): string {
  assertText(value, 'Vault name', 160);
  return value.trim();
}

export function validatePrepareVaultInput(input: unknown): { name: string } {
  if (!input || typeof input !== 'object') invalid('Vault preparation request is invalid.');
  const candidate = input as { name?: unknown };
  assertAllowedKeys(candidate, ['name'], 'Vault preparation request');
  return { name: validateVaultName(candidate.name) };
}

export function validateVaultId(value: unknown): string {
  assertText(value, 'Vault ID', 24);
  if (!/^[a-f\d]{24}$/i.test(value)) invalid('Vault ID is invalid.');
  return value;
}

function validateEnvelope(envelope: unknown, vaultId: string, currentKeyId: string): VaultEnvelopeInput {
  if (!envelope || typeof envelope !== 'object') invalid('Wrapped VEK envelope is invalid.');
  const candidate = envelope as Partial<VaultEnvelopeInput>;
  assertAllowedKeys(candidate, ['version', 'keyId', 'algorithm', 'nonce', 'ciphertext', 'tag', 'aad'], 'Wrapped VEK envelope');
  if (candidate.version !== CRYPTO_VERSION || candidate.algorithm !== AES_GCM_ALGORITHM) invalid('Wrapped VEK envelope is unsupported.');
  assertText(candidate.keyId, 'Envelope key ID', 128);
  if (candidate.keyId !== currentKeyId) invalid('Envelope key ID is invalid.');
  assertBase64Url(candidate.nonce, 'Envelope nonce', 12, 12);
  assertBase64Url(candidate.ciphertext, 'Envelope ciphertext', 32, 32);
  assertBase64Url(candidate.tag, 'Envelope tag', 16, 16);
  assertBase64Url(candidate.aad, 'Envelope AAD', 1, 4096);

  const expectedAad = buildCanonicalAad({
    purpose: 'vek-wrap',
    vaultId,
    field: 'vek',
    revision: 1,
    keyId: currentKeyId,
    cryptoVersion: CRYPTO_VERSION,
  });
  const actualAad = Buffer.from(candidate.aad!, 'base64url');
  if (actualAad.length !== expectedAad.length || !actualAad.equals(expectedAad)) invalid('Wrapped VEK context is invalid.');

  return candidate as VaultEnvelopeInput;
}

function validateKdf(kdf: unknown): VaultKdfInput {
  if (!kdf || typeof kdf !== 'object') invalid('KDF metadata is invalid.');
  const candidate = kdf as Partial<VaultKdfInput>;
  assertAllowedKeys(candidate, ['algorithm', 'version', 'salt', 'memoryKiB', 'timeCost', 'parallelism', 'outputBytes', 'purpose'], 'KDF metadata');
  if (
    candidate.algorithm !== KDF_ALGORITHM ||
    candidate.version !== CRYPTO_VERSION ||
    candidate.memoryKiB !== 65536 ||
    candidate.timeCost !== 3 ||
    candidate.parallelism !== 1 ||
    candidate.outputBytes !== 32 ||
    candidate.purpose !== 'vault-kek'
  ) invalid('KDF metadata is unsupported.');
  assertBase64Url(candidate.salt, 'KDF salt', 16, 64);
  try {
    validateKdfMetadata(candidate as VaultKdfInput);
  } catch {
    invalid('KDF metadata is invalid.');
  }
  return candidate as VaultKdfInput;
}

export function validateFinalizeVaultInput(input: unknown, vaultId: string): FinalizeVaultInput {
  if (!input || typeof input !== 'object') invalid('Vault request is invalid.');
  const candidate = input as Partial<FinalizeVaultInput>;
  assertAllowedKeys(candidate, ['name', 'wrappedVekEnvelope', 'kdf', 'currentKeyId', 'encryptionFormatVersion'], 'Vault request');
  const name = validateVaultName(candidate.name);
  assertText(candidate.currentKeyId, 'Current key ID', 128);
  if (candidate.encryptionFormatVersion !== CRYPTO_VERSION) invalid('Encryption format version is unsupported.');
  const kdf = validateKdf(candidate.kdf);
  const wrappedVekEnvelope = validateEnvelope(candidate.wrappedVekEnvelope, vaultId, candidate.currentKeyId);
  return {
    name,
    wrappedVekEnvelope,
    kdf,
    currentKeyId: candidate.currentKeyId,
    encryptionFormatVersion: CRYPTO_VERSION,
  };
}

export function validateMetadataPatch(input: unknown): { name: string } {
  if (!input || typeof input !== 'object') invalid('Vault update is invalid.');
  const candidate = input as { name?: unknown };
  if (Object.keys(candidate).some((key) => key !== 'name')) invalid('Vault update contains unsupported fields.');
  return { name: validateVaultName(candidate.name) };
}
