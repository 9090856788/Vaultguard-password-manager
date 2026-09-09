import { model, Schema } from 'mongoose';
import { EncryptedSecretEnvelope, encryptedSecretEnvelopeSchema } from './common';

export interface IUser {
  legacyId?: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  accountPasswordVerifier: string;
  verifier: {
    algorithm: 'argon2id' | 'bcrypt-legacy';
    version: number;
    memoryKiB?: number;
    timeCost?: number;
    parallelism?: number;
    outputBytes?: number;
    upgradedAt?: Date;
  };
  accountSecurityVersion: number;
  twoFactor: {
    enabled: boolean;
    method?: 'totp';
    secretEnvelope?: EncryptedSecretEnvelope;
    enrolledAt?: Date;
    lastVerifiedAt?: Date;
    disabledAt?: Date;
  };
  recoveryCodes: {
    hashes: string[];
    generatedAt?: Date;
    remainingCount: number;
    version: number;
  };
  lockout: {
    failedAttempts: number;
    lockedUntil?: Date;
    lastFailureAt?: Date;
    progressiveDelayUntil?: Date;
  };
  preferences: {
    autoLockMinutes: number;
    clipboardClearSeconds: number;
    theme?: 'dark' | 'light';
    language?: string;
  };
  lastLoginAt?: Date;
  lastPasswordChangeAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    legacyId: { type: String, trim: true, maxlength: 128 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 320,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    fullName: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    avatarUrl: { type: String, trim: true, maxlength: 2048 },
    accountPasswordVerifier: { type: String, required: true, select: false, maxlength: 1024 },
    verifier: {
      algorithm: { type: String, required: true, enum: ['argon2id', 'bcrypt-legacy'] },
      version: { type: Number, required: true, min: 1, max: 1000 },
      memoryKiB: { type: Number, min: 1 },
      timeCost: { type: Number, min: 1 },
      parallelism: { type: Number, min: 1 },
      outputBytes: { type: Number, min: 16, max: 1024 },
      upgradedAt: { type: Date },
    },
    accountSecurityVersion: { type: Number, required: true, min: 1, default: 1 },
    twoFactor: {
      enabled: { type: Boolean, required: true, default: false },
      method: { type: String, enum: ['totp'] },
      secretEnvelope: { type: encryptedSecretEnvelopeSchema, select: false },
      enrolledAt: { type: Date },
      lastVerifiedAt: { type: Date },
      disabledAt: { type: Date },
    },
    recoveryCodes: {
      hashes: {
        type: [String],
        required: true,
        default: [],
        select: false,
        validate: { validator: (hashes: string[]) => hashes.length <= 20, message: 'Recovery codes are limited to 20 entries.' },
      },
      generatedAt: { type: Date },
      remainingCount: { type: Number, required: true, min: 0, max: 20, default: 0 },
      version: { type: Number, required: true, min: 1, default: 1 },
    },
    lockout: {
      failedAttempts: { type: Number, required: true, min: 0, default: 0 },
      lockedUntil: { type: Date },
      lastFailureAt: { type: Date },
      progressiveDelayUntil: { type: Date },
    },
    preferences: {
      autoLockMinutes: { type: Number, required: true, min: 1, max: 1440, default: 15 },
      clipboardClearSeconds: { type: Number, required: true, min: 1, max: 3600, default: 30 },
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
      language: { type: String, trim: true, maxlength: 32 },
    },
    lastLoginAt: { type: Date },
    lastPasswordChangeAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true, versionKey: false, strict: 'throw', collection: 'users' },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ deletedAt: 1 }, { partialFilterExpression: { deletedAt: { $exists: true } } });

export const UserModel = model<IUser>('User', userSchema);
