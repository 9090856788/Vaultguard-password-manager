# G3 Authoritative Security/Crypto Baseline

**Status:** APPROVED WITH CONDITIONS  
**Authority:** G3 Security/Crypto Architecture  
**Implementation:** G5 and later gates

This document is the authoritative target baseline for security-sensitive
architecture. Current-state assessment documents may describe known defects,
but they must not present those defects as target behavior.

## Security Claims

- **IMPLEMENTED:** only behavior verified in the current source and tests.
- **PLANNED:** approved target behavior not yet implemented.
- **UNSUPPORTED:** claims not substantiated by the current implementation.

Current zero-knowledge, end-to-end encryption, encrypted-at-rest,
AES-256-GCM, Argon2id vault encryption, encrypted-export, and implemented-2FA
claims are **UNSUPPORTED** in the current application. They are **PLANNED**
target capabilities only.

## Password Separation

VaultGuard uses two separate secrets:

1. **Account Authentication Password** — server-verified and used for account
   authentication and session authorization.
2. **Vault Master Password** — browser-only, never sent to the server, and
   used only to derive the vault KEK and unwrap the VEK.

Account-password recovery does not recover the Vault Master Password. No
recovery mechanism is implied by this baseline.

## Key Hierarchy

```text
Vault Master Password
  -> Argon2id, random per-vault salt, versioned parameters
  -> 32-byte KEK
  -> authenticated unwrap of random 32-byte VEK
  -> AES-256-GCM encrypted vault secrets
```

The Argon2id baseline is 64 MiB memory, time cost 3, parallelism 1, and
32-byte output. These values require device benchmarking before implementation
approval. The salt must never be derived from a user ID or email address.

Every encrypted envelope requires a version, key ID, fresh random 96-bit
nonce, ciphertext, authentication tag, and canonical AAD binding its purpose,
vault, item, field, and revision.

## Session Security

- Short-lived access JWTs use explicit algorithm, issuer, audience, subject,
  token type, and expiry validation.
- Refresh sessions use Secure, HttpOnly, SameSite-configured cookies.
- Refresh tokens are server-tracked by hash.
- Rotation is mandatory on every successful refresh.
- Reuse revokes the complete token family.
- Logout revokes the current session.
- Password change revokes all sessions.
- State-changing cookie requests require CSRF protection.

## Secret Boundary

The server may receive only justified metadata. Passwords, secure notes, TOTP
secrets, recovery material, the Vault Master Password, KEK, and VEK remain
client-only or encrypted envelopes.

Password strength, reuse, and other secret-dependent analysis runs client-side.

## Import and Export

Encrypted export is a portable, versioned authenticated envelope. Plaintext
CSV is a separate explicitly confirmed export mode and must never be labeled
encrypted.

Imports are size-bounded, schema-validated, staged, duplicate-aware, and
atomic. Missing passwords never receive defaults.

## Migration Boundary

Legacy plaintext data enters controlled quarantine. It is not inserted into
final encrypted VaultItem fields. The owner must establish a Vault Master
Password; the browser derives the KEK, encrypts the data, uploads the encrypted
representation, and verifies it. Records whose owner cannot complete this
process remain quarantined and are not called encrypted.

## Gate Map

| Gate | Meaning |
|---|---|
| G0 | Intake and Scope |
| G1 | Requirements |
| G2 | General Architecture |
| G3 | Security/Crypto Architecture |
| G4 | Database Architecture + JSON-to-Mongo Migration Planning |
| G5 | Implementation |
| G6 | QA |
| G7 | Independent Security Audit |
| G8 | Visual Regression |
| G9 | Code Review |
| G10 | Release |

