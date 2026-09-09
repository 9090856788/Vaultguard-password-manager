# ADR: Authentication and Session Architecture

Status: Proposed
Decision scope: production authentication/session migration

## Decision

Use short-lived JWT access tokens with server-side session records and rotating refresh tokens delivered through Secure, HttpOnly, SameSite cookies.

## Token policy

- Access token target lifetime: 15 minutes.
- Refresh session target lifetime: 7 days, subject to product/security policy.
- Explicitly restrict accepted JWT algorithm.
- Validate issuer, audience, expiry, token type and subject.
- Separate signing secrets/keys by token class where practical.
- Never use hard-coded secret fallbacks in production.

## Refresh rotation

Each successful refresh must:

1. Read the refresh credential from the secure cookie.
2. Verify its signature and claims.
3. Resolve the exact server-side session/token record.
4. Confirm the session is active and not expired/revoked.
5. Rotate the refresh credential.
6. Store only a secure hash/fingerprint of the new refresh credential as appropriate.
7. Invalidate the previous credential.
8. Detect reuse of an invalidated credential and revoke the affected session family according to policy.

Do not use a generic `findByUserId` lookup when multiple sessions are possible.

## Logout

Logout must revoke the current refresh session and clear authentication cookies.

## Password change

A successful authentication-password change must invalidate existing sessions according to the security policy and require re-authentication as appropriate.

## 2FA

2FA is a separate authentication factor and is not a profile preference. Enabling it requires server-side enrollment and proof of possession. Login must create a second-factor challenge when enabled.

## Error handling

Authentication failures should use generic externally visible errors and detailed internal audit information without revealing whether an email/account exists.

## Rate limiting

Apply both per-IP and per-account protections to login and other security-sensitive endpoints.

## Browser storage

Do not persist access/refresh credentials in localStorage for the production target. Do not persist raw vault encryption keys in browser storage.

## Migration notes

The existing API currently returns tokens in JSON and uses request-body refresh tokens. This must be removed or isolated behind an explicitly temporary migration mode before production release.
