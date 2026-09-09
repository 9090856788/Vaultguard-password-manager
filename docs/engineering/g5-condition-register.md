# G5 Condition Register

**Gate:** G5.0 - Implementation Contract Freeze  
**Status:** Planning and governance only  
**Branch:** `tech-stack-migration`

This register freezes implementation-level defaults without changing the
approved G3 security/crypto architecture or G4 database/migration architecture.
No application implementation, dependency installation, migration, real-data
change, commit, push, or merge is authorized by this document.

## Repository

- **Repository:** `9090856788/Vaultguard-password-manager`
- **Branch:** `tech-stack-migration`
- **Architecture commits:** `59af136` and `28e42cb`
- **G3 source of truth:** `docs/security/g3-authoritative-baseline.md`
- **G4 schema:** `docs/database/database-schema.md`
- **G4 indexes:** `docs/database/index-strategy.md`
- **G4 integrity:** `docs/database/data-integrity.md`
- **G4 migration:** `docs/database/migration-strategy.md`
- **API contract:** `docs/api/api-contract.md`
- **Test strategy:** `docs/testing/migration-test-strategy.md`
- **Implementation blueprint:** `docs/engineering/g5-implementation-blueprint.md`

## Locked Decisions

### 1. Retention Policy

Initial configurable operational defaults:

| Data | Default retention |
|---|---:|
| Activity events | 365 days |
| Audit events | 365 days |
| Migration quarantine metadata | 90 days after migration completion or explicit resolution, whichever is later |
| Encrypted version history | 90 days initially, subject to product review |
| Sessions | Until session expiry; TTL is cleanup only |

These values are operational defaults, not cryptographic deletion guarantees.
Permanent deletion is an explicit product/security operation. Retention values
must be configurable and tested without exposing sensitive data.

### 2. Argon2id Benchmarking

The approved baseline remains frozen:

- Argon2id.
- Memory: 64 MiB.
- Time cost: 3.
- Parallelism: 1.
- Output: 32 bytes.
- Random per-vault salt.
- Versioned parameters.

Before production release, benchmark representative supported device classes.
Record device class, browser/runtime, duration, memory impact, percentile
results, and accepted UX threshold. Any production parameter change requires a
new versioned crypto decision and Security/Crypto Architect approval.

### 3. API Limits and Pagination

Potentially large collections use cursor-based pagination:

- Default page size: 50.
- Maximum page size: 100.
- Invalid or oversized values are rejected server-side.

Validators must explicitly bound string lengths, array lengths, request-body
size, import-file size, CSV row count, and CSV field size. Exact limits are an
implementation/testing decision within these bounds and may not weaken G3/G4.

### 4. Category Name Reuse

Category names are unique among active categories within a vault. Deleted
categories may be reused through a partial unique index applying only to active
categories. Migration conflicts are quarantined for review; categories are not
silently renamed or reassigned.

### 5. Version History

Version history remains encrypted within the approved vault encryption model
where practical. No plaintext history collection or plaintext history field is
permitted. If implementation requires a separate encrypted history collection,
the agent must stop and escalate the architecture decision before introducing
it. Historical passwords must never become a plaintext recovery path.

### 6. CI and Deployment Secrets

Secrets are supplied through environment and CI secret mechanisms. Never commit
JWT secrets, encryption secrets, database credentials, API keys, deployment
tokens, real OAuth/client secrets, or recovery credentials. `.env.example`
contains dummy placeholders only. Production startup fails closed when required
secrets are missing.

## Frozen G3/G4 Security and Architecture Rules

1. Account Authentication Password and Vault Master Password are separate.
2. Vault Master Password never reaches the server.
3. Account verification is separate from vault KEK derivation.
4. Argon2id -> KEK -> authenticated wrapped random VEK -> AES-256-GCM.
5. Raw KEK, VEK, passwords, tokens, and recovery codes are never persisted.
6. Authentication uses Secure, HttpOnly, SameSite-configured cookies.
7. Refresh sessions are server-tracked by token hash.
8. Refresh rotation is mandatory on every successful refresh.
9. Refresh reuse revokes the complete token family.
10. State-changing cookie requests require CSRF protection.
11. 2FA is a real TOTP lifecycle, not a boolean-only feature.
12. Vault secret-bearing fields are authenticated encrypted envelopes.
13. Final VaultItem records contain no plaintext secret fields.
14. No unique `{ host, vaultId }` constraint exists.
15. Secret analysis occurs client-side after approved vault unlock.
16. Portable encrypted export is versioned and authenticated.
17. Plaintext CSV is a separate, explicit client-side export mode.
18. Legacy plaintext uses controlled temporary migration handling, followed by
    user/browser-assisted encryption, and is never inserted into final
    encrypted VaultItem fields.
19. The target has seven MongoDB collections: users, vaults, vaultItems,
    categories, sessions, activities, and auditEvents.
20. Persistence flow is Controller -> Service -> Repository -> Mongoose ->
    MongoDB.
21. The JSON adapter is migration/rollback compatibility only, not accepted
    production persistence, and must be removable or deactivatable after
    successful migration.
22. Current UI composition and behavior are preserved.
23. Tailwind-to-CSS-Modules conversion requires approved pre-change screenshots.
24. QA, Security Audit, Visual Regression, Code Review, and Release remain
    separate downstream gates.

## Outstanding Human Approvals

- Database Engineer sign-off on models, indexes, repositories, and integrity
  constraints.
- Security/Crypto Architect sign-off on crypto/auth implementation readiness.
- Product/security acceptance of the retention defaults.
- Argon2id benchmark acceptance on supported device classes.
- Migration fixture and manifest approval.

Codex must stop and request review if any approval changes a frozen G3/G4
decision, retention behavior, envelope format, schema constraint, or migration
state transition.

## G5 Agent Sequence

1. **Database Engineer:** implement seven-collection persistence foundation,
   repositories, indexes, validators, and fixtures.
2. **Backend Engineer - scaffolding:** implement middleware, service boundaries,
   validation, error handling, request IDs, and non-crypto auth foundations.
3. **Crypto Engineer:** freeze and implement the approved crypto contract and
   primitives with test vectors.
4. **Backend Engineer - crypto-dependent implementation:** implement vault,
   authentication/session behavior, key lifecycle, 2FA, and encrypted fields.
5. **Integration Engineer:** implement import/export, migration orchestration,
   OpenAPI, health, CI/Docker boundaries, and isolated integration fixtures.
6. **Frontend Engineer:** integrate vault unlock, crypto lifecycle, server state,
   secure cleanup, routing, Redux, and visual-preserving CSS Modules work.
7. **QA Engineer:** execute G6 functional, security, migration, performance,
   and visual verification.
8. **Security Auditor:** independently audit implementation and claims.
9. **Performance Engineer:** benchmark measured database, API, migration,
   rendering, and client-crypto paths.
10. **Code Reviewer:** review correctness, scope, maintainability, and evidence.
11. **Release Engineer:** verify build, configuration, rollback, and release
    readiness at G10.
12. **Documentation Engineer:** update only verified behavior and evidence.

### Safe Parallel Work

After G3/G4 contract freeze, these may proceed in parallel:

- Redux foundation.
- React Router foundation.
- CSS Modules foundation.
- API-client abstraction.
- Component inventory and accessibility inventory.
- Backend non-crypto scaffolding.
- Database fixtures and migration test fixtures.
- Crypto test-vector preparation.

Stable API and crypto contracts are required before vault unlock, crypto
lifecycle integration, TanStack Query server-state integration, 2FA flows, or
import/export flows.

## Human Approval Points

Codex and implementation agents must stop for human or designated specialist
approval before:

- Changing any G3/G4 security, crypto, schema, index, or migration decision.
- Accepting retention defaults for production.
- Accepting Argon2id benchmark thresholds or changing parameters.
- Introducing a new encrypted history collection or envelope version.
- Activating a migration or converting real data.
- Approving security findings, visual baselines, or production release.

## Forbidden Changes

Agents may not silently redesign, weaken, bypass, or reinterpret G3/G4. They
may not persist raw KEK/VEK, plaintext vault secrets, raw tokens, or recovery
codes; use client-provided user IDs as authorization; add a unique
`{ host, vaultId }`; invent persistent plaintext quarantine storage; use
localStorage for production auth tokens; bypass the service/repository layers;
introduce custom cryptography; or claim zero knowledge, encryption, encrypted
export, or implemented 2FA before the applicable verification gates pass.

Production migration, deployment, release, commit, push, and merge are outside
this contract and remain prohibited until their separate gates are approved.

