# G4 Migration and Database Test Strategy

**Gate:** G4 planning; execution begins at G6 QA

No tests are implemented by this document. It defines evidence required before
G6 approval and the security review input for G7.

## Database Tests

- Mongoose required fields, enums, immutable IDs, timestamp behavior, and
  default values.
- Normalized email uniqueness and duplicate rejection.
- Active category-name uniqueness within one vault, including deleted-name
  behavior.
- Multiple credentials for the same host are accepted.
- No plaintext secret fields are present in final schema or serialized output.
- Sensitive projections exclude verifiers, token hashes, TOTP envelopes, and
  recovery hashes by default.
- Cross-user and cross-vault IDOR attempts return indistinguishable not-found
  behavior.
- Revision compare-and-set rejects stale writes.
- Session TTL is cleanup only; expired sessions are rejected by service logic.
- Soft-delete, restore, and permanent-delete retention rules.

## Migration Tests

1. Happy-path fixture generated from the actual legacy field shapes.
2. Empty and missing JSON files.
3. Invalid JSON, invalid record types, missing IDs, invalid timestamps, and
   unsupported fields.
4. Duplicate user IDs, normalized emails, categories, items, and activities.
5. Orphan passwords, categories, and activities.
6. Conflicting revisions and conflicting legacy IDs.
7. Dry-run produces a manifest without target writes.
8. Resume from every checkpoint without duplicate target records.
9. Repeat execution is idempotent for the same migration ID and source
   manifest.
10. Verification failure blocks activation and preserves quarantine.
11. Backup mismatch blocks migration.
12. Migration-scoped rollback restores the prior active target and preserves
    failed artifacts.
13. Owner available flow encrypts legacy records in the browser and verifies
    envelopes.
14. Owner unavailable, browser close, network failure, and encryption failure
    leave records quarantined, never falsely encrypted.

## Security Tests

- Plaintext secret absence scan across final collections, logs, audit events,
  responses, indexes, and error objects.
- Raw refresh-token absence and atomic rotation under concurrent requests.
- Refresh reuse revokes the complete token family.
- Password change revokes all sessions.
- CSRF rejection for state-changing cookie requests.
- Envelope version, key ID, AAD, nonce, tag, and tamper validation.
- Import payload size limit, parser correctness, malicious CSV values, and
  atomic failure behavior.
- No default passwords for missing import values.
- 2FA enrollment, challenge, recovery-code one-time use, disable, reset, and
  rate limiting.
- XSS payloads in imported titles, labels, URLs, category names, and activity
  fields do not execute or reach unsafe HTML/rendering paths.
- CSP headers and expected script/source restrictions are present in the
  applicable browser test environment.
- Dependency and script loading review identifies unexpected executable or
  remote script paths.
- Browser storage contains no access token, refresh token, KEK, VEK, vault
  master password, or plaintext vault secret.
- Clipboard exposure is bounded by the configured clear policy and logout or
  auto-lock cleanup does not leave sensitive clipboard state unmanaged.

## Performance and Operational Tests

- Representative query plans use only approved indexes.
- Migration throughput and checkpoint recovery are measured on staging-size
  fixtures without logging secrets.
- Session-family revocation remains bounded and atomic.
- Import/export size and timeout limits are enforced.
- Backup restore and manifest verification are rehearsed.

Proposed, not-yet-passed acceptance targets are recorded in
`docs/database/migration-strategy.md`: P95 vault reads <= 250 ms, indexed item
lists <= 300 ms, item writes <= 350 ms excluding client encryption, account
authentication <= 1,500 ms, and refresh rotation <= 250 ms under representative
staging conditions. Import and migration throughput, timeout rate, and
client-side encryption/decryption must be benchmarked rather than assigned an
unverified guarantee.

## Evidence Required for G6

Test report, fixture manifest, migration dry-run output, index validation,
ownership negative tests, plaintext scan, rollback rehearsal, and unresolved
failure list. Any P0 failure blocks G6 and downstream release gates.
