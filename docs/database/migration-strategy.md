# G4 JSON-to-Mongo Migration Strategy

**Date:** September 2026
**Gate:** G4 - Database Architecture + JSON-to-Mongo Migration Planning
**Status:** Planning only; no migration executed

The G3 baseline in `docs/security/g3-authoritative-baseline.md` is binding.
This document does not authorize source changes, production data conversion,
or database activation.

## 1. Source and Target Boundary

The current source is a memory cache persisted to `users.json`,
`passwords.json`, `categories.json`, and `activities.json`. Current password,
notes, and password-version fields are plaintext. The target is MongoDB
accessed by Mongoose with seven collections defined in `database-schema.md`.

Legacy plaintext is never written into `vaultItems.encryptedSecrets`. It is
held in controlled, access-restricted quarantine until the owner establishes
the browser-only Vault Master Password, derives the KEK, unwraps or creates the
VEK, encrypts the secret data, uploads the envelope, and passes verification.
Unavailable or failed records remain quarantined and are not labeled
encrypted.

## 2. Migration Metadata

Each run has:

- `migrationId`, immutable and globally unique.
- `migrationVersion`, target schema and transformation version.
- Source manifest containing file hashes, byte counts, record counts, and
  capture timestamps.
- Target schema and index versions.
- Deterministic legacy-to-target ID map.
- Checkpoint and per-record status: `pending`, `staged`, `verified`,
  `quarantined`, `failed`, or `activated`.
- Error code, retry count, and operator-visible diagnostic without secret data.

The manifest and migration metadata are access restricted and included in the
backup set.

## 3. Deterministic Flow

```text
Freeze source writes
  -> create immutable backup and manifest
  -> parse each JSON array
  -> validate shape and types
  -> normalize email, category names, timestamps
  -> map legacy IDs deterministically
  -> resolve owner and parent relationships
  -> detect duplicates, conflicts, and orphans
  -> quarantine exceptions
  -> stage valid non-secret metadata and account verifiers
  -> owner-assisted client encryption for legacy secrets
  -> verify counts, ownership, envelopes, and plaintext absence
  -> activate staged target
  -> retain manifest and verification evidence
```

Dry-run executes every step through quarantine and verification planning but
writes no target data. Resume uses the same migration ID and manifest. A second
run with an identical source manifest must not duplicate records.

## 4. Mapping Rules

| Source | Target | Rule |
|---|---|---|
| user `id` | `users.legacyId` | preserve for traceability; generate target `_id` |
| user `email` | `users.email` | trim, lowercase, validate, quarantine duplicate |
| user `passwordHash` | `users.accountPasswordVerifier` | preserve verifier metadata; no double hash |
| password `id` | `vaultItems.legacyId` | preserve; target item requires a vault |
| password `userId` | `vaults.ownerUserId` and item owner | resolve exactly one owner |
| password title/URL/display fields | item metadata | validate size and URL shape |
| password/password notes/version history | encrypted secret envelope | quarantine until owner encryption; never direct insert |
| password category name | category reference | normalize and resolve within the owner's vault |
| category `id` | `categories.legacyId` | map under the owning vault |
| activity `userId` | `activities.userId` | orphan activities quarantine |
| activity password ID/title | item reference/safe label | no plaintext details or secret values |

## 5. Idempotency and Checkpointing

The runner uses `(migrationId, sourceManifestHash, collection, legacyId)` as
its idempotency key. Upserts are allowed only for the same manifest and
transformation version. A changed source record produces a conflict requiring
review; it does not silently overwrite a staged target. Checkpoints are
committed after each bounded batch and include counts and hashes, never secret
payloads.

## 6. Quarantine Rules

Quarantine records include source location, legacy ID, error code, safe field
summary, migration ID, and retry status. They exclude raw secret values from
logs and ordinary reports. Quarantine is mandatory for duplicate IDs or
emails, missing owners, invalid timestamps, malformed records, unsupported
fields that affect meaning, conflicting revisions, and failed envelope
verification.

## 7. Backup, Activation, and Rollback

Before parsing, preserve source files, manifest, migration configuration,
schema/index version, and verification tooling in an immutable or write-once
location where practical. Stage target data separately from the active target.
Activation is a versioned pointer or deployment configuration change after all
checks pass.

Rollback uses migration ID, target version, staged state, previous active
target, and verified backup. It stops the affected migration, preserves failed
data for investigation, restores the previous active target, and re-runs
verification. It never means deleting all collections.

## 8. Failure Behavior

- Owner unavailable: remain `awaiting-owner` or quarantined.
- Browser closes: resume from the last verified item; do not reuse plaintext
  staging as a final record.
- Network failure: retry with an idempotency key; do not duplicate the item.
- Encryption failure: quarantine the source record and report a safe error.
- Verification failure: block activation and preserve evidence.
- Duplicate/conflicting record: quarantine; no arbitrary overwrite.

## 9. Backup and Manifest Requirements

The source backup must be integrity-checked before parsing and retained for the
defined recovery period. The manifest records hashes and counts, but not raw
secret values. Backup restoration must be rehearsed in a non-production
environment before G4 approval is converted into G5 implementation work.

## 10. Migration Risk Controls

| Risk | Control | Gate impact |
|---|---|---|
| Data loss | immutable backup, dry-run, counts, staged activation, rollback | P0; blocks activation |
| Plaintext leakage | quarantine, restricted access, no secret logs, final scan | P0; blocks G4 approval if target permits plaintext |
| Duplicate ownership | deterministic map, uniqueness checks, quarantine | P0/P1 depending on scope |
| IDOR | server-derived owner scope and parent checks | P0; blocks G5 security implementation |
| Interrupted run | checkpoint and idempotency key | P1; must pass G6 |
| Index failure | prebuild and validate indexes in staging | P1; blocks activation |
| Authentication regression | verifier compatibility and no double hashing | P0; requires G5/G6 evidence |

## 11. Restored G4 Risk Register

### P0: Authentication Regression

The migration must not make accounts unable to authenticate or weaken the G3
session model. Verification covers legacy verifier compatibility, Argon2id
upgrade behavior, explicit token validation, session creation, logout,
password-change invalidation, refresh rotation, and family reuse detection.
Any mismatch blocks activation and preserves the previous active target.

### P0: Secret Leakage

Migration workers, quarantine records, checkpoints, manifests, audit events,
and monitoring must not contain account passwords, vault secrets, plaintext
notes, KEKs, VEKs, raw tokens, recovery codes, or raw import files. A final
secret scan is required before activation.

### P1: Performance and Query Degradation

Indexes are validated before migration. Staging measures list queries, owned
item reads, writes, session operations, import batches, and migration batches
using representative fixtures. Performance targets are proposed, not passed,
and are governed by the G6/G10 acceptance process.

### P1: XSS, CSP, and Browser Exposure

Imported metadata and labels are untrusted input. G6 verifies safe rendering,
no unsafe HTML path, CSP expectations, dependency/script risk, browser storage
exposure, and clipboard cleanup. This database plan does not claim that React
defaults or CSP alone eliminate browser compromise.

### P1: CSRF and Cookie Session Risk

The target cookie session design requires SameSite configuration and explicit
CSRF protection for state-changing requests. Cookie attributes, origin checks,
CSRF rejection, logout, and session revocation are verified at G6 and audited
independently at G7.

### P1: Import, Timeout, and Observability Risk

Imports are size-bounded, parser-safe, staged, and atomic. Long-running work
has bounded batches, checkpoints, retry limits, and safe timeout behavior.
Structured migration metrics include counts, status, duration, retry, failure,
quarantine, and verification results without secret payloads.

## 12. G4 Migration Readiness Checklist

The following are planning gates, not completed claims:

- [ ] Source writes can be frozen and the source manifest captured.
- [ ] Backup restore and hash verification are rehearsed in staging.
- [ ] Dry-run completes without target writes and produces a reviewable report.
- [ ] Database Engineer approves schemas, indexes, and ownership constraints.
- [ ] Security/Crypto Architect confirms G3 boundaries are preserved.
- [ ] Migration fixture includes valid, duplicate, orphan, malformed, and
      conflicting records.
- [ ] Checkpoint resume and idempotent rerun are demonstrated in staging.
- [ ] Rollback rehearsal restores the previous active target without deleting
      all collections.
- [ ] Monitoring and escalation ownership are defined for G6/G10.
- [ ] G4 approval is recorded before G5 implementation begins.

## 13. Safe Staging and Dry-Run Procedure

1. Freeze the source dataset and record the manifest hash.
2. Verify the immutable backup before parsing.
3. Load only approved fixture or staging data into an isolated target.
4. Run parse, normalize, relationship, duplicate, orphan, and quarantine
   checks without writing active records.
5. Produce count, relationship, index, and plaintext-absence reports.
6. Obtain Engineering Lead and Database Engineer review of the report.
7. Repeat from the checkpoint and confirm no duplicate records.
8. Preserve the dry-run artifacts for G6 evidence.

No command in this procedure targets production infrastructure, external cloud
storage, or real user data.

## 14. API Integration Verification Plan

After target staging, G6 verifies authenticated API flows against the staged
schema: account lookup, vault ownership, item listing and revision writes,
category resolution, activity timeline, audit access, session rotation, import,
and export boundaries. Each endpoint receives positive, cross-user, missing
parent, stale revision, malformed input, and expired-session coverage.

Controllers must use services and repositories. A passing migration does not
approve direct controller-to-Mongoose access or authorize G5 implementation.

## 15. Proposed Performance Acceptance Targets

These are proposed targets to benchmark during G6 and confirm for release at
G10. They are not current measurements or guarantees:

| Operation | Proposed target |
|---|---|
| Normal owned vault read | P95 <= 250 ms in staging fixture |
| Vault item list query | P95 <= 300 ms for an indexed 1,000-item vault |
| Single vault item write | P95 <= 350 ms excluding client encryption time |
| Account authentication | P95 <= 1,500 ms including password verification |
| Refresh rotation | P95 <= 250 ms under representative concurrency |
| Staged import batch | No unbounded growth; report throughput and timeout rate |
| Migration batch | Bounded batch completion with resumable checkpoint; benchmark before approval |
| Client encryption/decryption | Device-benchmarked; no fixed guarantee until supported-device results exist |

Any target failure requires evidence-based tuning or an approved exception;
it must not be hidden by weakening security controls.

## 16. Operational Boundary

- **G4:** database architecture, migration readiness, backup/rollback design,
  and acceptance planning.
- **G6:** execution of database, migration, security, browser, and performance
  verification.
- **G7:** independent security verification of the implementation and claims.
- **G10:** actual deployment, release approval, production rollback rehearsal,
  monitoring readiness, and operational ownership.

G4 does not approve production cutover, real-data conversion, deployment, or
release.
