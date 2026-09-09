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
  metadata: {
    title: string,
    websiteUrl?: string,
    categoryId?: ObjectId,
    tags: string[],
    colorLabel?: string,
    websiteLogo?: string,
    isFavorite: boolean,
    isPinned: boolean
  },
  encryptedSecrets: {
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

`encryptedSecrets` contains username, email, password, secure notes, TOTP
secrets, recovery material, and secret-bearing custom fields. The searchable
server metadata is intentionally limited to fields needed for listing and
authorization. Secret search, password strength, reuse analysis, and
decryption occur client-side after the vault is unlocked.

There is no unique `{ host, vaultId }` index. Multiple credentials for one
host are valid. Revision updates are optimistic-concurrency checked and must
not overwrite a newer revision. Version history is either encrypted inside a
versioned item envelope or stored as separately encrypted history records in
a later approved change; it must never be plaintext.

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
