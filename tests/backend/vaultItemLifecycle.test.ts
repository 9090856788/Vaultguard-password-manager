import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { buildCanonicalAad, encryptSecret } from '../../src/crypto';
import { createVaultItemService } from '../../src/api/services/vaultItemService';
import { encryptedVaultRequired } from '../../src/api/middleware/vaultAvailability';

const ownerId = new Types.ObjectId().toString();
const otherOwnerId = new Types.ObjectId().toString();
const vaultId = new Types.ObjectId().toString();
const otherVaultId = new Types.ObjectId().toString();
const key = Buffer.alloc(32, 7);

function makeMetadata(title = 'Example') {
  return { title, tags: [], isFavorite: false, isPinned: false };
}

function makeEnvelope(itemId: string, revision: number, field = 'password') {
  return encryptSecret(`encrypted-${field}`, key, {
    vaultId,
    itemId,
    field,
    revision,
    keyId: 'key-1',
    cryptoVersion: 1,
  });
}

function makeSecrets(itemId: string, revision: number) {
  return { password: makeEnvelope(itemId, revision) };
}

function makeDependencies() {
  const items = new Map<string, any>();
  const verifiedVault = { _id: new Types.ObjectId(vaultId), ownerUserId: new Types.ObjectId(ownerId), migrationState: 'verified', currentKeyId: 'key-1' };
  const category = { _id: new Types.ObjectId(), vaultId: new Types.ObjectId(vaultId), ownerUserId: new Types.ObjectId(ownerId), deletedAt: undefined };
  const matches = (item: any, id: Types.ObjectId, parent: Types.ObjectId, owner: Types.ObjectId) => (
    item && item._id.equals(id) && item.vaultId.equals(parent) && item.ownerUserId.equals(owner)
  );
  const itemRepository = {
    prepareForOwner: async (id: Types.ObjectId, parent: Types.ObjectId, owner: Types.ObjectId, metadata: any) => {
      const now = new Date();
      const record = { _id: id, vaultId: parent, ownerUserId: owner, metadata, revision: 1, lifecycleState: 'preparing', createdAt: now, updatedAt: now };
      items.set(id.toString(), record);
      return record;
    },
    findByIdForOwner: async (id: Types.ObjectId, parent: Types.ObjectId, owner: Types.ObjectId) => {
      const item = items.get(id.toString());
      return item && item.deletedAt === undefined && matches(item, id, parent, owner) ? item : null;
    },
    findByIdForOwnerIncludingDeleted: async (id: Types.ObjectId, parent: Types.ObjectId, owner: Types.ObjectId) => {
      const item = items.get(id.toString());
      return matches(item, id, parent, owner) ? item : null;
    },
    listForOwner: async (parent: Types.ObjectId, owner: Types.ObjectId, options: any = {}) => [...items.values()].filter((item) => (
      matches(item, item._id, parent, owner) && item.lifecycleState === 'active'
        && (!options.categoryId || item.metadata.categoryId?.equals(options.categoryId))
        && (!options.favoriteOnly || item.metadata.isFavorite)
    )),
    finalizePreparedForOwnerWithCas: async (id: Types.ObjectId, parent: Types.ObjectId, owner: Types.ObjectId, expected: number, encryptedSecrets: any) => {
      const item = items.get(id.toString());
      if (!matches(item, id, parent, owner) || item.lifecycleState !== 'preparing' || item.revision !== expected) return null;
      item.encryptedSecrets = encryptedSecrets;
      item.lifecycleState = 'active';
      item.updatedAt = new Date(item.updatedAt.getTime() + 1);
      return item;
    },
    updateForOwnerWithRevision: async (id: Types.ObjectId, parent: Types.ObjectId, owner: Types.ObjectId, expected: number, update: any) => {
      const item = items.get(id.toString());
      if (!matches(item, id, parent, owner) || item.lifecycleState !== 'active' || item.revision !== expected) return null;
      Object.assign(item, update, { revision: expected + 1, updatedAt: new Date(item.updatedAt.getTime() + 1) });
      return item;
    },
    softDeleteForOwner: async (id: Types.ObjectId, parent: Types.ObjectId, owner: Types.ObjectId, expected: number) => {
      const item = items.get(id.toString());
      if (!matches(item, id, parent, owner) || item.lifecycleState !== 'active' || item.revision !== expected) return null;
      Object.assign(item, { lifecycleState: 'deleted', deletedAt: new Date(), revision: expected + 1, updatedAt: new Date(item.updatedAt.getTime() + 1) });
      return item;
    },
    restoreForOwner: async (id: Types.ObjectId, parent: Types.ObjectId, owner: Types.ObjectId, expected: number) => {
      const item = items.get(id.toString());
      if (!matches(item, id, parent, owner) || item.lifecycleState !== 'deleted' || item.revision !== expected) return null;
      Object.assign(item, { lifecycleState: 'active', deletedAt: undefined, revision: expected + 1, updatedAt: new Date(item.updatedAt.getTime() + 1) });
      return item;
    },
  };
  const vaultRepository = {
    findByIdForOwner: async (id: Types.ObjectId, owner: Types.ObjectId) => id.equals(verifiedVault._id) && owner.equals(verifiedVault.ownerUserId) ? verifiedVault : null,
  };
  const categoryRepository = {
    findByIdForOwner: async (id: Types.ObjectId, parent: Types.ObjectId, owner: Types.ObjectId) => id.equals(category._id) && parent.equals(category.vaultId) && owner.equals(category.ownerUserId) ? category : null,
  };
  return { items, itemRepository, vaultRepository, categoryRepository, category };
}

test('preparation allocates a server ID and persists metadata-only preparing state', async () => {
  const dependencies = makeDependencies();
  const service = createVaultItemService(dependencies as never);
  const prepared = await service.prepare(ownerId, vaultId, { metadata: makeMetadata() });
  const record = dependencies.items.get(prepared.itemId);
  assert.match(prepared.itemId, /^[a-f\d]{24}$/);
  assert.equal(prepared.revision, 1);
  assert.equal(prepared.lifecycleState, 'preparing');
  assert.equal(record.encryptedSecrets, undefined);
});

test('valid finalize binds the server ID and revision in G5.3 AAD', async () => {
  const dependencies = makeDependencies();
  const service = createVaultItemService(dependencies as never);
  const prepared = await service.prepare(ownerId, vaultId, { metadata: makeMetadata() });
  const secrets = makeSecrets(prepared.itemId, 1);
  const created = await service.finalize(ownerId, vaultId, 1, { itemId: prepared.itemId, encryptedSecrets: secrets });
  assert.equal(created.status, 201);
  assert.equal(created.item.lifecycleState, 'active');
  assert.deepEqual(created.item.encryptedSecrets, secrets);

  const replay = await service.finalize(ownerId, vaultId, 1, { itemId: prepared.itemId, encryptedSecrets: secrets });
  assert.equal(replay.status, 200);
  assert.equal(replay.replay, true);
});

test('arbitrary IDs, wrong owners, and wrong vaults cannot finalize', async () => {
  const dependencies = makeDependencies();
  const service = createVaultItemService(dependencies as never);
  const arbitrary = new Types.ObjectId().toString();
  await assert.rejects(service.finalize(ownerId, vaultId, 1, { itemId: arbitrary, encryptedSecrets: makeSecrets(arbitrary, 1) }), (error: { code?: string }) => error.code === 'VAULT_ITEM_PREPARATION_REQUIRED');

  const prepared = await service.prepare(ownerId, vaultId, { metadata: makeMetadata() });
  const secrets = makeSecrets(prepared.itemId, 1);
  await assert.rejects(service.finalize(otherOwnerId, vaultId, 1, { itemId: prepared.itemId, encryptedSecrets: secrets }), (error: { code?: string }) => error.code === 'VAULT_NOT_FOUND');
  await assert.rejects(service.finalize(ownerId, otherVaultId, 1, { itemId: prepared.itemId, encryptedSecrets: secrets }), (error: { code?: string }) => error.code === 'VAULT_NOT_FOUND');
});

test('tampered or context-swapped envelopes are rejected without persistence', async () => {
  const dependencies = makeDependencies();
  const service = createVaultItemService(dependencies as never);
  const prepared = await service.prepare(ownerId, vaultId, { metadata: makeMetadata() });
  const envelope = makeEnvelope(prepared.itemId, 1);
  await assert.rejects(service.finalize(ownerId, vaultId, 1, {
    itemId: prepared.itemId,
    encryptedSecrets: { password: { ...envelope, aad: Buffer.from('tampered').toString('base64url') } },
  }), (error: { code?: string }) => error.code === 'VAULT_ITEM_INVALID_REQUEST');
  const wrongKeyEnvelope = encryptSecret('encrypted-password', key, {
    vaultId,
    itemId: prepared.itemId,
    field: 'password',
    revision: 1,
    keyId: 'key-2',
    cryptoVersion: 1,
  });
  await assert.rejects(service.finalize(ownerId, vaultId, 1, {
    itemId: prepared.itemId,
    encryptedSecrets: { password: wrongKeyEnvelope },
  }), (error: { code?: string }) => error.code === 'VAULT_ITEM_INVALID_REQUEST');
  assert.equal(dependencies.items.get(prepared.itemId).lifecycleState, 'preparing');
});

test('rejects wrong vault, item, field, revision, version, malformed, and oversized envelopes', async () => {
  const dependencies = makeDependencies();
  const service = createVaultItemService(dependencies as never);
  const prepared = await service.prepare(ownerId, vaultId, { metadata: makeMetadata() });
  const valid = makeEnvelope(prepared.itemId, 1);
  const wrongVault = encryptSecret('encrypted-password', key, {
    vaultId: otherVaultId,
    itemId: prepared.itemId,
    field: 'password',
    revision: 1,
    keyId: 'key-1',
    cryptoVersion: 1,
  });
  const wrongItem = encryptSecret('encrypted-password', key, {
    vaultId,
    itemId: new Types.ObjectId().toString(),
    field: 'password',
    revision: 1,
    keyId: 'key-1',
    cryptoVersion: 1,
  });
  const wrongField = makeEnvelope(prepared.itemId, 1, 'username');
  const wrongRevision = makeEnvelope(prepared.itemId, 2);
  const oversized = { ...valid, ciphertext: Buffer.alloc(1_000_001, 1).toString('base64url') };
  const cases = [
    wrongVault,
    wrongItem,
    wrongField,
    wrongRevision,
    { ...valid, version: 2 },
    { ...valid, nonce: 'malformed' },
    oversized,
  ];

  for (const envelope of cases) {
    await assert.rejects(service.finalize(ownerId, vaultId, 1, {
      itemId: prepared.itemId,
      encryptedSecrets: { password: envelope },
    }), (error: { code?: string }) => error.code === 'VAULT_ITEM_INVALID_REQUEST');
  }
  assert.equal(dependencies.items.get(prepared.itemId).lifecycleState, 'preparing');
});

test('strict validation rejects plaintext and unknown VaultItem fields without echoing values', async () => {
  const rejected = [
    ['password', 'plain-password'],
    ['username', 'plain-username'],
    ['notes', 'plain-notes'],
    ['totp', 'plain-totp'],
    ['recoveryCodes', 'plain-recovery'],
    ['masterPassword', 'master-password'],
    ['kek', 'raw-kek'],
    ['vek', 'raw-vek'],
    ['arbitrary', 'unknown-value'],
  ] as const;
  for (const [field, value] of rejected) {
    const dependencies = makeDependencies();
    const service = createVaultItemService(dependencies as never);
    await assert.rejects(service.prepare(ownerId, vaultId, { metadata: { ...makeMetadata(), [field]: value } }), (error: { code?: string; message?: string }) => {
      assert.equal(error.code, 'VAULT_ITEM_INVALID_REQUEST');
      assert.equal(error.message?.includes(value), false);
      return true;
    });
  }
});

test('updates use revision CAS and authenticate the resulting revision', async () => {
  const dependencies = makeDependencies();
  const service = createVaultItemService(dependencies as never);
  const prepared = await service.prepare(ownerId, vaultId, { metadata: makeMetadata() });
  await service.finalize(ownerId, vaultId, 1, { itemId: prepared.itemId, encryptedSecrets: makeSecrets(prepared.itemId, 1) });
  const updated = await service.update(ownerId, vaultId, prepared.itemId, 1, {
    metadata: { title: 'Updated' },
    encryptedSecrets: makeSecrets(prepared.itemId, 2),
  });
  assert.equal(updated.item.revision, 2);
  assert.equal(updated.item.metadata.title, 'Updated');
  await assert.rejects(service.update(ownerId, vaultId, prepared.itemId, 1, { metadata: { title: 'Stale' } }), (error: { code?: string }) => error.code === 'VAULT_ITEM_VERSION_CONFLICT');
});

test('category references are restricted to the same owner and vault', async () => {
  const dependencies = makeDependencies();
  const service = createVaultItemService(dependencies as never);
  await assert.rejects(service.prepare(ownerId, vaultId, { metadata: { ...makeMetadata(), categoryId: new Types.ObjectId().toString() } }), (error: { code?: string }) => error.code === 'VAULT_ITEM_CATEGORY_INVALID');
});

test('delete and owner-scoped restore use CAS without rewriting encrypted secrets', async () => {
  const dependencies = makeDependencies();
  const service = createVaultItemService(dependencies as never);
  const prepared = await service.prepare(ownerId, vaultId, { metadata: makeMetadata() });
  const secrets = makeSecrets(prepared.itemId, 1);
  await service.finalize(ownerId, vaultId, 1, { itemId: prepared.itemId, encryptedSecrets: secrets });
  const deleted = await service.remove(ownerId, vaultId, prepared.itemId, 1);
  assert.equal(deleted.item.lifecycleState, 'deleted');
  assert.deepEqual(deleted.item.encryptedSecrets, secrets);
  await assert.rejects(service.get(ownerId, vaultId, prepared.itemId), (error: { code?: string }) => error.code === 'VAULT_ITEM_NOT_FOUND');
  const restored = await service.restore(ownerId, vaultId, prepared.itemId, 2);
  assert.equal(restored.item.lifecycleState, 'active');
  assert.equal(restored.item.revision, 3);
  assert.deepEqual(restored.item.encryptedSecrets, secrets);
});

test('legacy vault routes retain the VAULT_ENCRYPTION_NOT_READY 503 boundary', () => {
  let received: { statusCode?: number; code?: string } | undefined;
  encryptedVaultRequired({} as never, {} as never, ((error?: { statusCode?: number; code?: string }) => { received = error; }) as never);
  assert.equal(received?.statusCode, 503);
  assert.equal(received?.code, 'VAULT_ENCRYPTION_NOT_READY');
});
