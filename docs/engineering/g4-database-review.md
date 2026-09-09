# G4 Database + JSON-to-Mongo Migration Review

**Gate:** G4 - Database Architecture + JSON-to-Mongo Migration Planning
**Reviewer roles:** Engineering Lead, Database Engineer, Codebase Architect,
Security/Crypto Architect co-review
**Status:** Proposed G4 decision below; implementation is not approved by this document

## Executive Finding

The target model is internally consistent with G3 when final vault secrets are
encrypted client-side and the server stores only authenticated envelopes. The
current application is not that target: it uses a memory cache backed by JSON,
stores plaintext password and note fields, has no Vault, Session, or AuditEvent
collections, and accesses the store directly from controllers.

## Current Legacy Evidence

The source defines four JSON arrays:

- `users.json`: `id`, email, full name, bcrypt `passwordHash`, profile and
  preference fields, 2FA boolean, and ISO timestamp strings.
- `passwords.json`: `id`, `userId`, title, URL, username, email, plaintext
  password, category name, plaintext notes, tags, display metadata, soft-delete
  fields, strength fields, timestamps, and plaintext `versionHistory`.
- `categories.json`: `id`, `userId`, display name, icon, color, and custom flag.
- `activities.json`: `id`, `userId`, action, optional password ID/title,
  details, IP address, and ISO timestamp.

The source code also seeds demo records when the arrays are empty. The exact
runtime files are not treated as migration input unless an operator supplies a
verified source manifest.

## Target Decision Summary

- Seven collections: users, vaults, vaultItems, categories, sessions,
  activities, auditEvents.
- User account verifier is separate from vault cryptographic material.
- Vault ownership is `users._id -> vaults.ownerUserId`.
- Vault items contain server-visible metadata and encrypted secret envelopes.
- Multiple items for one host are supported.
- Sessions store token hashes only and rotate atomically.
- Activity is a safe product timeline; audit events are security evidence.
- Legacy plaintext is quarantined until the owner establishes a Vault Master
  Password and the browser writes verified encrypted records.

## Migration Decision

Use a versioned migration runner with a source manifest, migration ID,
checkpoint, deterministic ID map, quarantine store, staged writes, verification,
and migration-scoped activation. It must support dry-run and resume. It must
not delete legacy input, overwrite conflicts, assign orphans arbitrarily, or
mark plaintext data encrypted.

## P0 / P1 Findings

| Priority | Finding | G4 disposition |
|---|---|---|
| P0 | Legacy plaintext secrets cannot enter final VaultItem fields | Quarantine and owner-assisted client encryption are mandatory |
| P0 | Current app has no server-tracked session model | Define sessions and atomic rotation before G5 auth implementation |
| P0 | Current source claims security properties it does not implement | Remains a G5 implementation blocker; documentation now classifies it honestly |
| P1 | Legacy category names are not stable references | Resolve by deterministic vault-scoped normalization and quarantine conflicts |
| P1 | Direct controller/store access bypasses repository boundaries | G5 must implement route/controller/service/repository separation |
| P1 | Legacy timestamps and generated IDs are weakly governed | Validate, preserve as legacy IDs, and create deterministic target IDs |

## G4 Acceptance Result

The architecture is complete enough to proceed to G4 approval with conditions.
The bounded conditions are: finalize implementation-level schema validators,
benchmark Argon2id on supported devices, define operational retention values,
and produce a reviewed migration fixture manifest before G5 begins.

## G4 Pass/Fail Matrix

| Area | PASS requires | FAIL condition |
|---|---|---|
| Architecture | all seven collections, fields, ownership, sensitivity, timestamps, and lifecycle rules are defined | an entity or sensitive-data boundary is undefined |
| Indexes | every index has a query purpose, uniqueness decision, and no plaintext-secret index | speculative index or unjustified uniqueness exists |
| Ownership | server identity and parent checks govern every resource | client `userId`, `vaultId`, or `itemId` can establish access |
| Migration | deterministic IDs, manifest, dry-run, checkpoint, idempotency, quarantine, verification, backup, and scoped rollback are defined | direct plaintext insertion, silent overwrite, silent deletion, or delete-all rollback is allowed |
| Security | no plaintext secret target fields, raw tokens, raw keys, or raw recovery codes | any final target collection permits one of these values |
| API boundary | controller/service/repository separation and transaction requirements are explicit | controllers access Mongoose or secret responses are undefined |
| Verification | counts, relationships, owners, envelopes, plaintext absence, duplicates, orphans, quarantine, and rollback are checked | activation can occur with an unresolved P0 discrepancy |

## G4 Conditions Before G5

1. The Database Engineer approves the seven-collection schema and index set.
2. The migration fixture manifest is produced from a frozen, operator-supplied
   source backup; no live production data is used for planning validation.
3. Schema validators and repository ownership checks are specified at the
   implementation level without weakening G3.
4. Argon2id parameters are benchmarked on supported client devices, with the
   approved 32-byte output and versioned metadata preserved.
5. Retention values for activities, audit events, quarantine records, and
   version history are chosen by the product owner and recorded before G5.

Until these conditions are evidenced, G5 implementation must not begin.
