import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';

export const CRYPTO_VERSION = 1 as const;
export const AES_GCM_ALGORITHM = 'AES-256-GCM' as const;
export const KDF_ALGORITHM = 'Argon2id' as const;
export const KEK_BYTES = 32;
export const VEK_BYTES = 32;
export const AES_GCM_NONCE_BYTES = 12;
export const AES_GCM_TAG_BYTES = 16;

export const APPROVED_KDF_PARAMETERS = {
  algorithm: KDF_ALGORITHM,
  version: CRYPTO_VERSION,
  memoryKiB: 65536,
  timeCost: 3,
  parallelism: 1,
  outputBytes: KEK_BYTES,
  purpose: 'vault-kek' as const,
} as const;

const KDF_CONTEXT = Buffer.from('VaultGuard|vault-kek|v1\0', 'utf8');
const PURPOSES = new Set(['vek-wrap', 'vault-secret']);

export type KdfMetadata = {
  algorithm: typeof KDF_ALGORITHM;
  version: typeof CRYPTO_VERSION;
  salt: string;
  memoryKiB: 65536;
  timeCost: 3;
  parallelism: 1;
  outputBytes: 32;
  purpose: 'vault-kek';
};

export type AadContext = {
  purpose: 'vek-wrap' | 'vault-secret';
  vaultId: string;
  itemId?: string;
  field: string;
  revision: number;
  keyId: string;
  cryptoVersion: typeof CRYPTO_VERSION;
};

export type EncryptedEnvelope = {
  version: typeof CRYPTO_VERSION;
  keyId: string;
  algorithm: typeof AES_GCM_ALGORITHM;
  nonce: string;
  ciphertext: string;
  tag: string;
  aad: string;
};

function fail(message: string): never {
  throw new Error(`Crypto validation failed: ${message}`);
}

function assertKey(key: Uint8Array, name: string): void {
  if (!(key instanceof Uint8Array) || key.byteLength !== KEK_BYTES) fail(`${name} must be exactly 32 bytes.`);
}

function assertText(value: string, name: string, maxLength: number): void {
  if (typeof value !== 'string' || value.length < 1 || value.length > maxLength) fail(`${name} is invalid.`);
}

function encodeBase64Url(value: Uint8Array): string {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: unknown, name: string, allowEmpty = false): Buffer {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0) || !/^[A-Za-z0-9_-]*$/.test(value)) {
    fail(`${name} encoding is invalid.`);
  }
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.toString('base64url') !== value) fail(`${name} encoding is non-canonical.`);
  return decoded;
}

function assertKdfMetadata(metadata: KdfMetadata): void {
  if (
    !metadata ||
    metadata.algorithm !== APPROVED_KDF_PARAMETERS.algorithm ||
    metadata.version !== APPROVED_KDF_PARAMETERS.version ||
    metadata.memoryKiB !== APPROVED_KDF_PARAMETERS.memoryKiB ||
    metadata.timeCost !== APPROVED_KDF_PARAMETERS.timeCost ||
    metadata.parallelism !== APPROVED_KDF_PARAMETERS.parallelism ||
    metadata.outputBytes !== APPROVED_KDF_PARAMETERS.outputBytes ||
    metadata.purpose !== APPROVED_KDF_PARAMETERS.purpose
  ) {
    fail('unsupported KDF parameters.');
  }
  const salt = decodeBase64Url(metadata.salt, 'KDF salt');
  if (salt.length < 16 || salt.length > 64) fail('KDF salt length is invalid.');
}

export function createKdfMetadata(): KdfMetadata {
  return { ...APPROVED_KDF_PARAMETERS, salt: encodeBase64Url(randomBytes(16)) };
}

export function validateKdfMetadata(metadata: KdfMetadata): void {
  assertKdfMetadata(metadata);
}

export async function deriveVaultKek(masterPassword: string, metadata: KdfMetadata): Promise<Buffer> {
  if (typeof masterPassword !== 'string' || masterPassword.length === 0) fail('Vault Master Password cannot be empty.');
  assertKdfMetadata(metadata);
  const salt = decodeBase64Url(metadata.salt, 'KDF salt');
  const passwordInput = Buffer.concat([KDF_CONTEXT, Buffer.from(masterPassword, 'utf8')]);
  try {
    return await argon2.hash(passwordInput, {
      type: argon2.argon2id,
      memoryCost: APPROVED_KDF_PARAMETERS.memoryKiB,
      timeCost: APPROVED_KDF_PARAMETERS.timeCost,
      parallelism: APPROVED_KDF_PARAMETERS.parallelism,
      hashLength: APPROVED_KDF_PARAMETERS.outputBytes,
      salt,
      raw: true,
    });
  } finally {
    passwordInput.fill(0);
  }
}

export function generateVek(): Buffer {
  return randomBytes(VEK_BYTES);
}

function validateAadContext(context: AadContext): void {
  if (!context || !PURPOSES.has(context.purpose)) fail('AAD purpose is unsupported.');
  if (context.cryptoVersion !== CRYPTO_VERSION) fail('AAD crypto version is unsupported.');
  assertText(context.vaultId, 'vaultId', 256);
  assertText(context.field, 'field', 256);
  assertText(context.keyId, 'keyId', 128);
  if (context.itemId !== undefined) assertText(context.itemId, 'itemId', 256);
  if (!Number.isSafeInteger(context.revision) || context.revision < 1) fail('AAD revision is invalid.');
}

function lengthPrefix(value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8');
  const prefix = Buffer.allocUnsafe(4);
  prefix.writeUInt32BE(bytes.length, 0);
  return Buffer.concat([prefix, bytes]);
}

export function buildCanonicalAad(context: AadContext): Buffer {
  validateAadContext(context);
  return Buffer.concat([
    lengthPrefix('VaultGuard-AAD'),
    lengthPrefix(String(context.cryptoVersion)),
    lengthPrefix(context.purpose),
    lengthPrefix(context.vaultId),
    lengthPrefix(context.itemId ?? ''),
    lengthPrefix(context.field),
    lengthPrefix(String(context.revision)),
    lengthPrefix(context.keyId),
  ]);
}

function validateEnvelope(envelope: EncryptedEnvelope, context: AadContext): { nonce: Buffer; ciphertext: Buffer; tag: Buffer; aad: Buffer } {
  if (!envelope || envelope.version !== CRYPTO_VERSION || envelope.algorithm !== AES_GCM_ALGORITHM) {
    fail('unsupported or malformed envelope version.');
  }
  assertText(envelope.keyId, 'envelope keyId', 128);
  if (envelope.keyId !== context.keyId) fail('envelope keyId does not match context.');
  const nonce = decodeBase64Url(envelope.nonce, 'envelope nonce');
  const ciphertext = decodeBase64Url(envelope.ciphertext, 'envelope ciphertext', true);
  const tag = decodeBase64Url(envelope.tag, 'envelope tag');
  const aad = decodeBase64Url(envelope.aad, 'envelope AAD');
  if (nonce.length !== AES_GCM_NONCE_BYTES) fail('nonce length is invalid.');
  if (tag.length !== AES_GCM_TAG_BYTES) fail('authentication tag length is invalid.');
  const expectedAad = buildCanonicalAad(context);
  if (aad.length !== expectedAad.length || !timingSafeEqual(aad, expectedAad)) fail('AAD does not match context.');
  return { nonce, ciphertext, tag, aad };
}

function encryptBytes(plaintext: Uint8Array, key: Uint8Array, context: AadContext): EncryptedEnvelope {
  assertKey(key, 'Encryption key');
  if (!(plaintext instanceof Uint8Array)) fail('plaintext must be bytes.');
  const nonce = randomBytes(AES_GCM_NONCE_BYTES);
  const aad = buildCanonicalAad(context);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    version: CRYPTO_VERSION,
    keyId: context.keyId,
    algorithm: AES_GCM_ALGORITHM,
    nonce: encodeBase64Url(nonce),
    ciphertext: encodeBase64Url(ciphertext),
    tag: encodeBase64Url(cipher.getAuthTag()),
    aad: encodeBase64Url(aad),
  };
}

function decryptBytes(envelope: EncryptedEnvelope, key: Uint8Array, context: AadContext): Buffer {
  assertKey(key, 'Decryption key');
  const { nonce, ciphertext, tag, aad } = validateEnvelope(envelope, context);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    fail('authenticated decryption failed.');
  }
}

export function wrapVek(vek: Uint8Array, kek: Uint8Array, context: Omit<AadContext, 'purpose' | 'field'> & { purpose?: 'vek-wrap'; field?: string }): EncryptedEnvelope {
  assertKey(vek, 'VEK');
  return encryptBytes(vek, kek, { ...context, purpose: 'vek-wrap', field: context.field ?? 'vek' });
}

export function unwrapVek(envelope: EncryptedEnvelope, kek: Uint8Array, context: Omit<AadContext, 'purpose' | 'field'> & { purpose?: 'vek-wrap'; field?: string }): Buffer {
  return decryptBytes(envelope, kek, { ...context, purpose: 'vek-wrap', field: context.field ?? 'vek' });
}

export function encryptSecret(plaintext: Uint8Array | string, vek: Uint8Array, context: Omit<AadContext, 'purpose'> & { purpose?: 'vault-secret' }): EncryptedEnvelope {
  const bytes = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
  return encryptBytes(bytes, vek, { ...context, purpose: 'vault-secret' });
}

export function decryptSecret(envelope: EncryptedEnvelope, vek: Uint8Array, context: Omit<AadContext, 'purpose'> & { purpose?: 'vault-secret' }): Buffer {
  return decryptBytes(envelope, vek, { ...context, purpose: 'vault-secret' });
}

export function zeroize(key: Uint8Array): void {
  if (key instanceof Uint8Array) key.fill(0);
}
