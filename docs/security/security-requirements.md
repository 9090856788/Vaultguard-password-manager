# Security Requirements

Status: G3 remediation baseline

## P0 production blockers

### SR-001 Plaintext vault storage
Vault item secrets must not be stored in plaintext in the production architecture. Vault secrets must be encrypted before persistence.

### SR-002 Honest security claims
Documentation, UI copy, logs, and activity messages must describe only security capabilities that actually exist.

### SR-003 Secret configuration
Production startup must fail when required cryptographic/JWT secrets or security configuration are missing. No hard-coded production secret fallbacks.

### SR-004 Session security
Refresh sessions must support revocation, rotation, reuse detection, and explicit logout. Password change must invalidate existing sessions according to the approved policy.

### SR-005 Token validation
JWT validation must explicitly constrain algorithm and validate issuer, audience, token type, and expiry as applicable to the token class.

## P1 security requirements

### SR-010 Vault key hierarchy
Authentication verification and vault encryption must use separate cryptographic purposes. The design is:

Master Password -> KDF -> KEK -> wrapped VEK -> AES-256-GCM -> encrypted vault item

### SR-011 KDF
Use an approved Argon2id configuration with cryptographically random, per-account salt and versioned parameters.

### SR-012 Encryption envelope
Encrypted data must use a versioned envelope containing algorithm/version/key reference/IV/ciphertext/authentication tag as appropriate. Nonce/IV generation must be cryptographically secure and never reused with the same key.

### SR-013 Key lifecycle
Raw vault keys must be transient in the browser runtime. Do not persist raw encryption keys in Redux, localStorage, or sessionStorage.

### SR-014 Password change
Password change must update the authentication verifier and re-wrap the vault key using the new KEK. Avoid mass item re-encryption unless the architecture explicitly requires it. The operation must be failure-safe.

### SR-015 Authorization
Every vault/item/category operation must verify authenticated identity and resource ownership server-side.

### SR-016 2FA
The 2FA state must never be enabled by a client-controlled boolean alone. Implement enrollment, verification, login challenge, recovery, rate limiting, and secure disable/recovery flows.

### SR-017 Brute-force protection
Authentication endpoints require per-IP controls plus per-account failure tracking, progressive delay and/or temporary lockout, with generic authentication failure messages.

### SR-018 Import/export
Use a standards-compliant CSV parser for CSV operations. Never silently invent a password for an imported item. Plaintext export requires an explicit security warning and must not be labeled encrypted. Encrypted backup uses a separate format and security design.

### SR-019 Audit safety
Never log passwords, decrypted notes, token plaintext, vault keys, KDF secrets, or encryption keys.

### SR-020 Browser search
Client-side search is acceptable for Phase 1 of encrypted vault migration, with the explicit trade-off that the server cannot perform secret-content search. Future alternatives require separate security review.

### SR-021 Database constraints
Do not enforce `{host,vaultId}` uniqueness when users can legitimately have multiple credentials for one host. Use an item identifier and appropriate indexes.

### SR-022 Data model versioning
Encrypted item payloads and key metadata must carry explicit schema/crypto versions to support future rotation and migration.

### SR-023 Recovery
No recovery workflow may silently bypass vault encryption. Recovery requirements and trust boundaries must be documented before implementation.

### SR-024 Secrets in source control
Real secrets, production credentials, exported vaults, generated keys, and sensitive fixtures must never be committed. `.env.example` contains dummy values only.

## Security acceptance criteria

A security requirement is complete only when code, tests, documentation and review evidence agree. Security-sensitive changes require QA and security-auditor sign-off before release.
