# G4 MongoDB Index Strategy

**Gate:** G4 - Database Architecture + JSON-to-Mongo Migration Planning

Indexes support verified query patterns and authorization boundaries. No index
searches plaintext secret values or creates a unique `{ host, vaultId }`
constraint.

| Collection | Index | Unique | Purpose and query | Notes |
|---|---|---:|---|---|
| users | `{ email: 1 }` | Yes | normalized email lookup during auth | Store normalized email; reject duplicate active accounts |
| users | `{ deletedAt: 1 }` partial | No | exclude soft-deleted users | Partial filter for deleted records |
| vaults | `{ ownerUserId: 1, deletedAt: 1 }` | No | list a user's active vaults | Authorization scope, not a client trust boundary |
| vaults | `{ ownerUserId: 1, _id: 1 }` | No | fetch owned vault by ID | Supports ownership query |
| vaultItems | `{ vaultId: 1, deletedAt: 1, updatedAt: -1 }` | No | list active items by vault | Primary listing path |
| vaultItems | `{ ownerUserId: 1, vaultId: 1, _id: 1 }` | No | ownership-scoped item lookup | Denormalized guard must match vault owner |
| vaultItems | `{ vaultId: 1, "metadata.categoryId": 1, deletedAt: 1 }` | No | category filtering | Metadata only |
| vaultItems | `{ vaultId: 1, "metadata.isFavorite": 1, deletedAt: 1 }` | No | favorite listing | Metadata only |
| categories | `{ vaultId: 1, normalizedName: 1 }` active partial | Yes | category lookup and uniqueness | Partial unique filter for active categories |
| categories | `{ vaultId: 1, deletedAt: 1 }` | No | list active/deleted categories | |
| sessions | `{ tokenHash: 1 }` | Yes | refresh token lookup | Hash is sensitive; restrict projections |
| sessions | `{ userId: 1, state: 1, expiresAt: -1 }` | No | list/revoke user sessions | |
| sessions | `{ familyId: 1, state: 1 }` | No | family reuse detection/revocation | Atomic family updates |
| sessions | `{ expiresAt: 1 }` TTL | No | eventual expired-session cleanup | Application always checks expiry |
| activities | `{ userId: 1, createdAt: -1 }` | No | user timeline | Optional TTL only after retention decision |
| activities | `{ vaultId: 1, createdAt: -1 }` | No | vault timeline | |
| auditEvents | `{ "actor.userId": 1, createdAt: -1 }` | No | user security history | Restricted access |
| auditEvents | `{ type: 1, createdAt: -1 }` | No | operational investigation | Avoid unbounded ad hoc indexes |
| auditEvents | `{ expiresAt: 1 }` TTL | No | policy-controlled retention cleanup | TTL is not forensic deletion guarantee |

## Index Rules

- Create and validate indexes in staging before activation.
- Use `explain()` against representative query shapes during G6.
- Do not index `encryptedSecrets.ciphertext`, plaintext fields, password
  strength derived from plaintext, or user-supplied secret content.
- Email normalization must be deterministic before the uniqueness check.
- A unique index build failure blocks migration activation and is quarantined
  as a data-integrity failure, not resolved by arbitrary deletion.
- Index definitions are versioned with the schema and included in the
  migration manifest.
