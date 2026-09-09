# ADR: Vault Encryption Architecture

Status: Proposed
Decision scope: production vault confidentiality

## Decision

Vault secrets are encrypted on the trusted client before persistence. The server persists encrypted payloads and wrapped key material, not usable vault plaintext.

## Key hierarchy

Master Password
  -> Argon2id with random per-account salt
  -> Key Encryption Key (KEK)
  -> unwrap Vault Encryption Key (VEK)
  -> AES-256-GCM
  -> encrypted vault item

Authentication verification is a separate cryptographic purpose and must not be treated as the vault key.

## VEK

The VEK is randomly generated with a cryptographically secure random source. The server stores only an approved wrapped representation. The usable VEK exists only in the client runtime while the vault is unlocked.

## KDF

Argon2id parameters must be versioned and configurable. The salt is cryptographically random and unique per account. Parameters must be benchmarked and approved before release.

## Encryption envelope

Every encrypted item uses a versioned envelope containing, as applicable:

- crypto/schema version
- algorithm identifier
- key identifier/version
- random IV/nonce
- ciphertext
- authentication tag
- required associated-data identifiers

Never reuse an AES-GCM nonce with the same key.

## Associated data

Bind encrypted records to stable context such as vault/item/key version so ciphertext cannot be silently transplanted between records.

## Password change

1. Authenticate using the existing password.
2. Derive the old KEK.
3. Unwrap the VEK locally.
4. Derive the new KEK from the new password and new/approved salt policy.
5. Wrap the same VEK with the new KEK.
6. Persist the new wrapped VEK and authentication verifier atomically/safely.
7. Invalidate sessions according to authentication policy.

Do not decrypt and re-encrypt every vault item merely because the master password changed.

## Vault unlock/lock

Unlock derives the KEK and unwraps the VEK in the client. Lock/logout clears in-memory key references and sensitive decrypted state. Raw keys must not be persisted in localStorage, sessionStorage, or Redux persistence.

## Search

Phase 1 encrypted vault search is client-side after authorized decryption. Server-side plaintext search is prohibited. Any encrypted-search alternative requires a separate security review.

## Recovery

A recovery flow must not bypass vault encryption. If the product cannot recover encrypted vault contents without a required secret, that limitation must be explicit product behavior rather than silently weakening encryption.

## Crypto implementation rules

Use vetted platform/library primitives. Do not invent cryptographic algorithms, nonce schemes, KDFs, key wrapping, or password-encryption formats. Crypto code requires independent security review and dedicated tests.
