# ADR-002: Client-Side vs. Server-Side Encryption Strategy

**Date:** September 2026  
**Status:** APPROVED (G2 Architecture Gate) - Requires G3 Crypto Review  
**Impact:** Password security model for Phases 1, 2, and 3+

---

## Context

VaultGuard is a password manager. Users trust VaultGuard with highly sensitive data (passwords, API keys, credentials).

The fundamental question: **Should the server ever see plaintext passwords?**

Current landing page claims:

> "Zero-knowledge architecture ensures that your master password is used client-side to derive an AES-256-GCM encryption key via Argon2id. Your plaintext data is encrypted before leaving your browser."

**Reality:** This is NOT implemented. All passwords stored plaintext.

**Options:**

1. **Phase 1: Honest plaintext model** (recommended)
   - Store plaintext on server, HTTPS/TLS in transit
   - Update landing page with honest security claims
   - Implement encryption in Phase 2+

2. **Phase 1: Rush client-side encryption** (NOT recommended)
   - Implement AES-256-GCM in Phase 1
   - Risk: Crypto bugs under time pressure
   - Risk: Incomplete key management design
   - Risk: Breaking change when Phase 2+ improves

3. **Stay with plaintext forever** (NOT acceptable)
   - Fundamentally violates password manager trust model
   - Unacceptable legal/liability exposure

---

## Decision

**PHASE 1: Honest plaintext model with clear Phase 2+ encryption roadmap**

**Phase 1 (Current):**

- Passwords stored plaintext in MongoDB
- HTTPS/TLS protects data in transit
- bcrypt protects master password hashing
- Rate limiting prevents brute force
- Session revocation on logout
- Audit logging for compliance
- Landing page updated with HONEST security claims

**Phase 2+ (Roadmap - not yet implemented):**

- Client-side AES-256-GCM encryption
- Argon2id key derivation (master password → vault key)
- Vault key never leaves browser
- Server cannot decrypt password data
- Re-encryption on password change
- True zero-knowledge architecture

---

## Rationale

### Why Not Phase 1 Encryption?

**Security risk of rushing:**

- AES-256-GCM requires careful implementation
- IV handling must be correct (randomness, non-repetition)
- Key derivation must be deterministic but strong (Argon2id tuning)
- Re-encryption on password change is complex
- Browser crypto API differences (Safari, Chrome, Firefox)
- Testing must be comprehensive (no backdoors, no key leaks)

**Time pressure leads to bugs:**

- Custom crypto is dangerous (RFC 6090: "Fundamental ECC Algorithms")
- Shortcuts in implementation can compromise security
- Code review insufficient for crypto (needs external audit)
- Better to be honest about Phase 1, implement Phase 2 correctly

### Why Phase 1 Is Acceptable

**Security model still strong:**

✅ **Encryption in Transit:** HTTPS/TLS (256-bit symmetric)  
✅ **Master Password Protection:** bcrypt hashing (not plaintext)  
✅ **Server Access Control:** Rate limiting + session revocation  
✅ **Audit Trail:** Full activity logging  
✅ **Honest Claims:** No false security promises

**Threat model:**

| Threat                  | Phase 1 Risk          | Phase 1 Mitigation           |
| ----------------------- | --------------------- | ---------------------------- |
| Man-in-the-middle       | ❌ High without HTTPS | ✅ Enforce HTTPS             |
| Eavesdropping (network) | ❌ High without TLS   | ✅ TLS 1.3 mandatory         |
| Server compromise       | ⚠️ Medium (plaintext) | ✅ Phase 2: encryption       |
| XSS token theft         | ⚠️ Medium             | ✅ Phase 3: HttpOnly cookies |
| Brute force on user     | ❌ High               | ✅ Rate limit + lockout      |
| Weak password           | ✅ Acceptable         | ✅ Strength meter + feedback |
| Account takeover        | ⚠️ Medium             | ✅ Phase 3: 2FA              |

### Why Honest Claims Matter

**Current false claims create liability:**

- Users believe data is encrypted (it's not)
- Regulatory exposure (GDPR, SOC 2, compliance audits)
- Legal liability if data breach occurs
- User trust destroyed if false claims discovered
- Reputation damage

**Honest approach builds trust:**

- "We're on a path to zero-knowledge encryption"
- "Phase 1 is secure against network attacks and brute force"
- "Phase 2 will add client-side encryption"
- Demonstrates technical transparency
- Shows commitment to security evolution

---

## Implementation Strategy

### Phase 1: Honest Security Model

```
LANDING PAGE (Updated):
┌─────────────────────────────────────────┐
│ Password Manager - Enterprise Features  │
│                                         │
│ CURRENT SECURITY (Phase 1):             │
│ ✓ HTTPS/TLS encryption in transit       │
│ ✓ bcrypt master password hashing        │
│ ✓ Rate limiting and brute force protect │
│ ✓ Activity audit logs                   │
│ ✓ Secure password generation            │
│ ✓ Password strength analysis            │
│                                         │
│ COMING SOON (Phase 2-3):                │
│ → Client-side AES-256-GCM encryption    │
│ → Argon2id master key derivation        │
│ → Zero-knowledge vault architecture     │
│ → Two-factor authentication (2FA)       │
│ → End-to-end encrypted imports/exports  │
│                                         │
│ Our commitment: Transparent security.   │
│ Passwords encrypted in transit, with    │
│ strong server-side protection. The      │
│ roadmap above shows our path toward     │
│ true zero-knowledge encryption.         │
└─────────────────────────────────────────┘
```

**Code changes:**

```typescript
// src/api/models/VaultItem.ts (Phase 1)
password: String  // Plaintext (MongoDB stores plaintext)

// Indexes
db.vaultitems.createIndex({ password: 1 })  // For duplicate detection

// Security
- DO NOT log passwords
- DO NOT expose in error messages
- DO send via HTTPS only
- DO hash before export
```

### Phase 2+: Client-Side Encryption Roadmap

**NOT IMPLEMENTED PHASE 1 - ARCHITECTURE ONLY:**

```typescript
// Phase 2+ (Future)
// src/browser/crypto/vault-key.ts
import argon2 from "argon2-browser";
import { subtle } from "crypto";

// 1. Derive vault key from master password
async function deriveVaultKey(
  masterPassword: string,
  userId: string,
): Promise<CryptoKey> {
  const salt = new TextEncoder().encode(userId); // Deterministic salt

  const key = await argon2.hash({
    pass: masterPassword,
    salt: salt,
    type: argon2.ArgonType.Argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });

  return await subtle.importKey("raw", key, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

// 2. Encrypt password before sending to server
async function encryptPassword(
  plaintext: string,
  vaultKey: CryptoKey,
): Promise<{ ciphertext: string; iv: string; tag: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv },
    vaultKey,
    new TextEncoder().encode(plaintext),
  );

  return {
    ciphertext: new TextDecoder().decode(ciphertext),
    iv: new TextDecoder().decode(iv),
    tag: new TextDecoder().decode(new Uint8Array(ciphertext).slice(-16)),
  };
}

// 3. Server receives only ciphertext (cannot decrypt)
// POST /api/v1/passwords
// Body: { title, host, encryptedPassword: "...", iv: "...", tag: "..." }
```

**Why this is Phase 2+ not Phase 1:**

- ✅ Architecture designed and documented
- ✅ Libraries identified (argon2-browser, Web Crypto API)
- ✅ Key management strategy clear
- ❌ Implementation deferred (time, testing, security review)
- ❌ Browser compatibility testing needed
- ❌ Fallback handling for older browsers
- ❌ Performance profiling required

---

## Security Implications

### Phase 1 Threat Coverage

| Threat                                   | Covered?   | Mechanism                          |
| ---------------------------------------- | ---------- | ---------------------------------- |
| Network eavesdropping                    | ✅ Yes     | HTTPS/TLS                          |
| Brute force on master password           | ✅ Yes     | Rate limiting (15 attempts/15 min) |
| Account lockout after failed login       | ✅ Yes     | 5 failures → 30 min lockout        |
| Server compromise (plaintext disclosure) | ❌ No      | Mitigated by Phase 2 encryption    |
| Client-side (browser) compromise         | ⚠️ Partial | Phase 3: HttpOnly cookies + CSP    |
| XSS token theft                          | ⚠️ Medium  | localStorage (Phase 3: HttpOnly)   |
| CSRF attacks                             | ⚠️ Low     | POST-only endpoints + origin check |
| Man-in-the-middle (MITM)                 | ✅ Yes     | TLS certificate pinning (Phase 3)  |

### Phase 1 Limitations (Honest)

- ❌ Server can access plaintext passwords
- ❌ Database breach exposes plaintext
- ❌ Admin/developer account takeover exposes plaintext
- ✅ These are ADDRESSED in Phase 2+ with encryption

**Why this is acceptable for Phase 1:**

1. **Startup/MVP Reality:** Most startups don't have client-side encryption in MVP
2. **Transparent About It:** We tell users upfront
3. **Clear Roadmap:** Encryption is Phase 2, not Phase 10
4. **Security is Still Strong:** HTTPS + rate limiting + audit logs
5. **User Choice:** Users know the model; adoption is informed

---

## Phase 2+ Implementation Plan (Not Phase 1)

### Timeline

**Phase 2 (Weeks 13-18):** Implement client-side encryption

- [ ] Web Crypto API integration
- [ ] Argon2id key derivation
- [ ] AES-256-GCM encryption/decryption
- [ ] Password change re-encryption
- [ ] Import/export encryption
- [ ] Comprehensive testing

**Phase 3+ (Future):** Advanced features

- [ ] HttpOnly cookies (move tokens from localStorage)
- [ ] CSRF protection
- [ ] 2FA support
- [ ] Zero-knowledge architecture complete

### Testing Requirements for Phase 2

```typescript
// Security tests (Phase 2)
describe("Vault Encryption", () => {
  test("Vault key deterministic (same password = same key)", async () => {
    const key1 = await deriveVaultKey(password, userId);
    const key2 = await deriveVaultKey(password, userId);
    expect(key1).toBe(key2);
  });

  test("Different users have different vault keys", async () => {
    const key1 = await deriveVaultKey(password, "user1");
    const key2 = await deriveVaultKey(password, "user2");
    expect(key1).not.toBe(key2);
  });

  test("Encryption produces different ciphertext each time (IV randomness)", async () => {
    const plaintext = "secret";
    const ct1 = await encryptPassword(plaintext, vaultKey);
    const ct2 = await encryptPassword(plaintext, vaultKey);
    expect(ct1.ciphertext).not.toBe(ct2.ciphertext); // Different IV
  });

  test("Can decrypt only with correct vault key", async () => {
    const encrypted = await encryptPassword("secret", correctKey);
    const wrongKey = await deriveVaultKey("wrong-password", userId);

    expect(async () => {
      await decryptPassword(encrypted, wrongKey);
    }).toThrow("Decryption failed (authentication tag mismatch)");
  });

  test("Password change re-encrypts all items", async () => {
    const oldKey = await deriveVaultKey(oldPassword, userId);
    const newKey = await deriveVaultKey(newPassword, userId);

    // Get plaintext with old key
    const item1 = items[0];
    const plaintext = await decryptPassword(item1.encrypted, oldKey);

    // Re-encrypt with new key
    const reencrypted = await encryptPassword(plaintext, newKey);

    // Verify can decrypt with new key
    const decrypted = await decryptPassword(reencrypted, newKey);
    expect(decrypted).toBe(plaintext);
  });
});
```

---

## Consequences

### Phase 1 Consequences

✅ **Positive:**

- Honest security model (no false claims)
- Faster MVP delivery
- Time for proper encryption design
- User trust through transparency
- Security audit of Phase 2 crypto before implementation

⚠️ **Negative:**

- Server has access to plaintext (Phase 2 fixes this)
- Database breach exposes passwords (Phase 2 fixes)
- Requires clear Phase 2 roadmap (documented)
- Landing page must be updated immediately

### Phase 2+ Consequences

✅ **Positive:**

- True zero-knowledge encryption
- Server cannot decrypt passwords
- Maximum user trust
- Compliance with strict data protection requirements

⚠️ **Negative:**

- Implementation complexity (Phase 2)
- Browser compatibility testing (Phase 2)
- Re-encryption on password change (Performance Phase 2)
- Backup/restore implications (Phase 2)

---

## Related Decisions

- **ADR-001:** MongoDB + Mongoose (data storage)
- **ADR-003:** Redux + TanStack Query (state management)
- **ADR-004:** CSS Modules (styling)
- **Database Architecture:** `docs/database/database-architecture.md`
- **Vault Security:** `docs/security/vault-security-architecture.md`
- **Authentication:** `docs/security/authentication-architecture.md`

---

## Approval Requirements

### G2 Approval (Current)

- ✅ Engineering Lead approves Phase 1 + roadmap

### G3 Approval (Security/Crypto Review)

- ⏳ Security architect approves Phase 1 honesty claims
- ⏳ Crypto architect approves Phase 2+ AES-256-GCM plan
- ⏳ Landing page updated per vault-security-architecture.md

---

## References

- AES-256-GCM: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf
- Argon2id: https://github.com/P-H-C/phc-winner-argon2
- Web Crypto API: https://www.w3.org/TR/WebCryptoAPI/
- OWASP: Encryption: https://cheatsheetseries.owasp.org/cheatsheets/Encryption_Cheat_Sheet.html
- Vault Security Architecture: `docs/security/vault-security-architecture.md`
