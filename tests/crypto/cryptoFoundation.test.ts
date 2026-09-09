import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import {
  AES_GCM_NONCE_BYTES,
  AES_GCM_TAG_BYTES,
  APPROVED_KDF_PARAMETERS,
  buildCanonicalAad,
  createKdfMetadata,
  decryptSecret,
  deriveVaultKek,
  encryptSecret,
  generateVek,
  unwrapVek,
  validateKdfMetadata,
  wrapVek,
  zeroize,
} from '../../src/crypto';

const context = {
  purpose: 'vault-secret' as const,
  vaultId: 'vault-test-001',
  itemId: 'item-test-001',
  field: 'password',
  revision: 1,
  keyId: 'key-test-001',
  cryptoVersion: 1 as const,
};

const wrapContext = {
  vaultId: context.vaultId,
  itemId: undefined,
  field: 'vek',
  revision: context.revision,
  keyId: context.keyId,
  cryptoVersion: context.cryptoVersion,
};

test('KDF metadata uses the approved versioned baseline and random salt', async () => {
  const first = createKdfMetadata();
  const second = createKdfMetadata();
  validateKdfMetadata(first);
  assert.equal(first.memoryKiB, APPROVED_KDF_PARAMETERS.memoryKiB);
  assert.equal(first.timeCost, APPROVED_KDF_PARAMETERS.timeCost);
  assert.equal(first.parallelism, APPROVED_KDF_PARAMETERS.parallelism);
  assert.equal(first.outputBytes, 32);
  assert.notEqual(first.salt, second.salt);

  const firstKey = await deriveVaultKek('synthetic-test-password', first);
  const repeatKey = await deriveVaultKek('synthetic-test-password', first);
  assert.equal(firstKey.length, 32);
  assert.deepEqual(firstKey, repeatKey);
  zeroize(firstKey);
  zeroize(repeatKey);
});

test('Argon2id matches the fixed approved-parameter test vector', async () => {
  const metadata = {
    algorithm: 'Argon2id' as const,
    version: 1 as const,
    salt: Buffer.from('0123456789abcdef', 'utf8').toString('base64url'),
    memoryKiB: 65536 as const,
    timeCost: 3 as const,
    parallelism: 1 as const,
    outputBytes: 32 as const,
    purpose: 'vault-kek' as const,
  };
  const derived = await deriveVaultKek('synthetic-test-password', metadata);
  assert.equal(derived.toString('hex'), '8e64dca67dc096fe8137e16b0a2a2241ef53c823eb89d5856f0aa92c62072eea');
  zeroize(derived);
});

test('insecure or altered KDF metadata is rejected', () => {
  const metadata = createKdfMetadata();
  assert.throws(() => validateKdfMetadata({ ...metadata, memoryKiB: 1 } as never));
  assert.throws(() => validateKdfMetadata({ ...metadata, timeCost: 1 } as never));
  assert.throws(() => validateKdfMetadata({ ...metadata, parallelism: 2 } as never));
  assert.throws(() => validateKdfMetadata({ ...metadata, outputBytes: 16 } as never));
});

test('VEKs are exactly 32 random bytes and are not predictable', () => {
  const first = generateVek();
  const second = generateVek();
  assert.equal(first.length, 32);
  assert.equal(second.length, 32);
  assert.notEqual(createHash('sha256').update(first).digest('hex'), createHash('sha256').update(second).digest('hex'));
  zeroize(first);
  zeroize(second);
});

test('VEK wrapping authenticates key, metadata, nonce, tag, and AAD', () => {
  const kek = Buffer.alloc(32, 7);
  const vek = Buffer.alloc(32, 8);
  const envelope = wrapVek(vek, kek, wrapContext);
  assert.equal(Buffer.from(envelope.nonce, 'base64url').length, AES_GCM_NONCE_BYTES);
  assert.equal(Buffer.from(envelope.tag, 'base64url').length, AES_GCM_TAG_BYTES);
  assert.deepEqual(unwrapVek(envelope, kek, wrapContext), vek);
  assert.throws(() => unwrapVek(envelope, Buffer.alloc(32, 9), wrapContext));
  assert.throws(() => unwrapVek({ ...envelope, ciphertext: `${envelope.ciphertext}A` }, kek, wrapContext));
  assert.throws(() => unwrapVek({ ...envelope, tag: `${envelope.tag}A` }, kek, wrapContext));
  assert.throws(() => unwrapVek(envelope, kek, { ...wrapContext, field: 'other' }));
  zeroize(kek);
  zeroize(vek);
});

test('VEK wrapping rejects invalid VEK sizes', () => {
  const kek = Buffer.alloc(32, 13);
  assert.throws(() => wrapVek(Buffer.alloc(31), kek, wrapContext));
  assert.throws(() => wrapVek(Buffer.alloc(33), kek, wrapContext));
  zeroize(kek);
});

test('secret envelopes use fresh nonces and decrypt only with matching context', () => {
  const vek = Buffer.alloc(32, 11);
  const first = encryptSecret('synthetic secret value', vek, context);
  const second = encryptSecret('synthetic secret value', vek, context);
  assert.notEqual(first.nonce, second.nonce);
  assert.equal(decryptSecret(first, vek, context).toString('utf8'), 'synthetic secret value');
  assert.throws(() => decryptSecret(first, vek, { ...context, vaultId: 'other-vault' }));
  assert.throws(() => decryptSecret(first, vek, { ...context, itemId: 'other-item' }));
  assert.throws(() => decryptSecret(first, vek, { ...context, field: 'username' }));
  assert.throws(() => decryptSecret(first, vek, { ...context, revision: 2 }));
  assert.throws(() => decryptSecret(first, vek, { ...context, keyId: 'other-key' }));
  assert.throws(() => decryptSecret({ ...first, version: 2 } as never, vek, context));
  assert.throws(() => decryptSecret({ ...first, algorithm: 'AES-128-GCM' } as never, vek, context));
  zeroize(vek);
});

test('supported crypto version is accepted and a VEK-wrap purpose cannot decrypt as a secret', () => {
  const kek = Buffer.alloc(32, 14);
  const vek = Buffer.alloc(32, 15);
  const wrapped = wrapVek(vek, kek, wrapContext);
  assert.equal(wrapped.version, 1);
  assert.deepEqual(unwrapVek(wrapped, kek, wrapContext), vek);
  assert.throws(() => decryptSecret(wrapped as never, kek, context));
  zeroize(kek);
  zeroize(vek);
});

test('canonical AAD is deterministic, length-delimited, and context-bound', () => {
  const first = buildCanonicalAad(context);
  const second = buildCanonicalAad({ ...context });
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, buildCanonicalAad({ ...context, field: 'username' }));
  assert.notDeepEqual(first, buildCanonicalAad({ ...context, revision: 2 }));
  assert.notDeepEqual(first, buildCanonicalAad({ ...context, itemId: undefined }));
});

test('malformed envelopes fail closed', () => {
  const vek = Buffer.alloc(32, 12);
  const envelope = encryptSecret('synthetic', vek, context);
  const mutatedAad = Buffer.from(envelope.aad, 'base64url');
  mutatedAad[mutatedAad.length - 1] ^= 1;
  assert.throws(() => decryptSecret({ ...envelope, aad: mutatedAad.toString('base64url') }, vek, context));
  assert.throws(() => decryptSecret({ ...envelope, nonce: 'bad!' }, vek, context));
  assert.throws(() => decryptSecret({ ...envelope, tag: '' }, vek, context));
  assert.throws(() => decryptSecret({ ...envelope, aad: envelope.aad.slice(0, -1) }, vek, context));
  zeroize(vek);
});
