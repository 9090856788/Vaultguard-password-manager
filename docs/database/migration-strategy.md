# Migration Risk Register & Strategy

**Date:** September 2026  
**Gate:** G2 - Architecture Review  
**Focus:** Risk identification, mitigation, and implementation strategy

---

## 1. Risk Register

### 1.1 P0 - Critical Risks (Must Mitigate)

#### Risk P0.1: Data Loss During Migration

**Description:** JSON data not successfully migrated to MongoDB

**Likelihood:** Low (but high impact)  
**Impact:** Complete data loss, business-critical  
**Detection:** Verification scripts fail, record counts don't match

**Mitigation:**

- Backup current JSON files to external storage
- Run dry-run migration first
- Verify all records migrated
- Compare record counts before/after
- Spot-check sample data
- Keep rollback procedure documented

**Rollback:**

- Delete from MongoDB
- Restore from backup
- Resume investigation

**Testing:**

- Unit tests for JSON → MongoDB transformation
- Integration tests with sample data
- Dry-run migration on test database

---

#### Risk P0.2: Authentication Regression

**Description:** Users cannot log in after migration

**Likelihood:** Low  
**Impact:** Complete service outage  
**Detection:** Failed login attempts spike

**Mitigation:**

- Test all authentication flows before cutover
- Keep JWT secrets consistent
- Test password verification with bcrypt
- Test token generation/verification
- Test session management
- Plan for quick rollback

**Rollback:**

- Revert to old JWT configuration
- Clear sessions collection
- Restart backend

**Testing:**

- Integration tests for login/logout
- Integration tests for token refresh
- Security tests for failed password handling

---

#### Risk P0.3: Unauthorized Data Access (IDOR)

**Description:** Users can access other users' passwords

**Likelihood:** Medium (architecture change risk)  
**Impact:** Complete security breach  
**Detection:** Security audit, penetration test

**Mitigation:**

- Implement ownership checks in every query
- Every query must verify: does userId own this resource?
- Write authorization tests
- Penetration test all APIs
- Manual security audit before production

**Rollback:**

- Emergency access restrictions
- Security audit
- Customer notification

**Testing:**

- Security unit tests for ownership checks
- Security integration tests (attempt unauthorized access)
- Penetration testing by security team

---

#### Risk P0.4: Secret Leakage in Code/Logs

**Description:** JWT secrets or API keys accidentally committed

**Likelihood:** Medium  
**Impact:** Complete authentication compromise  
**Detection:** Code review, secret scanning, logs analysis

**Mitigation:**

- ALL secrets must come from environment variables
- NEVER hardcode secrets
- Use .env.example with dummy values only
- Add pre-commit hook to scan for secrets
- Review all logs to ensure no secrets logged
- Require environment variable validation

**Rollback:**

- Rotate all secrets
- Audit logs for leakage
- Customer notification

**Testing:**

- Check env.ts loads from environment
- Fail if JWT_SECRET not set
- Check logs don't contain passwords/tokens
- Audit .env.example (dummy values only)

---

### 1.2 P1 - High Priority Risks

#### Risk P1.1: Performance Degradation

**Description:** Queries slower on MongoDB than JSON

**Likelihood:** Low  
**Impact:** User experience suffers, potential outage  
**Detection:** Performance testing, production monitoring

**Mitigation:**

- Create indexes BEFORE migration
- Load test with production-scale data
- Monitor query times in staging
- Have query optimization ready
- Set performance SLOs (e.g., <100ms per query)

**Rollback:**

- Revert to JSON storage
- Optimize queries
- Retry

**Testing:**

- Performance benchmarks: JSON vs MongoDB
- Load test with >10k passwords
- Monitor index usage

---

#### Risk P1.2: XSS Vulnerability in UI

**Description:** User input not properly sanitized, XSS attack possible

**Likelihood:** Low  
**Impact:** Session hijacking, data theft  
**Detection:** Security scanning, penetration test

**Mitigation:**

- Use React (built-in XSS protection)
- Never use dangerouslySetInnerHTML
- Sanitize file imports
- Content Security Policy (CSP) headers
- Security audit before production

**Rollback:**

- Apply security patch
- Customer notification if needed

**Testing:**

- Security tests for XSS payloads
- CSP header validation
- Penetration testing

---

#### Risk P1.3: CSRF Attack in API

**Description:** Cross-site request forgery allows state-changing operations

**Likelihood:** Low (if using SameSite cookies)  
**Impact:** Unauthorized password changes, data modifications  
**Detection:** Security audit, penetration test

**Mitigation:**

- Use HttpOnly + SameSite=Strict cookies (Phase 3)
- Alternative: CSRF tokens for state-changing operations
- Validate Referer header (fallback)
- Content-Type validation

**Rollback:**

- Add CSRF protection
- Customer notification

**Testing:**

- CSRF attack simulations
- SameSite cookie validation

---

### 1.3 P2 - Medium Priority Risks

| Risk      | Description                        | Mitigation                               | Detection               |
| --------- | ---------------------------------- | ---------------------------------------- | ----------------------- |
| **P2.1**  | Visual regressions (CSS migration) | Take screenshots, compare pixel-by-pixel | Playwright visual tests |
| **P2.2**  | Responsive design breaks           | Test on 5 device sizes                   | Mobile device testing   |
| **P2.3**  | Dark mode broken                   | Test light/dark toggling                 | Theme preference tests  |
| **P2.4**  | API contract breaks                | Swagger/OpenAPI validation               | API integration tests   |
| **P2.5**  | Missing error handling             | Test all error paths                     | Error scenario tests    |
| **P2.6**  | Rate limiting too aggressive       | Monitor false positives                  | Load testing            |
| **P2.7**  | Database connection pooling issues | Configure pool size correctly            | Connection stress tests |
| **P2.8**  | Long-running imports fail          | Timeout handling                         | Stress testing          |
| **P2.9**  | Email integrations break           | Mock email service                       | Email service tests     |
| **P2.10** | Observable metrics missing         | Add structured logging                   | Production monitoring   |

---

### 1.4 P3 - Low Priority Risks

| Risk     | Description                  | Mitigation            | Detection            |
| -------- | ---------------------------- | --------------------- | -------------------- |
| **P3.1** | Code inconsistencies         | Code review standards | Code review          |
| **P3.2** | Missing documentation        | Doc generation        | Doc validation       |
| **P3.3** | Performance edge cases       | Optimize slow queries | Monitoring           |
| **P3.4** | Rare race conditions         | Concurrent testing    | Load testing         |
| **P3.5** | Mobile browser compatibility | Cross-browser testing | Browser matrix tests |

---

## 2. Migration Strategy

### 2.1 Pre-Migration Checklist

**1 Week Before Migration:**

- [ ] All code reviewed and approved
- [ ] All tests passing
- [ ] Staging environment matches production
- [ ] Backup strategy verified
- [ ] Rollback procedure documented
- [ ] On-call team briefed
- [ ] Communication plan ready

**2 Days Before:**

- [ ] Database backup taken
- [ ] JSON files backed up to external storage
- [ ] Dry-run migration successful
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Monitoring/alerting configured

**Day Before:**

- [ ] Final code review
- [ ] All tests green
- [ ] Team ready
- [ ] Rollback plan reviewed

---

### 2.2 Migration Phases

#### Phase 1: Preparation (2-3 days before)

```bash
# 1. Backup current data
cp -r .vault_data .vault_data.backup.$(date +%Y%m%d)
tar czf vault_data_backup.tar.gz .vault_data.backup.*

# 2. Backup to external storage
aws s3 cp vault_data_backup.tar.gz s3://vaultguard-backups/

# 3. Verify backup
aws s3 ls s3://vaultguard-backups/
```

#### Phase 2: Dry-Run (1-2 days before)

```bash
# 1. Start test database
docker run -d -p 27017:27017 mongo:latest --name test-mongo

# 2. Run migration script on test data
NODE_ENV=development npx ts-node src/api/migrations/001-json-to-mongodb.ts

# 3. Verify all data migrated
npm run verify-migration

# 4. Test all APIs against migrated data
npm run test:integration

# 5. Load testing
npm run test:load --users=100

# 6. Cleanup test database
docker stop test-mongo && docker rm test-mongo
```

#### Phase 3: Production Cutover (Execution)

**Timeline: Scheduled for low-traffic window (e.g., 2 AM UTC)**

```
T-0 (Start):
├─ Alert on-call team
├─ Take MongoDB snapshot
├─ Stop accepting writes (read-only mode)
└─ Confirm backup complete

T+5min (Migrate):
├─ Run migration script
├─ Verify record counts
├─ Spot-check sample data
└─ Confirm zero errors

T+15min (Verify):
├─ Run automated verification
├─ Manual spot-check
├─ Test all API endpoints
└─ Confirm API responses

T+30min (Resume):
├─ Resume accepting writes
├─ Monitor error rates
├─ Monitor query performance
└─ Monitor CPU/memory usage

T+1hr (Rollback decision point):
├─ If issues: ROLLBACK immediately
├─ If no issues: COMMIT and monitor
└─ Team stays on-call for 4 hours

T+4hrs (Safe point):
├─ No rollback possible (data divergence)
├─ If issues: Fix forward only
└─ Team returns to normal
```

#### Phase 4: Monitoring (Post-Migration)

**First 24 hours:**

- Error rates < 0.1%
- Query performance < 200ms P99
- No authentication failures
- No data inconsistencies

**First week:**

- User reports zero data loss
- No security incidents
- Performance stable
- Monitoring alerts working

---

### 2.3 Rollback Procedure

**Decision Criteria:** Rollback if

- Error rate > 1%
- Authentication failing
- Data corruption detected
- Security incident
- Performance unacceptable

**Rollback Steps:**

```bash
# 1. Stop accepting writes
# (Nginx: return 503 Service Unavailable)

# 2. Restore from MongoDB snapshot
# (MongoDB Atlas: restore from snapshot)

# 3. Restart backend services
npm run build
npm start

# 4. Verify JSON data still accessible
# (Keep JSON files as fallback)

# 5. Notify team of rollback
# Slack: "Rolled back to JSON, investigating issue"

# 6. Investigate root cause
# Review logs, queries, code changes

# 7. Fix issue
# Update migration script or code

# 8. Retry migration after fix
```

---

### 2.4 Testing Plan

**Unit Tests (Code Coverage: >90%)**

```bash
npm run test:unit

# Covers:
✓ JSON → MongoDB transformation
✓ Data validation
✓ Schema compliance
✓ Index creation
✓ Query construction
```

**Integration Tests (Test all APIs)**

```bash
npm run test:integration

# Covers:
✓ Login/logout with migrated data
✓ Password CRUD operations
✓ Vault operations
✓ Authorization checks
✓ Activity logging
✓ Error scenarios
```

**Load Tests (Simulate production)**

```bash
npm run test:load

# Simulate:
✓ 100 concurrent users
✓ 1000 passwords per vault
✓ Complex queries
✓ Peak traffic patterns
```

**Security Tests**

```bash
npm run test:security

# Test:
✓ IDOR (can't access other users' data)
✓ Authentication bypass
✓ SQL injection (N/A for MongoDB)
✓ XSS vulnerabilities
✓ CSRF protection
```

**Visual Tests (CSS regression)**

```bash
npm run test:visual

# Test:
✓ All pages render correctly
✓ Dark/light mode
✓ Responsive design (5 sizes)
✓ Interactive states
```

---

## 3. Deployment Checklist

### Pre-Deployment (2 weeks before)

- [ ] All architecture design documents reviewed
- [ ] Security audit completed
- [ ] Code review completed
- [ ] All tests passing (unit, integration, load, security)
- [ ] Staging environment verified
- [ ] Backup strategy tested
- [ ] Rollback procedure tested
- [ ] On-call team trained
- [ ] Monitoring/alerting configured
- [ ] Customer communication plan ready

### Deployment Day

- [ ] Team assembled (engineering lead, database engineer, security engineer)
- [ ] Backups verified
- [ ] Dry-run completed successfully
- [ ] Rollback procedure reviewed
- [ ] Communication channel open (#vaultguard-migration Slack)
- [ ] Monitoring dashboards active
- [ ] Start migration at low-traffic time

### Post-Deployment (4 hours)

- [ ] Error rates < 0.1%
- [ ] All APIs responding
- [ ] No data anomalies
- [ ] Performance acceptable
- [ ] Team debrief
- [ ] Issue log created
- [ ] Lessons learned documented

---

## 4. Communication Plan

### User-Facing Communications

**Before Migration (1 week)**

```
Subject: VaultGuard Maintenance - [Date] [Time] UTC

Hi [User],

We're excited to announce that VaultGuard is upgrading to a new,
more powerful database infrastructure on [DATE] at [TIME] UTC.

What to expect:
- Brief downtime (estimated 30 minutes)
- No data will be lost
- Faster performance after upgrade
- Same familiar interface

We apologize for any inconvenience. Thank you for using VaultGuard!

The Team
```

**During Migration**

```
VaultGuard is currently undergoing scheduled maintenance.
We expect to be back online shortly.

Thank you for your patience!
```

**After Migration**

```
Thank you for your patience! VaultGuard is now back online with
improved performance and reliability.

If you experience any issues, please contact support@vaultguard.app
```

### Internal Communications

**Pre-Migration (1 week before)**

- Engineering all-hands: Architecture and plan overview
- On-call team: Detailed migration walkthrough
- Support team: FAQ for customer questions

**Day Before**

- Final sync with all teams
- Confirm everyone understands role
- Test communication channels

**During Migration**

- Slack channel: Real-time updates
- Status page: Public-facing status
- Every 5 minutes: Status update

**After Migration**

- Post-mortem (if issues)
- Lessons learned
- Documentation update

---

## 5. Success Criteria

### Functional Success

- [x] All 90+ existing tests pass
- [x] Zero data loss (record counts match)
- [x] All APIs functioning
- [x] Authentication working
- [x] All passwords accessible
- [x] Activity logging working
- [x] Authorization (IDOR prevention) working

### Performance Success

- [x] Query latency < 100ms P50
- [x] Query latency < 200ms P99
- [x] API response time < 500ms P99
- [x] No timeout errors
- [x] Memory usage stable
- [x] CPU usage < 70%

### Reliability Success

- [x] Error rate < 0.1%
- [x] No unhandled exceptions
- [x] Graceful error handling
- [x] Alerts functioning
- [x] Logs complete and searchable

### Security Success

- [x] No unauthorized data access (IDOR)
- [x] Authentication secure
- [x] No secrets in logs/code
- [x] No XSS vulnerabilities
- [x] No CSRF vulnerabilities
- [x] Security audit passed

---

## 6. Contingency Plans

### If Migration Fails Catastrophically

```
1. Immediate: Rollback to JSON storage
2. Restore database from snapshot
3. Alert all users of temporary downtime
4. Communicate issue transparently
5. Root cause analysis
6. Fix identified issues
7. Schedule retry migration with fixes
8. Re-test extensively
```

### If Performance Degrades After Migration

```
1. Monitor query performance
2. Identify slow queries
3. Add missing indexes
4. Optimize queries
5. Load test improvements
6. Deploy optimized queries
```

### If Security Issues Discovered

```
1. Immediate: Isolate affected systems
2. Investigate scope of compromise
3. Notify affected users
4. Implement security patch
5. Verify fix with security audit
6. Deploy patch
7. Communicate with users
```

---

## Next Steps (Architecture Review)

1. ✅ Risk register created
2. ✅ Migration strategy documented
3. ⏳ Final architecture-gate.md decision document

**Important:** This risk register and strategy will be reviewed and updated based on feedback during architecture review process.
