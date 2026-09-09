# G5 IMPLEMENTATION BLUEPRINT

**Project:** VaultGuard Password Manager  
**Branch:** `tech-stack-migration`  
**Gate:** G5 - Implementation  
**Status:** Planning only; no implementation approved by this document  
**Prerequisites:** G3 and G4 approved with conditions

This blueprint consumes the G3 security/crypto baseline and G4 database and
migration architecture without redesigning them. It is the implementation
contract for the custom AI engineering team. Every agent must inspect the
current source before editing and report exact files, verification, and risks.

## 1. Executive Summary

G5 replaces the JSON-backed prototype with the approved MongoDB/Mongoose
modular monolith, implements the approved authentication/session and vault
encryption boundaries, migrates frontend state incrementally, and adds the
test and operational evidence required for G6 through G10.

G5 does not approve production migration, release, visual sign-off, or the
security claims currently shown by the UI. Those require later gates.

## 2. G3/G4 Constraints

- Account Authentication Password and Vault Master Password are separate.
- The Vault Master Password never reaches the server.
- Argon2id uses a random per-vault salt, versioned parameters, and 32-byte KEK.
- A random 32-byte VEK is authenticated-wrapped under the KEK.
- Vault secrets use AES-256-GCM with fresh random 96-bit nonces, canonical AAD,
  versioned envelopes, and key IDs.
- Raw KEK, VEK, passwords, notes, TOTP secrets, recovery codes, and refresh
  tokens are never persisted or logged.
- Auth uses short-lived access tokens and Secure/HttpOnly/SameSite refresh
  cookies, server-tracked sessions, mandatory rotation, reuse detection, family
  revocation, logout, password-change invalidation, and CSRF protection.
- Final collections are `users`, `vaults`, `vaultItems`, `categories`,
  `sessions`, `activities`, and `auditEvents`.
- No unique `{ host, vaultId }` constraint exists.
- Legacy plaintext enters controlled temporary migration handling and is
  client-encrypted before final item activation.
- No zero-knowledge, encrypted-at-rest, encrypted-export, or implemented-2FA
  claim is allowed before verification gates pass.

## 3. Agent Dependency Graph

```text
Engineering Lead
  -> Technical Planner
    -> G3/G4 contract freeze
      -> Database Engineer: database foundation
        -> Crypto Engineer: approved crypto contract and primitives
          -> Backend Engineer: crypto-dependent vault/auth behavior
            -> Integration Engineer
              -> Frontend Engineer: crypto/server-state integration
                -> QA Engineer
                  -> Security Auditor
                    -> Performance Engineer
                      -> Code Reviewer
                        -> Release Engineer
                          -> Documentation Engineer
```

Backend scaffolding, route inventory, validation scaffolding, frontend Redux
foundation, React Router foundation, CSS Modules foundation, API-client
abstraction, component inventory, database fixtures, and crypto test-vector
preparation may proceed in parallel after the G3/G4 contract freeze.

The following order is strict:

1. Freeze G3/G4 contracts and shared types.
2. Build the database models, indexes, repositories, and migration fixtures.
3. Freeze the crypto contract and implement reviewed crypto primitives.
4. Implement backend crypto-dependent vault and authentication behavior.
5. Integrate import/export, migration orchestration, OpenAPI, health, and
   cross-layer boundaries.
6. Integrate frontend vault unlock, crypto lifecycle, and TanStack Query server
   state only after API and crypto contracts are stable.
7. Run QA, security audit, performance review, code review, release review, and
   documentation verification.

No crypto-dependent vault behavior may be implemented before the approved
crypto contract and primitives are frozen. Shared schema, API, envelope, and
cookie contracts have one owning agent at a time.

## 4. Phase-by-Phase Implementation Plan

### Phase 0 - G5 Entry and Contract Freeze

**Agent:** Engineering Lead with Technical Planner  
**Prerequisites:** G3/G4 condition acknowledgement, retention decisions,
Argon2id benchmarking plan, migration fixture strategy  
**Files:** plan and evidence files under `docs/engineering/`  
**Forbidden:** application source, package files, production data  
**Objective:** freeze contracts, owners, dependencies, and forbidden changes.  
**Acceptance:** every work package has an owner, dependency, acceptance test,
rollback, and file boundary.  
**Tests/security:** architecture traceability and G3/G4 checklist review.  
**Rollback:** no runtime change.  
**Evidence:** condition register, approved handoffs, and plan checksum.

### Phase 1 - Persistence Foundation

**Agent:** Database Engineer  
**Prerequisites:** Phase 0 and G4 schema/index approval  
**Files:** `src/api/models/`, `src/api/repositories/`,
`src/api/config/database.ts`, `src/api/config/env.ts`, database tests, fixtures  
**Forbidden:** crypto protocol changes, frontend files, security claims  
**Objective:** implement seven Mongoose models, validators, indexes,
projections, repository interfaces, connection lifecycle, and ownership-safe
query primitives.  
**Acceptance:** schema/index tests pass; no plaintext target fields; no
host/vault uniqueness.  
**Tests/security:** schema, index, ownership, projection, and concurrency tests.  
**Rollback:** retain the JSON adapter as an inactive migration/rollback
compatibility boundary only; it is not an accepted production persistence path
and must be removable or deactivatable after successful migration.  
**Evidence:** model/index explain output and repository contract tests.

### Phase 2 - Backend Scaffolding and Authentication

**Agent:** Backend Engineer with Security/Crypto Architect review  
**Prerequisites:** Phase 1 repositories; approved auth contract; crypto-dependent
vault behavior waits for Phase 3  
**Files:** `src/api/controllers/`, `src/api/services/`, `src/api/routes/`,
`src/api/middleware/`, `src/api/utils/`, `src/api/types/`, backend tests  
**Forbidden:** direct controller-to-Mongoose access, raw token storage, crypto-
dependent vault behavior before Phase 3, source UI changes  
**Objective:** implement layered service scaffolding, validation, authorization,
errors, request IDs, health, and non-crypto auth/session foundations.  
**Acceptance:** all persistence access flows through repositories; explicit JWT
validation and cookie/session interfaces are ready for crypto-dependent flows.  
**Tests/security:** Supertest route, validation, IDOR, rate-limit, and error tests.  
**Rollback:** retain inactive JSON compatibility adapter.  
**Evidence:** API contract tests and security review.

### Phase 3 - Approved Cryptography

**Agent:** Crypto Engineer with Security/Crypto Architect  
**Prerequisites:** Phase 1 envelope fields and client/server contract  
**Files:** `src/crypto/` or an approved existing crypto boundary, crypto tests,
test vectors, key lifecycle documentation  
**Forbidden:** custom primitives, raw-key persistence, server-side plaintext
decryption, G3 parameter changes without approval  
**Objective:** implement reviewed Argon2id, KEK/VEK, AES-256-GCM envelope,
canonical AAD, tamper handling, and key rotation primitives.  
**Acceptance:** round trip, wrong-key, wrong-AAD, tamper, nonce, version, and
key-ID failures are deterministic and fail closed.  
**Tests/security:** unit/property tests, known vectors, benchmark, no-secret
logging scan, independent crypto review.  
**Rollback:** envelope version gating; never downgrade to plaintext.  
**Evidence:** vectors, benchmark report, and Security/Crypto Architect signoff.

### Phase 4 - Crypto-Dependent Backend and Integration

**Agents:** Backend Engineer, Integration Engineer, Crypto Engineer  
**Prerequisites:** Phases 1-3 and frozen crypto contract/primitives  
**Files:** vault/category/activity/audit services, auth/session flows,
import/export services, migration runner, quarantine adapter, tests  
**Forbidden:** persistent plaintext quarantine collection, direct plaintext
target writes, default import passwords, unsafe CSV splitting, production run  
**Objective:** implement encrypted vault behavior, 2FA lifecycle, atomic
import/export staging, and dry-run/idempotent migration orchestration.  
**Acceptance:** failure paths remain in controlled temporary migration handling;
final records contain encrypted envelopes only; 2FA recovery codes are hashed.  
**Tests/security:** envelope, 2FA, quarantine, duplicate/orphan, rollback,
plaintext-absence, and session replay tests.  
**Rollback:** migration remains staged; activation is a later controlled action.  
**Evidence:** fixture manifest, dry-run, quarantine, and verification reports.

### Phase 5 - Frontend State and UI Migration

**Agent:** Frontend Engineer  
**Prerequisites:** stable API contracts and crypto client boundary; early Redux,
Router, CSS, client abstraction, and component inventory work may already run  
**Files:** `src/context/VaultContext.tsx`, `src/services/api.ts`, `src/types/`,
`src/store/`, `src/routes/`, `src/components/`, CSS modules, `src/index.css`  
**Forbidden:** visual redesign, raw keys in localStorage/Redux, security claim
copy, unrelated cleanup  
**Objective:** migrate state and UI integration while preserving approved UX.  
**Acceptance:** vault unlock, crypto lifecycle, TanStack Query server state,
2FA, and import/export begin only after stable API/crypto contracts; logout,
auto-lock, and expiry clear transient keys and plaintext.  
**Tests/security:** RTL, browser storage, clipboard, auto-lock, accessibility,
and responsive/theme tests.  
**Rollback:** retain adapter boundaries until parity is demonstrated.  
**Evidence:** state ownership map, component tests, and screenshots.

### Phase 6 - Integration and Cutover Readiness

**Agents:** Integration Engineer and QA Engineer  
**Prerequisites:** Phases 1-5  
**Files:** `src/api/app.ts`, `server.ts`, OpenAPI files, CI workflows, Docker,
Playwright config/tests, and fixtures  
**Forbidden:** production deployment, real-data migration, release claims  
**Objective:** connect health, OpenAPI, CI, Docker, full-stack fixtures, and
isolated migration rehearsal.  
**Acceptance:** build/lint/test/container checks pass; no secret leakage in
logs/artifacts; rollback rehearsal passes.  
**Tests/security:** Vitest, RTL, Supertest, Playwright, and security scans.  
**Rollback:** documented staged-target rollback and JSON preservation.  
**Evidence:** reproducible CI artifacts and G6 handoff.

## 5. File/Folder Change Map

```text
src/api/config/database.ts
src/api/config/env.ts
src/api/models/{User,Vault,VaultItem,Category,Session,Activity,AuditEvent}.ts
src/api/repositories/*.ts
src/api/services/*.ts
src/api/controllers/*.ts
src/api/middleware/*.ts
src/api/routes/*.ts
src/api/utils/*.ts
src/crypto/*.ts
src/store/{index,slices}/*.ts
src/routes/*.tsx
src/services/api.ts
src/types/*.ts
src/components/**/*.tsx
src/components/**/*.module.css
tests/unit/**/*.test.ts
tests/component/**/*.test.tsx
tests/api/**/*.test.ts
tests/e2e/**/*.spec.ts
tests/fixtures/**/*
openapi/**/*.yaml
Dockerfile
docker-compose*.yml
.github/workflows/*.yml
```

The exact file list is finalized by the Technical Planner after inspection.
`.vault_data/`, real `.env` files, production data, and generated credentials
are forbidden.

## 6. Backend Implementation Plan

Implement route -> controller -> service -> repository -> Mongoose. Controllers
parse requests and map responses; services enforce business rules; repositories
apply owner-scoped queries and projections. Add validation, error codes,
request IDs, structured logging, health checks, and bounded rate limiting.

The JSON adapter is migration/rollback compatibility only. It is not an
accepted production persistence path and must be removable or deactivatable
after successful migration.

## 7. Database Implementation Plan

Implement `users`, `vaults`, `vaultItems`, `categories`, `sessions`,
`activities`, and `auditEvents` exactly as G4 specifies. Add timestamps,
soft-delete rules, partial uniqueness for active categories, session TTL
cleanup, restricted projections, and optimistic revision checks. Do not index
encrypted ciphertext or secret-derived values.

## 8. Crypto Implementation Plan

Use an audited standard library. Implement Argon2id with random per-vault salt,
versioned parameters, and explicit 32-byte output; random VEK generation;
authenticated VEK wrapping; AES-256-GCM envelopes; fresh 96-bit nonces;
canonical AAD; fail-closed versions/tags/AAD; and approved key rotation.

Master-password change is old KEK -> unwrap VEK -> derive new KEK -> re-wrap
VEK. Raw keys never enter logs, URLs, Redux persistence, localStorage, server
responses, or MongoDB plaintext fields.

## 9. Authentication/Session Implementation Plan

- Fail closed if required secrets/configuration are absent.
- Validate JWT algorithm, issuer, audience, subject, token type, and expiry.
- Use short-lived access tokens and Secure/HttpOnly/SameSite refresh cookies.
- Track refresh-token hashes in `sessions`.
- Rotate on every successful refresh and revoke the family on reuse.
- Revoke current session on logout and all sessions on password change.
- Add rate limiting, progressive delay, lockout, and CSRF protection.
- Never accept client `userId` as authorization.

## 10. 2FA Implementation Plan

Implement TOTP enrollment, confirmation, login challenge, recovery-code
generation and one-time use, disable with step-up verification, reset/recovery,
rate limiting, and audit events. Store only protected TOTP material and
recovery-code hashes. A boolean flag alone is not implemented 2FA.

## 11. Import/Export Plan

Use a proper bounded CSV parser, validate encoding/size/rows/fields, use
versioned authenticated encrypted export envelopes, and keep plaintext CSV as
a separately confirmed client-side mode. Never create default passwords.
Stage imports atomically with duplicate handling, hostile-input validation, and
rollback. No plaintext quarantine collection may be invented for this flow.

## 12. Migration Implementation Plan

Implement freeze -> backup -> manifest -> parse -> validate -> normalize ->
map -> quarantine handling -> stage -> verify -> activate -> rollback.

Legacy plaintext handling is explicitly:

```text
legacy source
  -> controlled temporary migration handling
  -> user/browser-assisted encryption
  -> encrypted target
```

The controlled temporary handling must not become a normal MongoDB production
collection containing plaintext vault secrets. Agents may not invent persistent
plaintext quarantine storage. Use deterministic ID mapping, checkpoints,
idempotency keys, duplicate/orphan handling, and verification reports.

## 13. Frontend Implementation Plan

Preserve current approved UI/UX and behavior. Safe early parallel work includes
Redux foundation, React Router foundation, CSS Modules foundation, API-client
abstraction, and component inventory. Stable API and crypto contracts are
required before vault unlock, crypto lifecycle integration, TanStack Query
server-state integration, 2FA flows, or import/export flows.

Clear plaintext and transient keys on logout, auto-lock, expiry, fatal auth
failure, and relevant multi-tab events. Required coverage is desktop, laptop,
tablet, mobile, small mobile, light theme, and dark theme.

## 14. State Management Plan

Use Redux Toolkit for client state such as UI state, transient unlock state, and
non-server preferences. Do not persist raw keys or plaintext vault records in
Redux. Use TanStack Query for server data, cache invalidation, loading, errors,
and revision-aware mutations after the API and crypto contracts stabilize.

## 15. Routing Plan

Introduce React Router without changing approved visual composition. Define
public auth routes, protected vault routes, recovery/2FA routes, and safe error
boundaries. Guards derive auth from the approved session mechanism, not a
localStorage token.

## 16. Styling Migration Plan

Migrate Tailwind-based styling to CSS Modules and CSS variables incrementally.
Before converting any surface, capture and obtain approval for its existing
reference screenshots. Do not create new baselines after styling changes.

Preserve layout, spacing, typography, interactions, themes, responsive states,
focus behavior, and accessibility. Each migrated surface requires Playwright
screenshot comparison against the approved pre-conversion reference.

## 17. API/OpenAPI Plan

Document `/auth`, `/vaults`, `/passwords`, `/categories`, `/activities`,
`/audit`, `/security`, `/health`, and import/export contracts. Keep schemas
aligned with implementation, mark encrypted envelopes and redacted fields,
and never document unsupported security claims as implemented.

## 18. Testing Implementation Plan

**Vitest:** crypto, validators, repositories, services, migration transforms,
state reducers, and error paths.

**React Testing Library:** auth states, auto-lock, transient-key cleanup,
import confirmation, error/loading/empty states, keyboard behavior, and themes.

**Supertest:** auth cookies, refresh rotation/reuse, CSRF, IDOR, rate limits,
2FA, CRUD, imports, exports, health, and error contracts.

**Playwright:** end-to-end auth, vault unlock, CRUD, import/export, auto-lock,
logout, responsive layouts, themes, and screenshot baselines.

## 19. Visual Regression Plan

Capture and approve reference screenshots before each Tailwind-to-CSS Modules
conversion. Compare desktop, laptop, tablet, mobile, small mobile, light, and
dark variants against those pre-change references. Fail on unexpected layout,
typography, overflow, focus, responsive, or interaction regressions. Never
replace a failing reference with a post-change screenshot.

## 20. Security Verification Plan

Security/Crypto Architect reviews crypto and auth diffs before QA. G6 verifies
plaintext absence, browser storage, clipboard, XSS/CSP, CSRF, IDOR, hostile
imports, session replay, key lifecycle, and log hygiene. G7 independently
audits actual implementation and claims. Any P0 blocks progression.

## 21. Performance Verification Plan

Establish baselines before optimization. Benchmark database reads/writes,
indexed lists, authentication, refresh rotation, import, migration batches,
serialization, rendering, and client crypto on supported devices. Do not reduce
Argon2id or encryption parameters to improve benchmarks. Record workload,
hardware, percentiles, memory, and residual risks.

## 22. CI/CD Plan

Add workflows for lockfile installation, lint/typecheck, unit/component/API
tests, build, security/static scans, migration dry-run fixtures, and Playwright
artifacts. CI must not access production data or secrets. Release workflow is
G10-owned.

## 23. Docker Plan

Add reproducible development/test containers only after required services are
confirmed. Use environment injection, non-secret example configuration,
health checks, isolated test MongoDB, and no production credentials. Startup
must fail safely when required secrets are missing.

## 24. Agent-by-Agent Acceptance Criteria

| Agent | Acceptance evidence |
|---|---|
| Engineering Lead | gate conditions, scope, and approvals recorded |
| Technical Planner | dependency graph, file map, handoffs, rollback plan |
| Database Engineer | seven models, indexes, repositories, integrity tests |
| Backend Engineer | layered services, auth, validation, API tests |
| Crypto Engineer | reviewed envelopes, vectors, tamper and key tests |
| Frontend Engineer | state/routing/style migration and visual parity |
| Integration Engineer | import/export and migration contract tests |
| QA Engineer | G6 report with negative-path evidence |
| Security Auditor | independent findings and remediation status |
| Performance Engineer | benchmark report and residual scale risks |
| Code Reviewer | scope, correctness, maintainability, evidence review |
| Release Engineer | build/config/rollback/release readiness report |
| Documentation Engineer | verified docs and claims classification |

## 25. Definition of Done

G5 is done only when the approved architecture is implemented, tests and
security checks exist, no raw secrets persist, API/OpenAPI contracts match,
visual parity evidence exists, migration dry-run evidence is available, and
all agent handoffs are complete. G5 completion does not equal G6, G7, G8, G9,
or G10 approval.

## 26. G5 Entry Criteria

- G3 and G4 conditions acknowledged.
- Database Engineer sign-off identified.
- Retention decisions recorded.
- Migration fixture strategy defined.
- Argon2id benchmarking plan exists.
- Security/Crypto Architect assigned to crypto/auth review.
- No production data or deployment access is required for implementation.

## 27. G5 Exit Criteria

- Approved seven-collection implementation exists.
- Auth/session, crypto, 2FA, import/export, and migration paths are tested.
- Frontend state and styling preserve approved behavior.
- No prohibited secret persistence or plaintext target fields remain.
- CI, Docker, OpenAPI, health, logging, and request-ID evidence exists.
- QA handoff is complete and G6 is ready.
- Known blockers and residual risks are documented.

## 28. Risks

- Crypto implementation drift from G3.
- Plaintext leakage through API responses, logs, cache, browser storage, or
  temporary migration handling.
- Session replay or CSRF defects.
- IDOR through parent-resource lookup gaps.
- Migration duplicates, orphan records, or incomplete owner encryption.
- Visual regression during state/style migration.
- Unbounded import or migration resource use.
- Shared-file conflicts between agents.

Every risk requires an owner, test, severity, and rollback or containment.

## 29. Open Decisions

Before implementation begins, human/product approval is required for:

1. Activity, audit, quarantine metadata, and version-history retention values.
2. Supported-device Argon2id benchmark population and threshold.
3. Exact Mongoose validator limits and API pagination defaults.
4. Category-name reuse after soft deletion.
5. Version-history envelope storage within the approved encrypted model.
6. CI provider secrets and deployment environment ownership.

None of these decisions may weaken G3 or G4.

## 30. Recommended Execution Sequence

1. Engineering Lead opens G5 with the condition register.
2. Technical Planner freezes this blueprint and creates agent work items.
3. Database Engineer implements models, indexes, repositories, and fixtures.
4. Backend Engineer builds scaffolding and non-crypto service boundaries.
5. Crypto Engineer freezes and implements the approved crypto contract/primitives.
6. Backend Engineer implements crypto-dependent vault/auth behavior.
7. Integration Engineer connects import/export, migration, OpenAPI, health,
   CI, Docker, and fixtures.
8. Frontend Engineer integrates vault crypto lifecycle and server state after
   stable contracts, while safe foundations proceed in parallel.
9. QA Engineer executes G6 verification and visual regression preparation.
10. Security Auditor, Performance Engineer, Code Reviewer, Release Engineer,
    and Documentation Engineer complete their independent gates.

### Parallel Work

After contract freeze: Redux foundation, React Router foundation, CSS Modules
foundation, API-client abstraction, component inventory, database fixtures,
backend scaffolding, and crypto test vectors may proceed in parallel.

### Sequential Work

Schema before repositories; repositories before services; crypto contract and
primitives before crypto-dependent backend behavior; backend/API contracts
before frontend vault unlock and TanStack Query integration; implementation
before QA; QA before audit and release gates.

### Human Approval Required

G3/G4 conditions, retention, Argon2id benchmark acceptance, schema changes,
crypto protocol changes, migration activation, security findings, screenshot
baselines, visual parity, and production release.

### Prohibited Until G7

No zero-knowledge, end-to-end encryption, encrypted-at-rest, encrypted-export,
or implemented-2FA claim may be presented as verified before G7. No production
data migration or release occurs before G10.

### UI Preservation Boundary

Existing component composition, visual hierarchy, responsive behavior, light
and dark themes, accessibility behavior, and approved copy remain untouched
unless a separately approved issue requires a change. Security copy changes
follow the claims policy and security review.

