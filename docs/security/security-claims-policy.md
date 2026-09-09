# Security Claims Policy

Status: Draft for G3 re-review
Scope: VaultGuard web application and all security/product documentation

## Purpose

Define security claims VaultGuard may and may not make during migration.

## Non-negotiable rule

A security property must be implemented, tested, reviewed, and evidenced before product copy describes it as a current capability.

## Allowed current-state claims during migration

- HTTPS/TLS protects network traffic when deployed behind correctly configured TLS.
- Authentication passwords are stored as password hashes when the bcrypt-based authentication path is used.
- Security-sensitive events are audited where the audit path is implemented.
- Rate limiting is present where the corresponding middleware is enabled.

These statements must match the deployed implementation and configuration.

## Prohibited claims until verified

Do not claim:

- zero-knowledge architecture
- end-to-end encryption
- client-side vault encryption
- AES-256-GCM protected vault storage
- encrypted-at-rest vault passwords
- recovery of a vault without the user's secret/key material
- true 2FA unless enrollment, challenge, verification, recovery, and disable flows are implemented
- encrypted export unless the export format is actually encrypted

## Existing misleading claims to remove

Examples currently requiring correction include registration/activity wording that says the account is zero-knowledge, change-password wording that says a vault key was re-derived when no vault key exists, and export wording that calls a plaintext CSV encrypted.

## Release rule

Production release is blocked if user vault credentials are stored in plaintext while product/security documentation claims they are encrypted or zero-knowledge.

## Review rule

Security-sensitive claims must be reviewed by the security-crypto-architect and security-auditor agents before release.
