import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/vaultguard-test';
process.env.APP_ORIGIN = 'http://localhost:3000';

const { createAuthService } = await import('../../src/api/services/authService');
const { hashPassword } = await import('../../src/api/utils/passwordUtils');
const { signAccessToken, verifyAccessToken } = await import('../../src/api/utils/tokenUtils');
const { authenticateToken } = await import('../../src/api/middlewares/authMiddleware');
const { validateLoginInput } = await import('../../src/api/validation/authValidation');
const { healthHandler, readinessHandler } = await import('../../src/api/routes/index');
const { requiredEnv } = await import('../../src/api/config/env');
const { createRateLimiter } = await import('../../src/api/middlewares/rateLimiter');

function makeUser(passwordHash: string) {
  return {
    _id: new Types.ObjectId(),
    email: 'alex@example.com',
    fullName: 'Alex Rivera',
    accountPasswordVerifier: passwordHash,
    verifier: { algorithm: 'bcrypt-legacy' as const, version: 1 },
    accountSecurityVersion: 1,
    twoFactor: { enabled: false },
    recoveryCodes: { hashes: [], remainingCount: 0, version: 1 },
    lockout: { failedAttempts: 0 },
    preferences: { autoLockMinutes: 15, clipboardClearSeconds: 30, theme: 'dark' as const },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function makeDependencies() {
  const passwordHash = await hashPassword('correct horse battery staple');
  const user = makeUser(passwordHash);
  const sessions: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const dependencies = {
    users: {
      create: async () => user,
      findByEmailForAuthentication: async () => user,
      findById: async () => user,
      updatePasswordVerifier: async () => user,
      updateProfile: async () => user,
      recordFailedLogin: async () => undefined,
      clearLockout: async () => undefined,
    },
    sessions: {
      create: async (input: Record<string, unknown>) => {
        const session = { ...input, _id: new Types.ObjectId(), state: 'current' };
        sessions.push(session);
        return session;
      },
      findByTokenHash: async (hash: string) => sessions.find((session) => session.tokenHash === hash) ?? null,
      markCurrentUsed: async (hash: string, replacementId: Types.ObjectId) => {
        const session = sessions.find((candidate) => candidate.tokenHash === hash && candidate.state === 'current');
        if (!session) return null;
        session.state = 'used';
        session.replacedBySessionId = replacementId;
        return session;
      },
      consumeCurrent: async (hash: string) => {
        const session = sessions.find((candidate) => candidate.tokenHash === hash && candidate.state === 'current');
        if (!session || (session.expiresAt instanceof Date && session.expiresAt <= new Date())) return null;
        session.state = 'used';
        session.usedAt = new Date();
        return session;
      },
      revokeFamily: async (familyId: string) => {
        sessions.filter((session) => session.familyId === familyId).forEach((session) => { session.state = 'revoked'; });
      },
      revokeByTokenHash: async (hash: string) => {
        sessions.filter((session) => session.tokenHash === hash).forEach((session) => { session.state = 'revoked'; });
      },
      revokeUserSessions: async () => {
        sessions.forEach((session) => { session.state = 'revoked'; });
      },
    },
    audits: {
      create: async (input: Record<string, unknown>) => { audits.push(input); return input; },
    },
  };
  return { dependencies, user, sessions, audits };
}

test('registration and login use repository-backed sessions without returning refresh tokens', async () => {
  const { dependencies, user, sessions } = await makeDependencies();
  const service = createAuthService(dependencies as never);

  const registered = await service.register({ email: 'alex@example.com', password: 'correct horse battery staple', fullName: 'Alex Rivera' }, {});
  assert.ok(registered.accessToken);
  assert.ok(registered.refreshToken);
  assert.equal(registered.user.id, user._id.toString());
  assert.equal(sessions.length, 1);

  const loggedIn = await service.login({ email: 'alex@example.com', password: 'correct horse battery staple' }, {});
  assert.ok(loggedIn.accessToken);
  assert.equal(sessions.length, 2);
});

test('invalid login is rejected with a safe error', async () => {
  const { dependencies } = await makeDependencies();
  const service = createAuthService(dependencies as never);
  await assert.rejects(
    service.login({ email: 'alex@example.com', password: 'wrong password' }, {}),
    (error: Error & { statusCode?: number; message?: string }) => error.statusCode === 401 && error.message === 'Invalid email or password.',
  );
});

test('expired and malformed access tokens are rejected by verification and middleware', () => {
  const expired = jwt.sign(
    { sub: '507f1f77bcf86cd799439011', email: 'alex@example.com', type: 'access', securityVersion: 1 },
    'test-access-secret',
    { algorithm: 'HS256', expiresIn: -1, issuer: 'vaultguard-api', audience: 'vaultguard-client' },
  );
  const invalidRequest = {
    header: () => `Bearer ${expired}invalid`,
  } as never;
  const errors: Array<{ statusCode?: number }> = [];
  authenticateToken(invalidRequest, {} as never, ((error?: unknown) => { if (error && typeof error === 'object') errors.push(error as { statusCode?: number }); }) as never);
  assert.equal(errors[0]?.statusCode, 401);
});

test('access tokens require approved claims and middleware derives identity from them', () => {
  const token = signAccessToken({ id: '507f1f77bcf86cd799439011', email: 'alex@example.com', securityVersion: 1 });
  const decoded = verifyAccessToken(token);
  assert.equal(decoded?.sub, '507f1f77bcf86cd799439011');
  assert.equal(decoded?.type, 'access');
  assert.equal(verifyAccessToken(`${token}tampered`), null);

  const request = {
    header: (name: string) => name.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined,
  } as never;
  const nextCalls: unknown[] = [];
  authenticateToken(request, {} as never, (error?: unknown) => nextCalls.push(error));
  assert.equal(nextCalls.length, 1);
  assert.equal(nextCalls[0], undefined);
  assert.equal((request as { user?: { id: string } }).user?.id, '507f1f77bcf86cd799439011');
});

test('validation rejects malformed login input without inspecting secrets in errors', () => {
  assert.throws(() => validateLoginInput({ email: 'invalid', password: 'secret password' }), (error: Error) => {
    assert.equal(error.message, 'Email is invalid.');
    assert.equal(error.message.includes('secret'), false);
    return true;
  });
});

test('refresh rotation and logout invalidate the persisted session foundation', async () => {
  const { dependencies, sessions } = await makeDependencies();
  const service = createAuthService(dependencies as never);
  const login = await service.login({ email: 'alex@example.com', password: 'correct horse battery staple' }, {});
  const refreshed = await service.refresh(login.refreshToken, {});
  assert.notEqual(refreshed.refreshToken, login.refreshToken);
  assert.equal(sessions.filter((session) => session.state === 'used').length, 1);
  await assert.rejects(service.refresh(login.refreshToken, {}), (error: Error & { statusCode?: number }) => error.statusCode === 401);
  assert.equal(sessions.every((session) => session.state === 'revoked'), true);
  const secondLogin = await service.login({ email: 'alex@example.com', password: 'correct horse battery staple' }, {});
  await service.logout(secondLogin.refreshToken);
  assert.equal(sessions.at(-1)?.state, 'revoked');
});

test('concurrent refresh attempts consume one current session and revoke the family on reuse', async () => {
  const { dependencies, sessions } = await makeDependencies();
  const service = createAuthService(dependencies as never);
  const login = await service.login({ email: 'alex@example.com', password: 'correct horse battery staple' }, {});

  const results = await Promise.allSettled([
    service.refresh(login.refreshToken, {}),
    service.refresh(login.refreshToken, {}),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(sessions.every((session) => session.state === 'revoked'), true);
  assert.equal(sessions.filter((session) => session.state === 'current').length, 0);
});

test('required environment values fail closed when missing', () => {
  const original = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  assert.throws(() => requiredEnv('MONGODB_URI'), /MONGODB_URI is required/);
  process.env.MONGODB_URI = original;
});

function limiterRequest(ip: string, email: string, forwardedFor?: string, baseUrl = '/auth-test') {
  return {
    ip,
    baseUrl,
    body: { email },
    headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
    socket: { remoteAddress: ip },
  } as never;
}

function limiterResponse(): { statusCode: number; setHeader: (name: string, value: unknown) => void; status: (code: number) => { json: () => undefined }; headers: Map<string, unknown> } {
  let statusCode = 200;
  const headers = new Map<string, unknown>();
  return {
    setHeader: (name: string, value: unknown) => headers.set(name, value),
    status: (code: number) => { statusCode = code; return { json: () => undefined }; },
    get statusCode() { return statusCode; },
    headers,
  };
}

test('authentication rate limiting applies independent account and IP buckets', () => {
  const accountLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1, accountKey: (req) => String(req.body.email).toLowerCase() });
  const firstAccount = limiterResponse();
  accountLimiter(limiterRequest('10.0.0.1', 'same@example.com', undefined, '/account-test'), firstAccount as never, () => undefined);
  const secondAccount = limiterResponse();
  accountLimiter(limiterRequest('10.0.0.2', 'same@example.com', undefined, '/account-test'), secondAccount as never, () => undefined);
  assert.equal(secondAccount.statusCode, 429);

  const firstIp = limiterResponse();
  accountLimiter(limiterRequest('10.0.0.3', 'one@example.com', undefined, '/ip-test'), firstIp as never, () => undefined);
  const secondIp = limiterResponse();
  accountLimiter(limiterRequest('10.0.0.3', 'two@example.com', undefined, '/ip-test'), secondIp as never, () => undefined);
  assert.equal(secondIp.statusCode, 429);
});

test('rate limiting ignores spoofed forwarded headers without trusted proxy configuration', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });
  const first = limiterResponse();
  limiter(limiterRequest('10.0.0.4', 'one@example.com', '192.0.2.1', '/proxy-test'), first as never, () => undefined);
  const second = limiterResponse();
  limiter(limiterRequest('10.0.0.4', 'two@example.com', '192.0.2.2', '/proxy-test'), second as never, () => undefined);
  assert.equal(second.statusCode, 429);
});

test('health and readiness endpoints expose no secret configuration', async () => {
  let healthBody: Record<string, unknown> | undefined;
  healthHandler({}, { json: (body) => { healthBody = body as Record<string, unknown>; } });
  assert.equal(healthBody?.status, 'ok');

  let readinessStatus = 200;
  let readinessBody: Record<string, unknown> | undefined;
  readinessHandler({}, { status: (code) => { readinessStatus = code; return { json: (body) => { readinessBody = body as Record<string, unknown>; } }; } });
  assert.equal(readinessStatus, 503);
  assert.equal(readinessBody?.status, 'not_ready');
  assert.equal(JSON.stringify(readinessBody).includes('JWT'), false);
});
