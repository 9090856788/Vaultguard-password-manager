import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { ObjectId } from '../models/common';
import { IUser } from '../models/User';
import { ISession } from '../models/Session';
import { auditEventRepository } from '../repositories/AuditEventRepository';
import { sessionRepository } from '../repositories/SessionRepository';
import { userRepository } from '../repositories/UserRepository';
import { AppError, isDuplicateKeyError } from '../errors/AppError';
import { ARGON2ID_VERIFIER, comparePassword, hashPassword } from '../utils/passwordUtils';
import { signAccessToken } from '../utils/tokenUtils';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_LOCKOUT_THRESHOLD = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

type AuthUser = IUser & { _id: ObjectId };
type SessionRecord = ISession & { _id: ObjectId };

function asAuthUser(user: IUser | null): AuthUser | null {
  return user as AuthUser | null;
}

function publicUser(user: IUser & { _id?: ObjectId }) {
  return {
    id: user._id?.toString(),
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    preferences: user.preferences,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function createAuthService(dependencies = { users: userRepository, sessions: sessionRepository, audits: auditEventRepository }) {
  async function createSession(user: AuthUser, request: { userAgent?: string; ipPrefix?: string }) {
    const refreshToken = randomBytes(32).toString('base64url');
    const created = await dependencies.sessions.create({
      userId: user._id,
      familyId: randomUUID(),
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      device: { userAgent: request.userAgent?.slice(0, 512) },
      network: { ipPrefix: request.ipPrefix?.slice(0, 128) },
    });
    return { refreshToken, session: created as unknown as SessionRecord };
  }

  function accessTokenFor(user: AuthUser): string {
    return signAccessToken({ id: user._id.toString(), email: user.email, securityVersion: user.accountSecurityVersion });
  }

  async function register(input: { email: string; password: string; fullName: string }, request: { userAgent?: string; ipPrefix?: string }) {
    const accountPasswordVerifier = await hashPassword(input.password);
    let created: AuthUser;
    try {
      created = await dependencies.users.create({
        email: input.email,
        fullName: input.fullName,
        accountPasswordVerifier,
        verifier: ARGON2ID_VERIFIER,
        accountSecurityVersion: 1,
        twoFactor: { enabled: false },
        recoveryCodes: { hashes: [], remainingCount: 0, version: 1 },
        lockout: { failedAttempts: 0 },
        preferences: { autoLockMinutes: 15, clipboardClearSeconds: 30, theme: 'dark' },
      }) as unknown as AuthUser;
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new AppError(409, 'ACCOUNT_EXISTS', 'An account with this email already exists.');
      throw error;
    }

    const { refreshToken } = await createSession(created, request);
    await dependencies.audits.create({ eventVersion: 1, type: 'account.registered', actor: { userId: created._id, kind: 'user' }, outcome: 'success' });
    return { accessToken: accessTokenFor(created), refreshToken, user: publicUser(created) };
  }

  async function login(input: { email: string; password: string }, request: { userAgent?: string; ipPrefix?: string }) {
    const user = asAuthUser(await dependencies.users.findByEmailForAuthentication(input.email));
    const now = new Date();
    if (!user || user.deletedAt || user.lockout.lockedUntil && user.lockout.lockedUntil > now || user.lockout.progressiveDelayUntil && user.lockout.progressiveDelayUntil > now) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const valid = await comparePassword(input.password, user.accountPasswordVerifier);
    if (!valid) {
      const failedAttempts = user.lockout.failedAttempts + 1;
      const progressiveDelaySeconds = Math.min(300, 2 ** Math.max(0, failedAttempts - LOGIN_LOCKOUT_THRESHOLD));
      const now = new Date();
      await dependencies.users.recordFailedLogin(
        user._id,
        failedAttempts,
        now,
        new Date(now.getTime() + progressiveDelaySeconds * 1000),
        failedAttempts >= LOGIN_LOCKOUT_THRESHOLD ? new Date(now.getTime() + LOGIN_LOCKOUT_MS) : undefined,
      );
      await dependencies.audits.create({ eventVersion: 1, type: 'account.login_failed', actor: { userId: user._id, kind: 'user' }, outcome: 'failure', reasonCode: 'invalid_credentials' });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    await dependencies.users.clearLockout(user._id);
    if (user.verifier.algorithm === 'bcrypt-legacy') {
      const upgradedVerifier = await hashPassword(input.password);
      await dependencies.users.updatePasswordVerifier(user._id, upgradedVerifier, new Date(), ARGON2ID_VERIFIER);
      user.accountPasswordVerifier = upgradedVerifier;
      user.verifier = ARGON2ID_VERIFIER;
      user.accountSecurityVersion += 1;
    }
    const { refreshToken } = await createSession(user, request);
    await dependencies.audits.create({ eventVersion: 1, type: 'account.login_succeeded', actor: { userId: user._id, kind: 'user' }, outcome: 'success' });
    return { accessToken: accessTokenFor(user), refreshToken, user: publicUser(user) };
  }

  async function refresh(refreshToken: string, request: { userAgent?: string; ipPrefix?: string }) {
    const tokenHash = hashRefreshToken(refreshToken);
    const current = await dependencies.sessions.findByTokenHash(tokenHash) as SessionRecord | null;
    if (!current) throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired session.');
    if (current.state !== 'current' || current.expiresAt <= new Date()) {
      await dependencies.sessions.revokeFamily(current.familyId, 'refresh_reuse_detected');
      throw new AppError(401, 'REFRESH_REUSE_DETECTED', 'Invalid or expired session.');
    }

    const user = asAuthUser(await dependencies.users.findById(current.userId));
    if (!user) throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired session.');

    const consumed = await dependencies.sessions.consumeCurrent(tokenHash);
    if (!consumed) {
      await dependencies.sessions.revokeFamily(current.familyId, 'refresh_reuse_detected');
      throw new AppError(401, 'REFRESH_REUSE_DETECTED', 'Invalid or expired session.');
    }

    const replacementToken = randomBytes(32).toString('base64url');
    const replacement = await dependencies.sessions.create({
      userId: user._id,
      familyId: current.familyId,
      tokenHash: hashRefreshToken(replacementToken),
      parentSessionId: current._id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      device: { userAgent: request.userAgent?.slice(0, 512) },
      network: { ipPrefix: request.ipPrefix?.slice(0, 128) },
    }) as unknown as SessionRecord;
    return { accessToken: accessTokenFor(user), refreshToken: replacementToken, user: publicUser(user) };
  }

  async function logout(refreshToken?: string) {
    if (refreshToken) await dependencies.sessions.revokeByTokenHash(hashRefreshToken(refreshToken), 'logout');
  }

  async function getCurrentUser(userId: string) {
    const objectId = new Types.ObjectId(userId);
    const user = asAuthUser(await dependencies.users.findById(objectId));
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User profile not found.');
    return publicUser(user);
  }

  async function changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    const objectId = new Types.ObjectId(userId);
    const current = asAuthUser(await dependencies.users.findById(objectId));
    if (!current) throw new AppError(404, 'USER_NOT_FOUND', 'User profile not found.');
    const authUser = asAuthUser(await dependencies.users.findByEmailForAuthentication(current.email));
    if (!authUser || !(await comparePassword(input.currentPassword, authUser.accountPasswordVerifier))) {
      throw new AppError(400, 'CURRENT_PASSWORD_INVALID', 'Current password is incorrect.');
    }
    const verifier = await hashPassword(input.newPassword);
    await dependencies.users.updatePasswordVerifier(objectId, verifier, new Date(), ARGON2ID_VERIFIER);
    await dependencies.sessions.revokeUserSessions(objectId, 'password_changed');
  }

  async function updateProfile(userId: string, input: { fullName?: string; avatarUrl?: string }) {
    const objectId = new Types.ObjectId(userId);
    const current = asAuthUser(await dependencies.users.findById(objectId));
    if (!current) throw new AppError(404, 'USER_NOT_FOUND', 'User profile not found.');
    const updated = await dependencies.users.updateProfile(objectId, {
      fullName: input.fullName ?? current.fullName,
      avatarUrl: input.avatarUrl ?? current.avatarUrl,
      preferences: current.preferences,
    });
    if (!updated) throw new AppError(404, 'USER_NOT_FOUND', 'User profile not found.');
    return publicUser(updated as IUser & { _id?: ObjectId });
  }

  return { register, login, refresh, logout, getCurrentUser, changePassword, updateProfile };
}

export const authService = createAuthService();
export { hashRefreshToken, publicUser };
