# G3 Security Review

Status: REMEDIATION REQUIRED — not approved for production implementation

## Scope

Review the G2 architecture against the current VaultGuard implementation and the target production architecture.

## Findings

### P0-01 Plaintext vault credentials
Current password records are persisted with plaintext `password` values. This is incompatible with a production password manager and blocks production release.

**Required:** encrypt vault secrets before persistence using the approved client-side vault key architecture.

### P0-02 False security claims
Current activity/product wording contains claims such as zero-knowledge account creation and encrypted exports that do not match implementation.

**Required:** apply `security-claims-policy.md` and remove/replace misleading claims.

### P0-03 Authentication transport inconsistency
The target architecture recommends secure HttpOnly cookies, but the implementation returns access and refresh tokens in JSON and consumes refresh tokens from request bodies.

**Required:** choose and document one production transport. Target: Secure/HttpOnly/SameSite cookies with server-side session records.

### P0-04 Refresh token design defect
The proposed refresh-session comparison contains an incorrect boolean/string comparison and session lookup is not sufficiently specific for robust multi-session rotation/reuse detection.

**Required:** hash/identify the presented refresh token, locate the exact active session, rotate the token on refresh, invalidate the old token, detect reuse, and revoke the session family as required.

### P0-05 Weak JWT policy
Current access-token lifetime is 24 hours and verification does not fully constrain algorithm, issuer, audience and token type.

**Required:** reduce access lifetime to the approved value and implement explicit JWT validation rules.

### P0-06 Hard-coded JWT fallback secrets
The application can fall back to hard-coded JWT secrets.

**Required:** fail startup when required production secrets are missing or invalid.

## P1 findings

- Authentication password and vault key derivation are conflated; introduce separate cryptographic purposes.
- Argon2id salt must be random per account, never derived from user ID.
- Define a versioned encryption envelope.
- Master-password change must safely re-wrap the VEK and update authentication state.
- Current 2FA toggle is not a real 2FA security control.
- Authentication needs account-level failure tracking and temporary lockout/progressive delay.
- Plaintext CSV export must be explicit and honestly named; encrypted backup needs a separate design.
- CSV import needs a real parser and must never use a fallback password.
- Browser crypto material must not be persisted in Redux/localStorage/sessionStorage.
- Audit messages must never reveal secrets or claim unavailable capabilities.
- `{host,vaultId}` uniqueness is too restrictive for multiple credentials per site.

## Approved target key hierarchy

Master Password
  -> Argon2id + random account salt
  -> KEK
  -> unwrap VEK
  -> AES-256-GCM encrypt/decrypt vault items
  -> persist ciphertext only

## G3 exit criteria

G3 passes only when:

1. Security claims policy is accepted.
2. Authentication/session design is internally consistent.
3. Refresh rotation and reuse detection are specified.
4. Secret configuration policy is explicit.
5. Vault key hierarchy is approved by security/crypto review.
6. KDF and encryption envelope are versioned and parameterized.
7. 2FA trust boundary is defined.
8. Import/export security boundary is defined.
9. Production blockers are documented.
10. Security-crypto-architect and security-auditor agents approve the final documents.

No application implementation should be treated as production-ready until this gate is re-reviewed.
