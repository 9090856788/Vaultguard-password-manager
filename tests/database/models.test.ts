import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { ActivityModel } from '../../src/api/models/Activity';
import { AuditEventModel } from '../../src/api/models/AuditEvent';
import { CategoryModel } from '../../src/api/models/Category';
import { SessionModel } from '../../src/api/models/Session';
import { UserModel } from '../../src/api/models/User';
import { VaultItemModel } from '../../src/api/models/VaultItem';
import { VaultModel } from '../../src/api/models/Vault';
import { ownerVaultItemScope, ownerVaultScope } from '../../src/api/repositories/scopes';

const userId = new Types.ObjectId();
const vaultId = new Types.ObjectId();
const itemId = new Types.ObjectId();
const envelope = {
  version: 1,
  keyId: 'key-1',
  algorithm: 'AES-256-GCM' as const,
  nonce: 'nonce',
  ciphertext: 'ciphertext',
  tag: 'tag',
  aad: 'aad',
};

test('user model requires bounded identity and verifier fields', async () => {
  const user = new UserModel({ email: 'user@example.com', fullName: 'User', accountPasswordVerifier: 'encoded', verifier: { algorithm: 'argon2id', version: 1 } });
  await assert.doesNotReject(user.validate());

  const invalid = new UserModel({ email: 'not-an-email', fullName: '', accountPasswordVerifier: 'encoded', verifier: { algorithm: 'unsupported', version: 1 } });
  await assert.rejects(invalid.validate());
});

test('vault and vault item reject plaintext secret fields', async () => {
  const vault = new VaultModel({
    ownerUserId: userId,
    name: 'Personal',
    wrappedVekEnvelope: envelope,
    kdf: { algorithm: 'Argon2id', version: 1, salt: 'salt', memoryKiB: 65536, timeCost: 3, parallelism: 1, outputBytes: 32, purpose: 'vault-kek' },
    currentKeyId: 'key-1',
    encryptionFormatVersion: 1,
    migrationState: 'awaiting-owner',
  });
  await assert.doesNotReject(vault.validate());

  assert.throws(() => new VaultItemModel({
    vaultId,
    ownerUserId: userId,
    metadata: { title: 'Example', tags: [], isFavorite: false, isPinned: false },
    encryptedSecrets: { password: envelope },
    lifecycleState: 'active',
    password: 'must-not-be-persisted',
  }));

  const tooManyTags = new VaultItemModel({
    vaultId,
    ownerUserId: userId,
    metadata: { title: 'Example', tags: Array.from({ length: 51 }, (_, index) => `tag-${index}`), isFavorite: false, isPinned: false },
    encryptedSecrets: { password: envelope },
    lifecycleState: 'active',
  });
  await assert.rejects(tooManyTags.validate());
});

test('preparing vault items may omit encrypted secrets, while active items require them', async () => {
  const preparing = new VaultItemModel({
    vaultId,
    ownerUserId: userId,
    metadata: { title: 'Preparing', tags: [], isFavorite: false, isPinned: false },
    lifecycleState: 'preparing',
    revision: 1,
  });
  await assert.doesNotReject(preparing.validate());

  const active = new VaultItemModel({
    vaultId,
    ownerUserId: userId,
    metadata: { title: 'Active', tags: [], isFavorite: false, isPinned: false },
    lifecycleState: 'active',
    revision: 1,
  });
  await assert.rejects(active.validate());
});

test('preparing vaults may omit cryptographic material, but verified vaults may not', async () => {
  const preparing = new VaultModel({ ownerUserId: userId, name: 'Preparing', migrationState: 'preparing' });
  await assert.doesNotReject(preparing.validate());

  const verified = new VaultModel({ ownerUserId: userId, name: 'Missing crypto', migrationState: 'verified' });
  await assert.rejects(verified.validate());
});

test('KDF metadata accepts only the approved versioned baseline', async () => {
  const invalidValues = [
    { memoryKiB: 1, timeCost: 3, parallelism: 1 },
    { memoryKiB: 65536, timeCost: 1, parallelism: 1 },
    { memoryKiB: 65536, timeCost: 3, parallelism: 2 },
  ];

  for (const kdf of invalidValues) {
    const vault = new VaultModel({
      ownerUserId: userId,
      name: 'Invalid KDF',
      wrappedVekEnvelope: envelope,
      kdf: { algorithm: 'Argon2id', version: 1, salt: 'salt', ...kdf, outputBytes: 32, purpose: 'vault-kek' },
      currentKeyId: 'key-1',
      encryptionFormatVersion: 1,
      migrationState: 'awaiting-owner',
    });
    await assert.rejects(vault.validate());
  }
});

test('approved indexes exist without a host/vault uniqueness index', () => {
  assert.deepEqual(VaultModel.schema.indexes(), [
    [{ ownerUserId: 1, deletedAt: 1 }, {}],
    [{ ownerUserId: 1, _id: 1 }, {}],
  ]);

  const itemIndexes = VaultItemModel.schema.indexes();
  assert.ok(itemIndexes.some(([fields]) => fields.vaultId === 1 && fields.deletedAt === 1 && fields.updatedAt === -1));
  assert.ok(itemIndexes.some(([fields]) => fields.ownerUserId === 1 && fields.vaultId === 1 && fields._id === 1));
  assert.equal(itemIndexes.some(([fields]) => fields.host === 1 && fields.vaultId === 1), false);

  const sessionIndexes = SessionModel.schema.indexes();
  assert.ok(sessionIndexes.some(([fields, options]) => fields.tokenHash === 1 && options?.unique === true));
  assert.ok(sessionIndexes.some(([fields, options]) => fields.expiresAt === 1 && options?.expireAfterSeconds === 0));
  assert.equal(UserModel.schema.path('accountPasswordVerifier').options.select, false);
  assert.equal(UserModel.schema.path('twoFactor.secretEnvelope').options.select, false);
  assert.equal(SessionModel.schema.path('tokenHash').options.select, false);
});

test('repository scope builders require the authenticated owner and parent vault', () => {
  assert.deepEqual(ownerVaultItemScope(userId, vaultId, itemId), { _id: itemId, ownerUserId: userId, vaultId, deletedAt: null });
  assert.deepEqual(ownerVaultScope(userId, vaultId), { ownerUserId: userId, vaultId, deletedAt: null });
});

test('category uniqueness is active-record scoped and audit/activity schemas are bounded', () => {
  const categoryIndexes = CategoryModel.schema.indexes();
  const uniqueCategory = categoryIndexes.find(([fields]) => fields.vaultId === 1 && fields.normalizedName === 1);
  assert.equal(uniqueCategory?.[1]?.unique, true);
  assert.deepEqual(uniqueCategory?.[1]?.partialFilterExpression, { deletedAt: null });

  assert.equal(AuditEventModel.schema.path('outcome').options.enum?.includes('blocked'), true);
  assert.equal(AuditEventModel.schema.path('eventVersion').options.min, 1);

  assert.ok(ActivityModel.schema.indexes().some(([fields, options]) => (
    fields.expiresAt === 1 && options?.expireAfterSeconds === 0
  )));
});

test('session state enum and vault migration state are constrained', async () => {
  const session = new SessionModel({ userId, familyId: 'family', tokenHash: 'hash', expiresAt: new Date(Date.now() + 60_000), state: 'invalid' });
  await assert.rejects(session.validate());

  const invalidVault = new VaultModel({
    ownerUserId: userId,
    name: 'Personal',
    wrappedVekEnvelope: envelope,
    kdf: { algorithm: 'Argon2id', version: 1, salt: 'salt', memoryKiB: 65536, timeCost: 3, parallelism: 1, outputBytes: 32, purpose: 'vault-kek' },
    currentKeyId: 'key-1',
    encryptionFormatVersion: 1,
    migrationState: 'plaintext-ready',
  });
  await assert.rejects(invalidVault.validate());
});
