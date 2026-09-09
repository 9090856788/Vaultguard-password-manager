import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { buildCanonicalAad } from '../../src/crypto';
import { createTransientVaultKeyManager } from '../../src/services/vaultCryptoLifecycle';
import { createVaultLifecycleService } from '../../src/api/services/vaultLifecycleService';
import { encryptedVaultRequired } from '../../src/api/middleware/vaultAvailability';

const ownerId = new Types.ObjectId().toString();
const otherOwnerId = new Types.ObjectId().toString();

function makeEnvelope(vaultId: string, keyId = 'key-1') {
  return {
    version: 1 as const,
    keyId,
    algorithm: 'AES-256-GCM' as const,
    nonce: Buffer.alloc(12, 1).toString('base64url'),
    ciphertext: Buffer.alloc(32, 2).toString('base64url'),
    tag: Buffer.alloc(16, 3).toString('base64url'),
    aad: buildCanonicalAad({ purpose: 'vek-wrap', vaultId, field: 'vek', revision: 1, keyId, cryptoVersion: 1 }).toString('base64url'),
  };
}

function makeInput(vaultId: string, name = 'Personal') {
  return {
    name,
    wrappedVekEnvelope: makeEnvelope(vaultId),
    kdf: {
      algorithm: 'Argon2id' as const,
      version: 1 as const,
      salt: Buffer.alloc(16, 4).toString('base64url'),
      memoryKiB: 65536 as const,
      timeCost: 3 as const,
      parallelism: 1 as const,
      outputBytes: 32 as const,
      purpose: 'vault-kek' as const,
    },
    currentKeyId: 'key-1',
    encryptionFormatVersion: 1 as const,
  };
}

function makeVaultRepository() {
  const records = new Map<string, any>();
  return {
    records,
    listForOwner: async (owner: Types.ObjectId) => [...records.values()].filter((vault) => vault.ownerUserId.equals(owner)),
    findByIdForOwner: async (vaultId: Types.ObjectId, owner: Types.ObjectId) => {
      const vault = records.get(vaultId.toString());
      return vault && vault.ownerUserId.equals(owner) ? vault : null;
    },
    findKeyMaterialForOwner: async (vaultId: Types.ObjectId, owner: Types.ObjectId) => {
      const vault = records.get(vaultId.toString());
      return vault && vault.ownerUserId.equals(owner) ? vault : null;
    },
    prepareForOwner: async (vaultId: Types.ObjectId, owner: Types.ObjectId, name: string) => {
      const now = new Date();
      const record = { _id: vaultId, ownerUserId: owner, name, migrationState: 'preparing', createdAt: now, updatedAt: now };
      records.set(vaultId.toString(), record);
      return record;
    },
    finalizePreparedForOwner: async (vaultId: Types.ObjectId, owner: Types.ObjectId, expected: Date, update: any) => {
      const record = records.get(vaultId.toString());
      if (!record || !record.ownerUserId.equals(owner) || record.migrationState !== 'preparing' || record.updatedAt.getTime() !== expected.getTime()) return null;
      Object.assign(record, update, { migrationState: 'verified', updatedAt: new Date(record.updatedAt.getTime() + 1) });
      return record;
    },
    updateNameForOwner: async (vaultId: Types.ObjectId, owner: Types.ObjectId, expected: Date, name: string) => {
      const vault = records.get(vaultId.toString());
      if (!vault || !vault.ownerUserId.equals(owner) || vault.updatedAt.getTime() !== expected.getTime()) return null;
      vault.name = name;
      vault.updatedAt = new Date(vault.updatedAt.getTime() + 1);
      return vault;
    },
  };
}

test('vault preparation returns and persists a server-issued ObjectId lifecycle', async () => {
  const repository = makeVaultRepository();
  const service = createVaultLifecycleService(repository as never);
  const prepared = await service.prepare(ownerId, { name: 'Personal' });
  assert.match(prepared.vaultId, /^[a-f\d]{24}$/);
  assert.equal(repository.records.size, 1);
  assert.equal(repository.records.get(prepared.vaultId).migrationState, 'preparing');
  assert.equal(repository.records.get(prepared.vaultId).wrappedVekEnvelope, undefined);
  assert.equal(prepared.contractVersion, 1);
});

test('prepare rejects sensitive and unknown fields without echoing submitted values', async () => {
  const rejected = [
    ['masterPassword', 'master-secret'],
    ['password', 'password-secret'],
    ['vaultMasterPassword', 'vault-password-secret'],
    ['kek', 'kek-secret'],
    ['vek', 'vek-secret'],
    ['plaintext', 'plaintext-secret'],
    ['secret', 'secret-value'],
    ['encryptedSecrets', 'encrypted-secrets-value'],
    ['arbitraryUnknownField', 'unknown-value'],
  ] as const;

  for (const [field, value] of rejected) {
    const repository = makeVaultRepository();
    const service = createVaultLifecycleService(repository as never);

    await assert.rejects(
      service.prepare(ownerId, { name: 'Personal', [field]: value }),
      (error: { code?: string; message?: string }) => {
        assert.equal(error.code, 'VAULT_VALIDATION_ERROR');
        assert.equal(error.message?.includes(value), false);
        return true;
      },
    );
    assert.equal(repository.records.size, 0);
  }
});

test('valid prepare then finalize persists wrapped VEK metadata and supports matching replay', async () => {
  const repository = makeVaultRepository();
  const service = createVaultLifecycleService(repository as never);
  const prepared = await service.prepare(ownerId, { name: 'Personal' });
  const vaultId = prepared.vaultId;
  const input = makeInput(vaultId);

  const created = await service.finalize(ownerId, vaultId, prepared.updatedAt, input);
  assert.equal(created.status, 201);
  assert.equal(created.item.migrationState, 'verified');
  assert.equal(repository.records.size, 1);
  assert.equal('password' in repository.records.get(vaultId), false);
  assert.equal('vek' in repository.records.get(vaultId), false);

  const replay = await service.finalize(ownerId, vaultId, prepared.updatedAt, input);
  assert.equal(replay.status, 200);
  assert.equal(replay.replay, true);
});

test('arbitrary or unprepared IDs and wrong owners cannot finalize', async () => {
  const repository = makeVaultRepository();
  const service = createVaultLifecycleService(repository as never);
  const arbitraryId = new Types.ObjectId().toString();
  await assert.rejects(service.finalize(ownerId, arbitraryId, new Date(), makeInput(arbitraryId)), (error: { code?: string }) => error.code === 'VAULT_PREPARATION_REQUIRED');

  const prepared = await service.prepare(ownerId, { name: 'Personal' });
  const input = makeInput(prepared.vaultId);
  await assert.rejects(service.finalize(otherOwnerId, prepared.vaultId, prepared.updatedAt, input), (error: { statusCode?: number }) => error.statusCode === 404);
  await assert.rejects(service.finalize(ownerId, new Types.ObjectId().toString(), new Date(), input), (error: { statusCode?: number }) => error.statusCode === 404);
});

test('finalize rejects tampered AAD, unsupported KDF, and divergent replay', async () => {
  const repository = makeVaultRepository();
  const service = createVaultLifecycleService(repository as never);
  const prepared = await service.prepare(ownerId, { name: 'Personal' });
  const vaultId = prepared.vaultId;
  const input = makeInput(vaultId);

  await assert.rejects(service.finalize(ownerId, vaultId, prepared.updatedAt, {
    ...input,
    wrappedVekEnvelope: { ...input.wrappedVekEnvelope, aad: Buffer.alloc(16, 9).toString('base64url') },
  }), (error: { code?: string }) => error.code === 'VAULT_VALIDATION_ERROR');
  await assert.rejects(service.finalize(ownerId, vaultId, prepared.updatedAt, {
    ...input,
    kdf: { ...input.kdf, parallelism: 2 },
  }), (error: { code?: string }) => error.code === 'VAULT_VALIDATION_ERROR');

  await service.finalize(ownerId, vaultId, prepared.updatedAt, input);
  await assert.rejects(service.finalize(ownerId, vaultId, prepared.updatedAt, { ...input, name: 'Other' }), (error: { code?: string }) => error.code === 'VAULT_CREATION_CONFLICT');
});

test('vault key material is owner-scoped and metadata updates use compare-and-set', async () => {
  const repository = makeVaultRepository();
  const service = createVaultLifecycleService(repository as never);
  const prepared = await service.prepare(ownerId, { name: 'Personal' });
  const vaultId = prepared.vaultId;
  await service.finalize(ownerId, vaultId, prepared.updatedAt, makeInput(vaultId));

  await assert.rejects(service.getKeyMaterial(otherOwnerId, vaultId), (error: { statusCode?: number }) => error.statusCode === 404);
  const record = repository.records.get(vaultId);
  const updated = await service.updateMetadata(ownerId, vaultId, record.updatedAt, { name: 'Work' });
  assert.equal(updated.item.name, 'Work');
  await assert.rejects(service.updateMetadata(ownerId, vaultId, new Date(0), { name: 'Stale' }), (error: { statusCode?: number }) => error.statusCode === 412);
});

test('legacy vault operations retain the encryption-not-ready boundary', () => {
  let received: { statusCode?: number; code?: string } | undefined;
  encryptedVaultRequired({} as never, {} as never, ((error?: { statusCode?: number; code?: string }) => {
    received = error;
  }) as never);
  assert.equal(received?.statusCode, 503);
  assert.equal(received?.code, 'VAULT_ENCRYPTION_NOT_READY');
});

test('transient key manager unwraps only in memory and clears keys on lock or failure', async () => {
  const zeroized: Uint8Array[] = [];
  const manager = createTransientVaultKeyManager({
    deriveKek: async () => new Uint8Array(32).fill(1),
    unwrapVek: async () => new Uint8Array(32).fill(2),
    zeroize: (value) => { value.fill(0); zeroized.push(value); },
  });
  const material = {
    vaultId: new Types.ObjectId().toString(),
    wrappedVekEnvelope: makeEnvelope(new Types.ObjectId().toString()),
    kdf: makeInput(new Types.ObjectId().toString()).kdf,
    currentKeyId: 'key-1',
    encryptionFormatVersion: 1,
  };

  await manager.unlock('synthetic-test-password', material);
  assert.equal(manager.getState(), 'unlocked');
  assert.equal(manager.getVek()?.byteLength, 32);
  manager.lock();
  assert.equal(manager.getState(), 'locked');
  assert.equal(manager.getVek(), undefined);
  assert.equal(zeroized.length, 2);
});
