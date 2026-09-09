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
};

export { SAFE_USER_PROJECTION };
