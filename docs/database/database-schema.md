# G4 Database Schema

**Gate:** G4 - Database Architecture + JSON-to-Mongo Migration Planning
**Status:** Implementation-ready target; no collections created by this document
**Security authority:** `docs/security/g3-authoritative-baseline.md`

This document defines seven MongoDB collections accessed through Mongoose. It
does not authorize application implementation or a production migration.

## Design Rules

- MongoDB `_id` is the stable server identifier. A legacy ID may be retained
  as `legacyId` during migration, but it is not an authorization credential.
- Every resource is scoped through the authenticated server identity and its
  parent relationship.
- Secret-bearing vault data is stored only as authenticated encrypted
  envelopes. Plaintext password, note, TOTP, recovery, and custom secret
  fields are never target fields.
- Account plaintext passwords, vault master passwords, KEKs, VEKs, raw
  refresh tokens, and raw recovery codes are never stored.
- All timestamps are BSON `Date` values in UTC. API serialization uses ISO
  8601 strings.
- Soft deletion and revision state are explicit. Physical deletion is an
  operational process, not an automatic claim of cryptographic erasure.

## 1. users

Purpose: account identity, authentication verifier, account security state, and
non-secret preferences.

```ts
{
  _id: ObjectId,
  legacyId?: string,
  email: string,                 // normalized lowercase, required, unique
  fullName: string,              // required, bounded length
  avatarUrl?: string,            // URL or approved asset reference
  accountPasswordVerifier: string, // select: false
  verifier: {
    algorithm: "argon2id" | "bcrypt-legacy",
    version: number,
    memoryKiB?: number,
    timeCost?: number,
    parallelism?: number,
    outputBytes?: number,
    upgradedAt?: Date
  },
  accountSecurityVersion: number,
  twoFactor: {
    enabled: boolean,
    method?: "totp",
    secretEnvelope?: EncryptedSecretEnvelope,
    enrolledAt?: Date,
    lastVerifiedAt?: Date,
    disabledAt?: Date
  },
  recoveryCodes: {
    hashes: string[],
    generatedAt?: Date,
    remainingCount: number,
    version: number
  },
  lockout: {
    failedAttempts: number,
    lockedUntil?: Date,
    lastFailureAt?: Date,
    progressiveDelayUntil?: Date
  },
  preferences: {
    autoLockMinutes: number,
    clipboardClearSeconds: number,
    theme?: "dark" | "light",
    language?: string
  },
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt?: Date,
  lastPasswordChangeAt?: Date,
  deletedAt?: Date
}
```

`accountPasswordVerifier` is selected out by default. The verifier is upgraded
after a successful login using an explicit algorithm/version check and an
atomic user update. A bcrypt legacy verifier is accepted only for migration
compatibility and is replaced by Argon2id after successful verification. A
Mongoose pre-save hook must not hash an already encoded verifier twice.

The current JSON `passwordHash` maps to the account verifier only. It does not
become a vault master password verifier and it does not unlock vault content.

## 2. vaults

Purpose: a user-owned encrypted vault and its key metadata.

```ts
{
  _id: ObjectId,
  legacyId?: string,
  ownerUserId: ObjectId,          // required, immutable
  name: string,
  wrappedVekEnvelope?: {
    version: number,
    keyId: string,
    algorithm: "AES-256-GCM",
    nonce: string,                // encoded bytes, 12 random bytes
    ciphertext: string,
    tag: string,
    aad: string
  },
  kdf?: {
    algorithm: "Argon2id",
    version: number,
    salt: string,                 // random per-vault salt
    memoryKiB: number,
    timeCost: number,
    parallelism: number,
    outputBytes: 32,
    purpose: "vault-kek"
  },
  currentKeyId?: string,
  encryptionFormatVersion?: number,
  migrationState: "legacy-quarantined" | "awaiting-owner" | "encrypting" | "preparing" | "verified" | "blocked",
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date
}
```

During G5.4.1 vault preparation, `migrationState` is `preparing` and the
wrapped VEK envelope, KDF metadata, current key ID, and encryption format
version are intentionally absent until the owner completes client-side key
initialization. Those cryptographic fields are required for every state after
preparation. The `purpose` value is fixed to `vault-kek` and is not
caller-configurable.

The server stores the wrapped VEK envelope and KDF metadata, never the
plaintext KEK, VEK, or Vault Master Password. The owner relationship is
`users._id -> vaults.ownerUserId`. A user may have multiple vaults; the target
does not infer a default vault from client input.

## 3. vaultItems

Purpose: one credential record with server-visible metadata and encrypted
secret data.

```ts
{
  _id: ObjectId,
  legacyId?: string,
  vaultId: ObjectId,
  ownerUserId: ObjectId,          // denormalized authorization guard
  lifecycleState: "preparing" | "active" | "deleted",
  metadata: {
    title: string,
    websiteUrl?: string,
    categoryId?: ObjectId,
    tags: string[],
    colorLabel?: string,
    websiteLogo?: string,         // bounded public metadata
    isFavorite: boolean,
    isPinned: boolean
  },
  encryptedSecrets?: {
    version: number,
    keyId: string,
    algorithm: "AES-256-GCM",
    nonce: string,
    ciphertext: string,
    tag: string,
    aad: string
  },
  revision: number,
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date
}
```

`lifecycleState` is persisted so that item preparation and finalization are
explicit server-side state transitions. A newly prepared item is `preparing`
and has a server-issued MongoDB `_id` before the client constructs the
canonical G5.3 AAD and encrypts its secret payload. `encryptedSecrets` is
conditionally absent while an item is `preparing`; it is required before an
item can become `active`. A `deleted` item is soft-deleted and remains subject
to the approved retention and explicit permanent-delete policy.

The client owns Vault Master Password handling, KEK derivation, VEK unwrap,
secret encryption, and secret decryption. The server never receives the Vault
Master Password, plaintext KEK, plaintext VEK, or plaintext vault secrets. The
server persists only the encrypted secret envelope and its non-secret
metadata. The envelope uses AES-256-GCM and the G5.3 canonical AAD binding
purpose, vault ID, item ID, field scope, revision, key ID, and format version.
Unknown or unsupported envelope versions fail closed.

The accepted metadata fields are exactly `title`, `websiteUrl`, `categoryId`,
`tags`, `colorLabel`, `websiteLogo`, `isFavorite`, and `isPinned`, subject to
bounded validation. `websiteLogo` is retained only as bounded public metadata
and is never a secret-bearing field. Secret-bearing fields are represented only
inside the encrypted envelope; plaintext password, notes, TOTP, recovery, or
custom secret fields are not target schema fields.

Item ownership is enforced using the authenticated owner, the parent vault,
and the denormalized `ownerUserId`. Item creation, finalization, update,
soft-delete, and restore are owner-scoped. Concurrent encrypted updates use
revision-based compare-and-set; stale `If-Match` values are conflicts and
must not be resolved with last-write-wins behavior. Restore is an explicit
owner-scoped CAS operation from `deleted` to `active`.

There is no unique `{ host, vaultId }` index. Multiple credentials for one
host are valid. Secret search, password strength, reuse analysis, and
decryption occur client-side after verified vault unlock. Version history is
not introduced by G5.4.2; if a later implementation requires a separate
encrypted history collection, that architecture change requires explicit
approval and must never create plaintext history.

## 4. categories

Purpose: user-visible organization within one vault.

```ts
{
  _id: ObjectId,
  legacyId?: string,
  vaultId: ObjectId,
  ownerUserId: ObjectId,
  normalizedName: string,
  displayName: string,
  iconName?: string,
  color?: string,
  isSystem: boolean,
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date
}
```

Category names are unique within a vault among active categories using a
unique compound index on `{ vaultId, normalizedName, deletedAt }` only if the
implementation uses a partial unique index for `deletedAt: null`. A deleted
name may be reused after the product explicitly defines that behavior.

## 5. sessions

Purpose: server-side refresh session state.

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  familyId: string,
  tokenHash: string,              // hash only, never raw token
  parentSessionId?: ObjectId,
  replacedBySessionId?: ObjectId,
  state: "current" | "used" | "revoked" | "reuse-detected",
  createdAt: Date,
  expiresAt: Date,
  usedAt?: Date,
  revokedAt?: Date,
  revocationReason?: string,
  reuseDetectedAt?: Date,
  device: { userAgent?: string, name?: string },
  network: { ipPrefix?: string }
}
```

The refresh endpoint hashes the presented token, atomically changes the
current session to `used`, creates its replacement, and sets the replacement
cookie. A failed compare-and-set indicates replay; the complete `familyId` is
revoked. A TTL index on `expiresAt` is cleanup only and is not the sole
expiration check.

## 6. activities

Purpose: safe, user-facing product timeline.

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  vaultId?: ObjectId,
  itemId?: ObjectId,
  action: string,
  safeLabel: string,
  createdAt: Date,
  expiresAt?: Date
}
```

Activity fields may contain titles or resource IDs only after a sensitive-data
review. They must not contain passwords, notes, tokens, keys, recovery codes,
raw imports, or security-sensitive payloads. Product activity is not the
security audit trail.

## 7. auditEvents

Purpose: append-oriented security and operational evidence.

```ts
{
  _id: ObjectId,
  eventVersion: number,
  type: string,
  actor: { userId?: ObjectId, kind: "user" | "system" | "admin" },
  resource: { type?: string, id?: ObjectId, vaultId?: ObjectId },
  outcome: "success" | "failure" | "blocked",
  requestId?: string,
  device: { userAgent?: string },
  network: { ipPrefix?: string },
  reasonCode?: string,
  createdAt: Date,
  expiresAt?: Date
}
```

Supported types include login success/failure, logout, session creation and
revocation, refresh reuse, lockout, account password change, vault master
password change, 2FA enrollment/verification/disable, recovery-code use,
import/export, key rotation, tamper detection, and administrative security
events. Audit records are access-controlled and retained according to the
approved operational policy.

## Shared Envelope Type

All encrypted envelopes must carry version, key ID, algorithm, fresh random
96-bit nonce, ciphertext, authentication tag, and canonical AAD. AAD binds
the purpose, vault ID, item ID where applicable, field scope, and revision.
Unknown versions fail closed. No schema field may be named `password` or
`notes` in a final secret-bearing target record.

## G5.4.2 VaultItem Lifecycle Contract

The approved G5.4.2 contract extends the G4 target without adding a new
preparation collection:

1. **Prepare:** server authenticates the owner, validates the exact metadata
   allowlist, allocates and persists the MongoDB item `_id`, and creates a
   `preparing` item. No plaintext secret is accepted or persisted.
2. **Client encryption:** the browser/client derives or unwraps keys locally,
   constructs G5.3 canonical AAD using the server-issued item ID, and encrypts
   the secret payload with AES-256-GCM.
3. **Finalize:** the server accepts only the approved encrypted envelope,
   verifies envelope metadata/AAD bindings and ownership, and atomically
   transitions `preparing -> active` using the expected revision.
4. **Update:** active encrypted data is replaced only through owner-scoped
   revision CAS. A stale `If-Match` is a conflict; last-write-wins is not
   permitted.
5. **Delete/restore:** soft delete and restore are owner-scoped CAS operations
   with explicit lifecycle transitions. Physical deletion remains an
   operational process and is not a cryptographic-erasure claim.

The exact request field allowlists are part of the G5.4.2 API contract. Unknown
fields and sensitive plaintext-looking fields must fail closed without being
logged or echoed. A separate encrypted history collection is future scope only
and is not authorized by G5.4.2.
