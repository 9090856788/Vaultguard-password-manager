# G4 Data Integrity and Authorization Rules

**Gate:** G4 - Database Architecture + JSON-to-Mongo Migration Planning

## Invariants

1. Every vault has exactly one active owner user.
2. Every active vault item references an existing active vault and the same
   `ownerUserId` as that vault.
3. Every category belongs to the same vault and owner as its item references.
4. An item may have no category, but it may not reference a category in a
   different vault.
5. User email is normalized before uniqueness enforcement.
6. Final vault secret data is an authenticated encrypted envelope.
7. Envelope AAD, item ID, vault ID, key ID, revision, and format version agree.
8. Revisions are positive integers and update operations use compare-and-set.
9. Session token hashes are unique and raw refresh tokens never enter a
   document, log, audit event, response body, or error.
10. Activity records are safe product events; audit events are append-oriented
    security evidence.

## Write Validation

Validation belongs at three layers:

- API boundary: shape, size, enum, and request normalization.
- Service layer: ownership, state transitions, revision checks, and business
  invariants.
- Mongoose: required fields, types, immutable fields, enum constraints, and
  collection-level persistence validation.

Controllers do not call Mongoose or mutate documents directly. The intended
flow is route -> controller -> service -> repository -> Mongoose.

## Ownership Enforcement

The authenticated server identity is the only source of `ownerUserId`.
Client-supplied `userId`, `vaultId`, and `itemId` are lookup selectors only.
Every repository query must include the authenticated owner scope or first
resolve and verify the parent resource. A successful lookup of an ID without
an owner match returns the same not-found behavior as an absent resource.

## Revision and Concurrency

An item update requires the caller's expected revision. The repository updates
only when `_id`, `vaultId`, `ownerUserId`, and `revision` match, and increments
the revision atomically. A zero-match result is a conflict. The same rule
applies to vault key metadata changes and category rename operations where
concurrent writes could lose data.

## Sensitive Projections

Default user queries exclude `accountPasswordVerifier`, TOTP envelope, and
recovery-code hashes. Default session queries exclude token hashes. Audit and
activity queries exclude request bodies and secret-bearing fields. Vault item
queries return encrypted envelopes only; decryption is a client responsibility
after verified key handling.

## State Transitions

| Resource | Allowed transition | Required condition |
|---|---|---|
| Vault | awaiting-owner -> encrypting -> verified | owner completes client encryption and verification |
| Vault | any active state -> blocked | quarantine or verification failure |
| VaultItem | active -> deleted | owner-scoped soft delete |
| VaultItem | deleted -> active | owner-scoped restore, revision checked |
| VaultItem | deleted -> purged | retention and explicit permanent-delete policy |
| Session | current -> used -> replaced | atomic refresh rotation |
| Session | current/used -> revoked | logout, password change, admin action, or family reuse |
| Category | active -> deleted | no silent reassignment of items |

## Integrity Checks Before Activation

Migration verification must report counts and violations for missing parents,
cross-owner relationships, duplicate normalized emails, duplicate active
categories, invalid revisions, malformed envelopes, and plaintext secret
fields. Any non-zero unexpected violation blocks activation.
