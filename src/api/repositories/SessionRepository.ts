import { ISession, SessionModel, SessionState } from '../models/Session';
import { ObjectId } from '../models/common';

const SAFE_SESSION_PROJECTION = '-tokenHash';

export const sessionRepository = {
  findByTokenHash(tokenHash: string) {
    return SessionModel.findOne({ tokenHash }).select('+tokenHash').lean().exec() as Promise<ISession | null>;
  },

  findSafeByUser(userId: ObjectId) {
    return SessionModel.find({ userId }).select(SAFE_SESSION_PROJECTION).sort({ createdAt: -1 }).lean().exec() as Promise<ISession[]>;
  },

  create(input: Pick<ISession, 'userId' | 'familyId' | 'tokenHash' | 'expiresAt'> & Partial<ISession>) {
    return SessionModel.create(input);
  },

  markCurrentUsed(tokenHash: string, replacedBySessionId: ObjectId) {
    return SessionModel.findOneAndUpdate(
      { tokenHash, state: 'current', expiresAt: { $gt: new Date() } },
      { $set: { state: 'used' as SessionState, usedAt: new Date(), replacedBySessionId } },
      { new: true, runValidators: true },
    ).select('+tokenHash').lean().exec() as Promise<ISession | null>;
  },

  revokeFamily(familyId: string, reason: string) {
    return SessionModel.updateMany(
      { familyId, state: { $in: ['current', 'used'] } },
      { $set: { state: 'revoked', revokedAt: new Date(), revocationReason: reason } },
    ).exec();
  },

  revokeUserSessions(userId: ObjectId, reason: string) {
    return SessionModel.updateMany(
      { userId, state: { $in: ['current', 'used'] } },
      { $set: { state: 'revoked', revokedAt: new Date(), revocationReason: reason } },
    ).exec();
  },
};

export { SAFE_SESSION_PROJECTION };
