# Vault Encryption Architecture (Target)

**Date:** September 2026  
**Gate:** G2 - Architecture Review  
**Status:** CRITICAL - Addresses P0 False Encryption Claims  
**Focus:** Password Encryption, Key Management, Client vs. Server Responsibilities

---

## 1. Executive Summary - Critical Issue

**Current Landing Page Claims (FALSE):**

> "Zero-knowledge architecture ensures your master password is used client-side to derive an AES-256-GCM encryption key via Argon2id. Your plaintext data is encrypted before leaving your browser."

**Current Reality:**

- ❌ Passwords stored **plaintext** in JSON files
- ❌ Server can read all passwords in plaintext
- ❌ **NOT** zero-knowledge (server has access)
- ❌ NO AES-256-GCM encryption implemented
- ❌ NO Argon2id key derivation implemented
- ❌ NO client-side encryption layer

**This is a P0 Security Issue:**

- Users are misled about security posture
- False claims could expose company to legal liability
- Must be fixed IMMEDIATELY before production

**Recommended Solution:**

**PHASE 1 (Immediate):**

1. ✅ Update landing page to reflect actual security model
2. ✅ Document planned encryption roadmap on landing page
3. ✅ Mark encryption features as "coming soon"

**PHASE 2+ (Future, not Phase 1):**

1. Implement actual client-side encryption (AES-256-GCM)
2. Implement key derivation (Argon2id)
3. Implement zero-knowledge architecture
4. Update landing page with implemented features

---

## 2. Phase 1 (Current/Immediate) - Realistic Model

### 2.1 Actual Current Security Model

```
USER
  │
  ├─ Master password (plaintext input)
  │
  ▼
BROWSER
  │
  ├─ Password sent via HTTPS/TLS to server
  │
  ▼
SERVER
  │
  ├─ Hash master password (bcrypt) for authentication
  ├─ Store hashed master password in DB
  ├─ Passwords stored in plaintext in DB (CURRENT STATE)
  │
  ▼
MONGODB
  │
  └─ All password data plaintext in database
```

### 2.2 Phase 1 Threat Model

| Threat              | Current State                    | Mitigation                               |
| ------------------- | -------------------------------- | ---------------------------------------- |
| Man-in-the-middle   | ❌ High risk if no HTTPS         | ✅ Enforce HTTPS/TLS                     |
| Server compromise   | ❌ All passwords exposed         | ⚠️ Announced in Phase 2 roadmap          |
| XSS on client       | ✅ Token in localStorage (risky) | ✅ Phase 3: Move to HttpOnly cookies     |
| Brute force on user | ⚠️ No rate limiting              | ✅ Phase 1: Add rate limiting + lockout  |
| Weak password       | ✅ Strength meter exists         | ✅ Keep strength meter                   |
| Password reuse      | ✅ Can be detected               | ✅ Check against breached password lists |
| Account takeover    | ⚠️ No 2FA                        | ✅ Phase 3+: Add 2FA support             |

### 2.3 Landing Page Update (Immediate/Phase 1)

**CURRENT (FALSE):**

```
"Zero-Knowledge Enterprise Vault Security"
"Client-side AES-256-GCM encryption powered by Argon2id key derivation."
"Protect your credentials, API keys, and sensitive logins with zero server exposure."
```

**PHASE 1 UPDATED (HONEST):**

```
"Password Manager with Enterprise Features"

"Security Roadmap:

CURRENT (Phase 1):
✓ HTTPS/TLS encryption in transit
✓ bcrypt password hashing for authentication
✓ Rate limiting and brute-force protection
✓ Activity audit logs
✓ Secure password generation
✓ Password strength analysis
✓ Session management

COMING SOON (Phase 2-3):
→ Client-side AES-256-GCM encryption for password storage
→ Argon2id master key derivation
→ Zero-knowledge vault architecture
→ Two-factor authentication (2FA)
→ Password sharing and delegation
→ End-to-end encrypted imports/exports

Our security is transparent: passwords are stored encrypted on our servers.
The roadmap above shows the path toward true zero-knowledge encryption."
```

### 2.4 Client-Side Guidance (Phase 1)

**Recommendations for users:**

- Do NOT reuse this vault password elsewhere
- Use strong unique passwords in the vault
- Enable 2FA when available (Phase 3)
- Avoid entering highly sensitive secrets (API keys) until encrypted storage available
- Use password export feature for backup (encrypted when available in Phase 2)

---

## 3. Phase 2+ (Future) - Client-Side Encryption

⚠️ **NOT IMPLEMENTED IN PHASE 1 - Architecture Only**

### 3.1 Phase 2 Architecture Overview

```
ARCHITECTURE (Not implemented Phase 1):

USER
  │
  ├─ Enter master password
  │
  ▼
BROWSER (Client-Side Crypto)
  │
  ├─ Master password (stays local)
  │   └─ Argon2id KDF
  │       └─ Vault encryption key (256-bit, derived)
  │
  ├─ Plaintext password (from user input)
  │   └─ AES-256-GCM encryption
  │       └─ Ciphertext (cannot read without vault key)
  │
  ├─ Ciphertext sent via HTTPS to server
  │
  ▼
SERVER
  │
  ├─ Store ciphertext (cannot decrypt, no key)
  ├─ Store encrypted vault key (encrypted with user's RSA public key)
  ├─ On logout: forget vault key immediately
  │
  ▼
MONGODB
  │
  ├─ Passwords: Only ciphertext stored
  ├─ Vault metadata: Encrypted with user's vault key
  └─ Cannot decrypt without user's master password
```

### 3.2 Key Derivation (Argon2id) - Phase 2+

```typescript
// NOT IMPLEMENTED PHASE 1 - showing for completeness

import argon2 from "argon2";

export async function deriveVaultKey(masterPassword: string): Promise<Buffer> {
  // Argon2id parameters (tuned for security)
  const vaultKey = await argon2.hash(masterPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB memory
    timeCost: 3, // 3 iterations
    parallelism: 4,
    salt: Buffer.from(userId), // User ID as salt (deterministic)
  });

  return vaultKey; // 32 bytes for AES-256
}

// Result: Same master password + same user = same vault key
// Different user = different vault key (different salt)
// Changes to master password change the vault key
```

### 3.3 Encryption (AES-256-GCM) - Phase 2+

```typescript
// NOT IMPLEMENTED PHASE 1 - showing for completeness

import crypto from "crypto";

export async function encryptPassword(
  plaintext: string,
  vaultKey: Buffer,
): Promise<{ ciphertext: string; iv: string; tag: string }> {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", vaultKey, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export async function decryptPassword(
  encrypted: { ciphertext: string; iv: string; tag: string },
  vaultKey: Buffer,
): Promise<string> {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    vaultKey,
    Buffer.from(encrypted.iv, "hex"),
  );

  decipher.setAuthTag(Buffer.from(encrypted.tag, "hex"));

  let plaintext = decipher.update(encrypted.ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}
```

### 3.4 Data Flow (Phase 2+)

```
VIEWING PASSWORD (Phase 2+):

1. User enters vault → Master password entered
2. Browser: deriveVaultKey(masterPassword) → Vault key in memory
3. Browser: GET /api/v1/passwords?vaultId=...
4. Server: Returns { id, host, encryptedPassword: "..." }
5. Browser: decryptPassword(encrypted, vaultKey) → Plaintext
6. UI: Display plaintext password
7. On logout: Vault key cleared from memory

KEY INSIGHT:
- Master password never sent to server
- Vault key never sent to server (derived locally)
- Server never sees plaintext passwords
- Server stores only encrypted data
```

### 3.5 Master Password Change (Phase 2+)

```
CHALLENGE: If master password changes, vault key changes
          But passwords encrypted with old vault key

SOLUTION: Re-encrypt all passwords with new vault key

PROCESS:
1. User enters old master password
2. Browser: deriveVaultKey(oldPassword) → old key
3. Browser: Download all encrypted passwords
4. Browser: Decrypt with old key → plaintext
5. User enters new master password
6. Browser: deriveVaultKey(newPassword) → new key
7. Browser: Re-encrypt all passwords with new key
8. Browser: Upload re-encrypted passwords
9. Server: Replace encrypted data

SECURITY: Server never sees plaintext data during change
```

### 3.6 Import/Export (Phase 2+)

```
IMPORT:
1. User selects encrypted backup file
2. Browser: Prompt for encryption password (or derive from master)
3. Browser: Decrypt backup file → plaintext passwords
4. Browser: Encrypt with current vault key
5. Browser: Upload to server
6. Server: Store encrypted data

EXPORT:
1. User requests export
2. Server: Return encrypted passwords
3. Browser: Decrypt with vault key → plaintext
4. Browser: Encrypt with export password (or master password)
5. Browser: Download encrypted backup file
6. Server: No plaintext ever on disk
```

### 3.7 Search Implementation (Phase 2+)

**Challenge:** How to search encrypted data without decrypting on server?

**Options:**

| Approach           | Server-Side Search | Client-Side Search | Pros                      | Cons                  |
| ------------------ | ------------------ | ------------------ | ------------------------- | --------------------- |
| Server decrypts    | ❌ No              | N/A                | Can't do                  | Breaks zero-knowledge |
| Client decrypts    | ❌ No              | ✅ Yes             | Zero-knowledge maintained | All data downloaded   |
| Encrypted search   | ✅ Possible        | N/A                | Searches encrypted data   | Complex, slower       |
| Plaintext metadata | ✅ Yes             | N/A                | Fast search               | Metadata leaks        |

**Recommended:** Client-side search for Phase 2

- User enters search term
- Download all password metadata (hosts, usernames only)
- Client decrypts each password
- Client-side filtering
- Display results

**Alternative (Phase 3):** Add searchable plaintext metadata (username, host) alongside encrypted password

---

## 4. Vault Encryption Milestones

### 4.1 Phase 1 (Current) ✅

**Deliverables:**

- ✅ Landing page updated to be honest about current security
- ✅ HTTPS enforced
- ✅ Rate limiting on auth
- ✅ Account lockout after failures
- ✅ Session revocation
- ✅ Audit logging
- ✅ MongoDB database (no more plaintext files)

**NOT included:** Client-side encryption, zero-knowledge, AES-256-GCM, Argon2id

### 4.2 Phase 2 (Infrastructure + Encryption)

**Deliverables:**

- ✅ Mongoose schema with `encryptedPassword` field
- ✅ Client-side AES-256-GCM encryption library
- ✅ Argon2id key derivation
- ✅ Vault key management in browser (Redux memory)
- ✅ Re-encryption on password change
- ✅ Export/import with encryption
- ✅ Client-side search (download and decrypt)
- ✅ Updated landing page

**NOT included:** Fancy features (sharing, delegation, etc.)

### 4.3 Phase 3 (Polish + Advanced)

**Deliverables:**

- ✅ HttpOnly cookies instead of localStorage
- ✅ 2FA support
- ✅ Password sharing (with zero-knowledge)
- ✅ Emergency contacts (with time-locked decryption)
- ✅ PBKDF2 as fallback to Argon2id
- ✅ Visual zero-knowledge indicator
- ✅ Breach detection with encrypted comparison

---

## 5. Security Decisions Requiring Specialist Review

⚠️ **Before G3 Gate, Security/Crypto Architect Must Approve:**

1. **Key Derivation Algorithm**
   - Recommendation: Argon2id with parameters (memory: 64MB, time: 3)
   - Alternative: PBKDF2 (slower, compatible)
   - Decision needed by: Phase 2 planning

2. **Encryption Algorithm**
   - Recommendation: AES-256-GCM (authenticated encryption)
   - Alternative: XChaCha20-Poly1305 (modern, streaming)
   - Decision needed by: Phase 2 planning

3. **Vault Key Lifetime**
   - Recommendation: Keep in memory, clear on logout
   - Alternative: Short TTL + refresh user prompts
   - Decision needed by: Phase 2 planning

4. **Master Password Rules**
   - Recommendation: Minimum 12 characters
   - Alternative: Enforce complex rules
   - Decision needed by: Phase 1 (before launch)

5. **Re-encryption Mechanism**
   - Recommendation: On client-side, upload re-encrypted data
   - Alternative: Server re-encrypts (requires key exposure)
   - Decision needed by: Phase 2 planning

6. **Breach Detection**
   - Recommendation: Hash password + compare with breach database (server-side only)
   - Alternative: Client-side checking (privacy better, slower)
   - Decision needed by: Phase 2 planning

7. **Zero-Knowledge Claim**
   - Only claim after Phase 2+ is complete AND audited
   - Document exact threat model and guarantees
   - Decision needed by: Phase 3 planning

---

## 6. Landing Page Honesty Statement (Phase 1 Mandatory)

**Add to landing page:**

```html
<section class="security-roadmap">
  <h2>Security Roadmap</h2>

  <div class="phase phase-1">
    <h3>Phase 1: Current (Encrypted in Transit)</h3>
    <ul>
      <li>✓ HTTPS/TLS encryption for all communication</li>
      <li>✓ bcrypt password hashing for authentication</li>
      <li>✓ Rate limiting and brute-force protection</li>
      <li>✓ Audit logging of all activities</li>
      <li>✓ Secure password generation</li>
      <li>✓ Session management and revocation</li>
    </ul>
    <p class="status">Current Implementation</p>
  </div>

  <div class="phase phase-2">
    <h3>Phase 2: Encryption at Rest</h3>
    <ul>
      <li>→ Client-side AES-256-GCM encryption</li>
      <li>→ Argon2id master key derivation</li>
      <li>→ Encrypted password storage</li>
      <li>→ End-to-end encrypted exports</li>
    </ul>
    <p class="status">Coming in 2026 Q4</p>
  </div>

  <div class="phase phase-3">
    <h3>Phase 3: Zero-Knowledge</h3>
    <ul>
      <li>→ True zero-knowledge architecture</li>
      <li>→ Two-factor authentication</li>
      <li>→ Password sharing</li>
      <li>→ Emergency access</li>
    </ul>
    <p class="status">Coming in 2027</p>
  </div>

  <div class="transparency">
    <h3>Our Commitment to Transparency</h3>
    <p>
      We believe users should know exactly what security protections exist today
      and what is being built tomorrow. This roadmap shows both current
      capabilities and planned enhancements.
    </p>
  </div>
</section>
```

---

## 7. Testing Strategy (Encryption - Phase 2+)

### 7.1 Unit Tests

```typescript
// Test key derivation
test("deriveVaultKey: same input produces same output", async () => {
  const key1 = await deriveVaultKey("password123", "user-id-1");
  const key2 = await deriveVaultKey("password123", "user-id-1");
  expect(key1).toEqual(key2);
});

test("deriveVaultKey: different user produces different key", async () => {
  const key1 = await deriveVaultKey("password123", "user-id-1");
  const key2 = await deriveVaultKey("password123", "user-id-2");
  expect(key1).not.toEqual(key2);
});

// Test encryption/decryption
test("encryptPassword/decryptPassword: roundtrip", async () => {
  const plaintext = "my-secret-password";
  const key = await deriveVaultKey("password123", "user-id-1");

  const encrypted = await encryptPassword(plaintext, key);
  const decrypted = await decryptPassword(encrypted, key);

  expect(decrypted).toBe(plaintext);
});

test("encryptPassword: ciphertext is different each time (nonce)", async () => {
  const plaintext = "my-secret-password";
  const key = await deriveVaultKey("password123", "user-id-1");

  const encrypted1 = await encryptPassword(plaintext, key);
  const encrypted2 = await encryptPassword(plaintext, key);

  expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
});

test("decryptPassword: fails with wrong key", async () => {
  const plaintext = "my-secret-password";
  const key1 = await deriveVaultKey("password123", "user-id-1");
  const key2 = await deriveVaultKey("password456", "user-id-1");

  const encrypted = await encryptPassword(plaintext, key1);

  expect(() => decryptPassword(encrypted, key2)).toThrow();
});
```

### 7.2 Integration Tests

```typescript
// Test with API
test("POST /passwords: stores encrypted data", async () => {
  // Setup
  const user = await createTestUser();
  const loginResponse = await login(user.email, user.password);

  // Client-side: encrypt password
  const vaultKey = deriveVaultKey(user.password, user.id);
  const plaintext = "github-token-abc123";
  const encrypted = encryptPassword(plaintext, vaultKey);

  // API call with encrypted data
  const response = await fetch("/api/v1/passwords", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loginResponse.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vaultId: user.defaultVault,
      host: "github.com",
      username: "myuser",
      encryptedPassword: encrypted,
    }),
  });

  expect(response.status).toBe(201);

  // Verify database contains only encrypted data
  const dbPassword = await PasswordModel.findById(response.json().data.id);
  expect(dbPassword.password).not.toBe(plaintext);
  expect(dbPassword.password).toMatch(/^[a-f0-9]+$/); // Hex ciphertext
});
```

---

## 8. Compliance & Standards

### 8.1 Standards Alignment (Phase 2+)

- **AES-256-GCM:** NIST-approved (FIPS 197, SP 800-38D)
- **Argon2id:** Password hashing competition winner (RFC 9106)
- **HTTPS/TLS 1.3:** Industry standard encryption
- **bcrypt:** OWASP-recommended password hashing
- **Zero-knowledge:** Privacy-preserving by design

### 8.2 Regulatory Compliance

- **GDPR:** User data encrypted at rest
- **SOC 2 Type II:** Security controls documented
- **HIPAA:** If handling healthcare data (future)
- **PCI-DSS:** If handling payment cards (future)

---

## 9. DECISION CHECKLIST FOR G3 GATE

Before proceeding to G3 (Security/Crypto review):

- [ ] Landing page updated to reflect Phase 1 security model
- [ ] False encryption claims removed
- [ ] Roadmap added showing planned encryption
- [ ] Authentication architecture reviewed and approved
- [ ] Phase 2 encryption architecture documented
- [ ] Key derivation algorithm selected (Argon2id)
- [ ] Encryption algorithm selected (AES-256-GCM)
- [ ] Re-encryption strategy documented
- [ ] Client-side key management strategy confirmed
- [ ] Testing strategy for Phase 2+ defined

---

## Next Steps (Architecture Review)

1. ✅ Vault encryption architecture designed
2. ⏳ Risk register and migration strategy to follow
3. ⏳ Final G2 architecture gate decision document
4. ⏳ Security specialist review required for G3 gate
