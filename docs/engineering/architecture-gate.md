# G2 Architecture Gate Decision

**Date:** September 2026  
**Gate:** G2 - Architecture Review & Approval  
**Status:** Historical G2 record; G3 APPROVED WITH CONDITIONS
**Decision Maker:** Engineering Lead + Architecture Team  
**Next Gate:** G4 - Database Architecture + JSON-to-Mongo Migration Planning

> This document records the historical G2 decision. Current security architecture and gate definitions are authoritative in [g3-authoritative-baseline.md](../security/g3-authoritative-baseline.md).

---

## EXECUTIVE DECISION

### Current Status: APPROVED WITH CONDITIONS

**Gate G2 Verdict:** ✅ **APPROVED FOR PHASE 1 IMPLEMENTATION**

**Conditions Before Implementation Starts:**

1. ✅ Security architect reviews authentication-architecture.md
2. ✅ Crypto architect reviews vault-security-architecture.md
3. ✅ Database engineer reviews database-architecture.md
4. ✅ Landing page updated with honest security claims
5. ✅ All architecture documents reviewed and finalized

**Blocking Conditions (Must Resolve for G3):**

1. ❌ Security architect MUST approve authentication design
2. ❌ Crypto architect MUST approve Phase 1 + roadmap for encryption
3. ❌ Landing page MUST reflect actual Phase 1 capabilities

---

## 1. Architecture Review Summary

### 1.1 Documents Produced (G2 Deliverables)

✅ **Complete architecture documentation created:**

**System Architecture:**

- [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md)
  - High-level system design
  - Request/response flows
  - Security boundaries
  - Integration points
  - Scalability considerations

**Frontend Architecture:**

- [docs/architecture/frontend-architecture.md](docs/architecture/frontend-architecture.md)
  - React Router routing structure
  - Redux Toolkit state management (application state)
  - TanStack Query integration (server state)
  - CSS Modules migration strategy
  - Component organization
  - Testing architecture
  - Custom hooks and utilities

**Backend Architecture:**

- [docs/architecture/backend-architecture.md](docs/architecture/backend-architecture.md)
  - Express MVC structure
  - Controllers (HTTP only)
  - Services (business logic)
  - Repositories (data access)
  - Middleware stack
  - Error handling
  - Logging with pino
  - Validation with Joi

**Database Architecture:**

- [docs/database/database-architecture.md](docs/database/database-architecture.md)
  - MongoDB + Mongoose design
  - 7 collections (users, vaults, vaultitems, categories, activities, sessions, auditevents)
  - Schema design with indexes
  - Data relationships
  - Query patterns
  - Connection pooling
  - Backup/recovery strategy

**Authentication Architecture:**

- [docs/security/authentication-architecture.md](docs/security/authentication-architecture.md)
  - Registration/Login/Logout flows
  - G3 target: short-lived access token and server-tracked refresh session
  - Session revocation mechanism
  - Failed login attempt tracking
  - Account lockout (5 failures, 30 min)
  - G3 target: Secure, HttpOnly, SameSite cookies with CSRF protection
  - Rate limiting strategy
  - 2FA extensibility

**Vault Security Architecture:**

- [docs/security/vault-security-architecture.md](docs/security/vault-security-architecture.md)
  - Current prototype: HTTPS, bcrypt, rate limiting, and audit logging claims require source verification
  - G3 target: client-side AES-256-GCM encryption with Argon2id KEK and random VEK
  - Landing page must remain honest until G5 implementation is verified
  - Zero-knowledge is unsupported until implemented and audited
  - Key management strategy
  - Re-encryption on password change
  - Import/export encryption
  - Testing strategy

**Migration Strategy:**

- [docs/database/migration-strategy.md](docs/database/migration-strategy.md)
  - G4 migration readiness checklist
  - deterministic, checkpointed migration plan
  - Data transformation logic
  - Rollback procedures
  - Comprehensive testing strategy
  - Risk mitigation
  - Post-migration verification

**Assessment Documents:**

- [docs/engineering/baseline-assessment.md](docs/engineering/baseline-assessment.md) - Current state analysis
- [docs/engineering/ASSESSMENT_SUMMARY.md](docs/engineering/ASSESSMENT_SUMMARY.md) - Executive summary

---

### 1.2 Critical Issues Addressed

#### ✅ P0 Issue 1: False Encryption Claims

**Finding:** Landing page claims AES-256-GCM, Argon2id, zero-knowledge encryption - NONE IMPLEMENTED

**Solution:**

- Landing page MUST be updated immediately
- Keep current security claims limited to behavior verified in source and tests
- Add honest security roadmap
- G5: Implement the approved encrypted vault architecture
- G7: Independently audit the resulting security claims

**Status:** Documented in vault-security-architecture.md; implementation remains a G5 prerequisite

#### ✅ P0 Issue 2: Refresh Tokens in localStorage

**Finding:** localStorage stores refresh tokens (XSS vulnerable)

**Solution:**

- G3 target: move refresh sessions to Secure, HttpOnly, SameSite cookies
- Add mandatory refresh rotation, reuse detection, family revocation, logout,
  and CSRF protection during G5 implementation
- Document the current localStorage behavior as a P0 implementation blocker

**Status:** Documented in authentication-architecture.md; implementation is a G5 prerequisite

#### ✅ P0 Issue 3: Plaintext Password Storage

**Finding:** All passwords stored in plaintext in JSON files

**Solution:**

- Quarantine legacy plaintext during G4 planning
- Require owner-assisted client-side AES-256-GCM encryption before final item writes
- Keep the landing page claims unsupported until G5/G6/G7 verification

**Status:** Documented, timeline included

#### ✅ P0 Issue 4: Hardcoded JWT Secrets

**Finding:** JWT secrets have hardcoded fallback values

**Solution:**

- Require environment variables
- Fail startup if secrets missing
- Never use hardcoded defaults
- .env.example with dummy values only

**Status:** Documented in environment-architecture (within authentication doc)

#### ✅ P0 Issue 5: No Session Revocation

**Finding:** Cannot revoke tokens; logout is client-side only

**Solution:**

- Implement SessionToken collection
- Revoke on logout
- Revoke all on password change
- Implement failed attempt tracking
- Implement account lockout

**Status:** Fully documented in authentication-architecture.md

---

### 1.3 Architecture Alignment with Target Stack

| Component          | Target                                                         | Designed     | Status                         |
| ------------------ | -------------------------------------------------------------- | ------------ | ------------------------------ |
| **Frontend**       | React 19 + React Router + Redux + TanStack Query + CSS Modules | ✅ Yes       | ✅ Ready                       |
| **Backend**        | Express + TypeScript + MVC                                     | ✅ Yes       | ✅ Ready                       |
| **Database**       | MongoDB + Mongoose                                             | ✅ Yes       | ✅ Ready                       |
| **Authentication** | JWT + server-tracked sessions                                  | ✅ Target    | ⏳ G5 implementation           |
| **Encryption**     | G3 target AES-256-GCM with Argon2id KEK and random VEK          | ✅ Target    | ⏳ G5 implementation           |
| **API**            | REST + Swagger/OpenAPI                                         | ✅ Partially | ⏳ Phase 7                     |
| **Testing**        | Vitest + RTL + Supertest + Playwright                          | ✅ Strategy  | ⏳ Phase 7                     |
| **Logging**        | pino (structured)                                              | ✅ Yes       | ✅ Ready                       |
| **AI**             | Provider abstraction skeleton                                  | ✅ Yes       | ⏳ Phase 8                     |

**Alignment:** ~85% of target architecture designed and ready

---

## 2. Key Architectural Decisions

### 2.1 Frontend State Management

**Decision:** Redux Toolkit (app state) + TanStack Query (server state)

**Rationale:**

- Clear separation of concerns
- Redux for: auth, ui, theme, filters
- TanStack Query for: passwords, categories, activities
- Proven patterns, good DevTools support
- Scales well with feature growth

**Alternatives Considered:**

- Zustand (too simple for scale)
- Context API (insufficient for scale)
- Apollo Client (not REST-focused)

**Risk:** Low (well-established patterns)

---

### 2.2 Backend Architecture

**Decision:** Simple MVC with clear layer boundaries

```
Router → Controller → Service → Repository → Model → MongoDB
```

**Constraints:**

- Controllers: HTTP only (<40 lines)
- Services: Business logic + validation
- Repositories: Data access abstraction
- Models: Schema + validation

**Rationale:**

- Simple to understand
- Easy to test each layer
- Matches Express conventions
- Scales to moderate complexity
- Clear error handling

**Alternatives Considered:**

- CQRS (too complex for Phase 1)
- Microservices (too premature)
- N-tier (similar, but more verbose)

**Risk:** Low (proven pattern)

---

### 2.3 Database: MongoDB + Mongoose

**Decision:** MongoDB with 7 collections, Mongoose for modeling

**Schema Design:**

- users (accounts)
- vaults (containers)
- vaultitems (passwords)
- categories (user-defined)
- activities (audit trail)
- sessions (revocation support)
- auditevents (security events)

**Rationale:**

- Document model fits password manager
- Flexible schema for future features
- Transactions support (multi-document)
- Mongoose maturity and type safety
- MongoDB Atlas for managed hosting

**Alternatives Considered:**

- PostgreSQL (too relational for flexible schema)
- Prisma (unnecessary abstraction over Mongoose)
- Redis (not suitable for persistence)

**Risk:** Low (Mongoose is mature, MongoDB Atlas is reliable)

---

### 2.4 Authentication Architecture

**Decision:** JWT-based with SessionToken revocation collection

**Flow:**

- Register: Create user + default vault
- Login: Verify password, generate tokens, create session
- Refresh: Verify refresh token, generate new access token
- Logout: Revoke session
- Lockout: Track failed attempts, lock after 5 failures × 30 min

**Rationale:**

- JWT is stateless, scales well
- SessionToken allows revocation (fixes current issue)
- Rate limiting prevents brute force
- Account lockout prevents dictionary attacks

**Phase 3 Improvement:**

- Move from localStorage to HttpOnly cookies
- Add CSRF protection
- Better XSS protection

**Risk:** Medium (security-sensitive, requires specialist review)

---

### 2.5 Encryption Strategy (Phase 1 vs. Phase 2+)

> Historical G2 proposal. Superseded by the approved G3 baseline and retained
> only to explain the original architecture decision.

**Historical decision:** Phase 1 - Honest model (passwords plaintext on server), Phase 2+ - Client-side encryption

**Phase 1 Reality:**

- Passwords stored plaintext on server
- HTTPS/TLS protects in transit
- Server-side rate limiting + audit logging
- Not zero-knowledge (server has access)
- Landing page MUST reflect this honestly

**Historical Phase 2+ Roadmap:**

- Client-side AES-256-GCM encryption
- Argon2id key derivation
- Vault key never leaves browser
- Re-encryption on password change
- True zero-knowledge architecture

**Historical Rationale:**

- Phase 1: Get MVP working, documented security model
- Phase 2: Implement encryption without rushing/mistakes
- Phase 3: Polish and advanced features

**Risk:** High (encryption is security-critical, requires specialist review)
**Mitigation:** Security architect must approve Phase 1 + Phase 2 roadmap

---

### 2.6 CSS Modules Migration Strategy (Tailwind → CSS Modules)

**Decision:** Component-by-component conversion with visual regression testing

**Strategy:**

1. Capture baseline screenshots (current Tailwind app)
2. Convert PasswordCard to CSS Modules
3. Compare pixel-by-pixel screenshots
4. Fix visual regressions
5. Repeat for all 18 components
6. Test responsive (5 sizes) and theme (light/dark)

**Rationale:**

- Preserves current visual design
- No accidental UI changes
- Each component testable in isolation
- Visual regression automation prevents regressions

**Risk:** Low (visual validation catches issues)

---

### 2.7 Testing Strategy

**Decision:** Multi-level testing: Unit → Integration → E2E → Security → Visual

**Test Coverage:**

- Unit: Services, utilities, validators (>90% coverage)
- Integration: APIs, authorization, database queries
- E2E: User workflows (login, password CRUD, logout)
- Security: IDOR, authentication bypass, XSS, CSRF
- Visual: Screenshot regression on 5 device sizes

**Rationale:**

- Comprehensive coverage prevents regressions
- Security tests catch auth/data access bugs
- Visual tests prevent UI regressions

**Risk:** Low (standard industry practice)

---

## 3. Risk Summary & Mitigation

### Critical Risks (Must Address)

#### Risk: Data Loss in Migration

- Probability: Low
- Impact: CRITICAL
- Mitigation: Backup, dry-run, verification, rollback procedure
- Testing: Transformation logic tests
- Status: ✅ Documented

#### Risk: Security Vulnerabilities (IDOR, XSS, CSRF)

- Probability: Medium
- Impact: CRITICAL
- Mitigation: Security tests, penetration testing, code review
- Testing: Security test suite
- Status: ✅ Documented, needs security audit

#### Risk: False Encryption Claims (P0)

- Probability: CERTAIN (exists now)
- Impact: CRITICAL (liability, user trust)
- Mitigation: Update landing page IMMEDIATELY
- Testing: Manual review
- Status: ✅ Documented, MANDATORY before launch

#### Risk: Performance Regression

- Probability: Low
- Impact: HIGH
- Mitigation: Load testing, index optimization, monitoring
- Testing: Performance benchmarks
- Status: ✅ Documented

---

### Medium Risks (Should Address)

- Visual regressions: Playwright screenshot testing
- API contract breaks: Swagger validation
- Environment variable missing: Validation at startup
- Database connection pool exhaustion: Proper configuration
- Timeout on long operations: Configurable timeouts

---

## 4. Approval & Review Gates

### This Gate (G2): Architecture Review ✅

**Completed:**

- [x] Current state analyzed (baseline-assessment.md)
- [x] Target architecture designed (all docs)
- [x] Gaps identified and addressed
- [x] Risks documented (migration-strategy.md)
- [x] Migration plan created
- [x] P0 issues addressed with solutions

**Required Before Proceeding:**

- [ ] Engineering lead approves architecture
- [ ] Database engineer reviews database-architecture.md
- [ ] Security/crypto architect schedules G3 review

---

### Historical G3 Gate Record: Security/Crypto Review

**Scope:**

- Authentication design security
- Vault encryption Phase 1 + roadmap
- Key management strategy
- Session revocation mechanism
- Account lockout parameters
- JWT token lifetimes
- Landing page honesty

**Owner:** security-crypto-architect

**Timeline:** Completed and synchronized in `docs/security/g3-authoritative-baseline.md`

**Completed G3 outcome:**

- [x] Authentication target architecture approved with conditions
- [x] G3 vault encryption target approved with conditions
- [x] Unsupported current security claims documented
- [x] G4 database and migration planning opened as the next gate

---

### Gate G4: Database Architecture + JSON-to-Mongo Migration Planning

**Planning:** After G3 approval; implementation begins at G5

**Phases:**

- G4: schemas, ownership, indexes, migration, backup, rollback
- G5: implementation
- G6: QA
- G7: independent security audit
- G8: visual regression
- G9: code review
- G10: release readiness

**Approval Process:** Each phase has acceptance criteria and verification

---

## 5. Decisions Requiring Specialist Approval

### Security/Crypto Architect Must Approve:

1. **Authentication Model**
   - JWT + SessionToken for revocation
   - Token lifetimes (15min access, 7day refresh)
   - Account lockout (5 failures × 30min)
   - Password hashing (bcrypt 10 rounds)

2. **Phase 1 Encryption Model**
   - Passwords stored plaintext (documented risk)
   - HTTPS/TLS in transit
   - Audit logging for accountability
   - No false claims on landing page

3. **Phase 2+ Encryption Roadmap**
   - AES-256-GCM for password encryption
   - Argon2id for key derivation
   - Client-side encryption architecture
   - Zero-knowledge model (Phase 3+)

4. **Key Management**
   - Vault key storage (memory only, not persistent)
   - Vault key lifetime (session only)
   - Master password handling
   - Key rotation strategy

5. **Landing Page**
   - Remove ALL false encryption claims
   - Document actual Phase 1 capabilities
   - Show roadmap to Phase 2/3
   - Be transparent about current limitations

---

### Database Engineer Must Approve:

1. **MongoDB Schema Design**
   - 7 collections and relationships
   - Indexes and performance
   - TTL indexes for auto-cleanup
   - Soft-delete strategy

2. **Migration Plan**
   - JSON → MongoDB transformation
   - Data validation
   - Rollback procedure
   - Testing strategy

3. **Backup/Recovery**
   - MongoDB Atlas snapshots
   - Restoration procedures
   - RTO/RPO targets
   - Disaster recovery plan

---

### Product/UX Must Approve:

1. **UI/UX Impact**
   - CSS Modules migration maintains visual design
   - No accidental redesign
   - Responsive design still works
   - Dark/light mode still works
   - Performance improvements are transparent

2. **Feature Scope**
   - Phase 1 retains all current features
   - No feature removal
   - Better performance expected
   - Security improvements transparent

---

## 6. Implementation Prerequisites

### Must Complete Before Phase 1 Implementation:

1. ✅ All architecture documents reviewed and finalized
2. ✅ G2 Architecture Gate approved (this document)
3. ⏳ G3 Security/Crypto Gate scheduled and completed
4. ⏳ Database schema finalized and approved
5. ⏳ Landing page updated with honest security claims
6. ⏳ Environment variable validation implemented
7. ⏳ Test suite structure created
8. ⏳ CI/CD pipeline updated for new stack
9. ⏳ Monitoring/observability configured
10. ⏳ Team trained on new architecture

---

## 7. Success Criteria

### Architecture Review Success (This Gate)

- [x] All architecture documents complete (11 docs)
- [x] Current state vs. target gap analysis done
- [x] P0 issues documented with solutions
- [x] Risk register created
- [x] Migration strategy documented
- [x] No unresolved architectural questions
- [x] Ready for specialist review

### Implementation Success (Phase 1-10)

- [ ] All 10 phases completed on schedule
- [ ] Zero unplanned security incidents
- [ ] Zero data loss
- [ ] Performance improvements documented
- [ ] User feedback positive
- [ ] All tests passing
- [ ] Production deployment successful

---

## 8. Next Steps

### Immediate (Next 2 Days)

1. [ ] Architecture documents reviewed by engineering team
2. [ ] Any questions/comments collected
3. [ ] Documents finalized based on feedback
4. [ ] G3 security review scheduled

### This Week

1. [ ] Security/Crypto architect reviews authentication + encryption docs
2. [ ] Database engineer reviews database + migration docs
3. [ ] Product reviews for UX impact
4. [ ] G3 gate approval meeting

### Next Week (Pending G3 Approval)

1. [ ] Kick-off meeting for Phase 0 (Foundation)
2. [ ] Task breakdown and team assignment
3. [ ] Development environment setup
4. [ ] Begin Phase 0 implementation

---

## 9. Architecture Decision Records (ADRs)

ADRs created for major decisions (to be filed under docs/decisions/):

1. ADR-001: MongoDB + Mongoose (vs. PostgreSQL)
2. ADR-002: Redux Toolkit + TanStack Query (state management)
3. ADR-003: React Router v6 (routing)
4. ADR-004: JWT + SessionToken (auth model)
5. ADR-005: CSS Modules (styling)
6. ADR-006: AES-256-GCM (G3 target)
7. ADR-007: Client-side encryption (G3 target)
8. ADR-008: Mongoose vs. Prisma (ORM choice)
9. ADR-009: HttpOnly cookies (G3 target, G5 implementation)
10. ADR-010: Visual regression testing (CSS migration)

_(ADR files to be created post-G2 approval)_

---

## 10. Conclusion

### Architecture Status: ✅ **READY FOR IMPLEMENTATION**

**Verdict:**
VaultGuard's target architecture is **sound, practical, and achievable**. The design:

- ✅ Addresses all P0 security issues with documented solutions
- ✅ Aligns 85%+ with target technology stack
- ✅ Includes comprehensive security and encryption roadmap
- ✅ Provides clear migration path with rollback procedures
- ✅ Scales to Phase 2-10 enhancements
- ✅ Maintains existing UI/UX while improving foundation

**Critical Path Forward:**

1. ✅ G2 Architecture Gate: **APPROVED** (this document)
2. ✅ G3 Security/Crypto Gate: **APPROVED WITH CONDITIONS**
3. ⏳ G4 Database Architecture + JSON-to-Mongo Migration Planning

**Key Blocking Issues:**

- ❌ Source implementation still requires G5 security architecture implementation
- ❌ Database engineer must complete G4 migration planning and approval

**Timeline Estimate:**

- Foundation: 1-2 weeks
- Core implementation: 10-14 weeks
- Full completion: 20-32 weeks (~5-8 months)

**Recommendation:**
**PROCEED to G4 planning**. G5 implementation remains blocked until the G3 conditions are implemented and verified.

---

## 11. Document Index

**Baseline & Summary:**

- [baseline-assessment.md](../engineering/baseline-assessment.md) - Current state analysis
- [ASSESSMENT_SUMMARY.md](../engineering/ASSESSMENT_SUMMARY.md) - Executive summary
- [migration-roadmap.md](../engineering/migration-roadmap.md) - 10-phase plan

**Architecture Design:**

- [system-architecture.md](../architecture/system-architecture.md) - System overview
- [frontend-architecture.md](../architecture/frontend-architecture.md) - React + Redux + Query
- [backend-architecture.md](../architecture/backend-architecture.md) - Express + MVC
- [database-architecture.md](../database/database-architecture.md) - MongoDB + 7 collections

**Security & Encryption:**

- [authentication-architecture.md](../security/authentication-architecture.md) - Auth model + sessions
- [vault-security-architecture.md](../security/vault-security-architecture.md) - Encryption roadmap

**Implementation:**

- [migration-strategy.md](../database/migration-strategy.md) - Detailed migration plan + risk register

**This Document:**

- architecture-gate.md - **G2 Architecture Gate Decision**

---

**Gate G2 Status: ✅ APPROVED WITH CONDITIONS**

**Decision Date:** 2026-09-09  
**Approved By:** Engineering Lead  
**Next Review:** G4 Database Architecture + JSON-to-Mongo Migration Planning
**Blocking Issues:** G4 migration plan approval and G3 implementation prerequisites

---

_End of G2 Architecture Gate Decision Document_
