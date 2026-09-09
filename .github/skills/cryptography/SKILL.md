# Cryptography Skill

Use only for approved cryptographic designs.

## Rules
- Prefer established, reviewed primitives and maintained libraries.
- Define KDF parameters, key hierarchy, authenticated encryption, nonce/IV rules, serialization/versioning, rotation, recovery, and migration before implementation.
- Separate keys by purpose.
- Design explicit tamper and wrong-key failure behavior.
- Never log keys or plaintext secrets.
- Add tests for round trips, tampering, corruption, wrong keys, versioning, and migration.
- Require Security/Crypto Architect review before and Security Auditor review after implementation.
