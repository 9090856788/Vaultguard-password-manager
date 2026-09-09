import { model, Schema } from 'mongoose';
import { ObjectId } from './common';

export type SessionState = 'current' | 'used' | 'revoked' | 'reuse-detected';

export interface ISession {
  userId: ObjectId;
  familyId: string;
  tokenHash: string;
  parentSessionId?: ObjectId;
  replacedBySessionId?: ObjectId;
  state: SessionState;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
  revokedAt?: Date;
  revocationReason?: string;
  reuseDetectedAt?: Date;
  device: { userAgent?: string; name?: string };
  network: { ipPrefix?: string };
}

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    familyId: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    tokenHash: { type: String, required: true, select: false, trim: true, maxlength: 512 },
    parentSessionId: { type: Schema.Types.ObjectId, immutable: true },
    replacedBySessionId: { type: Schema.Types.ObjectId },
    state: { type: String, required: true, enum: ['current', 'used', 'revoked', 'reuse-detected'], default: 'current' },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    revokedAt: { type: Date },
    revocationReason: { type: String, trim: true, maxlength: 160 },
    reuseDetectedAt: { type: Date },
    device: {
      userAgent: { type: String, trim: true, maxlength: 512 },
      name: { type: String, trim: true, maxlength: 128 },
    },
    network: { ipPrefix: { type: String, trim: true, maxlength: 128 } },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, strict: 'throw', collection: 'sessions' },
);

sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1, state: 1, expiresAt: -1 });
sessionSchema.index({ familyId: 1, state: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model<ISession>('Session', sessionSchema);
