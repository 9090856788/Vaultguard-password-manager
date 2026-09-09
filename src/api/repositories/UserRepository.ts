import { IUser, UserModel } from '../models/User';
import { ObjectId } from '../models/common';

const SAFE_USER_PROJECTION = '-accountPasswordVerifier -twoFactor.secretEnvelope -recoveryCodes.hashes';

export const userRepository = {
  findById(userId: ObjectId) {
    return UserModel.findOne({ _id: userId, deletedAt: null }).select(SAFE_USER_PROJECTION).lean().exec() as Promise<IUser | null>;
  },

  findByEmail(email: string) {
    return UserModel.findOne({ email: email.trim().toLowerCase(), deletedAt: null })
      .select(SAFE_USER_PROJECTION)
      .lean()
      .exec() as Promise<IUser | null>;
  },

  findByEmailForAuthentication(email: string) {
    return UserModel.findOne({ email: email.trim().toLowerCase(), deletedAt: null })
      .select('+accountPasswordVerifier +recoveryCodes.hashes')
      .lean()
      .exec() as Promise<IUser | null>;
  },

  create(input: Pick<IUser, 'email' | 'fullName' | 'accountPasswordVerifier' | 'verifier'> & Partial<IUser>) {
    return UserModel.create(input);
  },

  incrementSecurityVersion(userId: ObjectId) {
    return UserModel.updateOne({ _id: userId, deletedAt: null }, { $inc: { accountSecurityVersion: 1 } }).exec();
  },

  updatePasswordVerifier(userId: ObjectId, accountPasswordVerifier: string, lastPasswordChangeAt: Date, verifier: IUser['verifier']) {
    return UserModel.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { $set: { accountPasswordVerifier, lastPasswordChangeAt, verifier }, $inc: { accountSecurityVersion: 1 } },
      { new: true, runValidators: true },
    ).select(SAFE_USER_PROJECTION).lean().exec() as Promise<IUser | null>;
  },

  updateProfile(userId: ObjectId, update: Pick<IUser, 'fullName' | 'avatarUrl' | 'preferences'>) {
    return UserModel.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { $set: update },
      { new: true, runValidators: true },
    ).select(SAFE_USER_PROJECTION).lean().exec() as Promise<IUser | null>;
  },

  recordFailedLogin(userId: ObjectId, failedAttempts: number, lastFailureAt: Date, progressiveDelayUntil?: Date, lockedUntil?: Date) {
    return UserModel.updateOne(
      { _id: userId, deletedAt: null },
      { $set: { 'lockout.failedAttempts': failedAttempts, 'lockout.lastFailureAt': lastFailureAt, 'lockout.progressiveDelayUntil': progressiveDelayUntil, 'lockout.lockedUntil': lockedUntil } },
    ).exec();
  },

  clearLockout(userId: ObjectId) {
    return UserModel.updateOne(
      { _id: userId, deletedAt: null },
      { $set: { 'lockout.failedAttempts': 0 }, $unset: { 'lockout.lastFailureAt': 1, 'lockout.progressiveDelayUntil': 1, 'lockout.lockedUntil': 1 } },
    ).exec();
  },
};

export { SAFE_USER_PROJECTION };
