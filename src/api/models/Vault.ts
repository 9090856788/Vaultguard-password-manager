import { model, Schema } from 'mongoose';
import { EncryptedSecretEnvelope, encryptedSecretEnvelopeSchema, ObjectId } from './common';

export interface IVault {
  legacyId?: string;
  ownerUserId: ObjectId;
  name: string;
  wrappedVekEnvelope: EncryptedSecretEnvelope;
  kdf: {
    algorithm: 'Argon2id';
    version: number;
    salt: string;
    memoryKiB: number;
    timeCost: number;
    parallelism: number;
    outputBytes: 32;
  };
  currentKeyId: string;
  encryptionFormatVersion: number;
  migrationState: 'legacy-quarantined' | 'awaiting-owner' | 'encrypting' | 'verified' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const vaultSchema = new Schema<IVault>(
  {
    legacyId: { type: String, trim: true, maxlength: 128 },
    ownerUserId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    wrappedVekEnvelope: { type: encryptedSecretEnvelopeSchema, required: true },
    kdf: {
      algorithm: { type: String, required: true, enum: ['Argon2id'] },
      version: { type: Number, required: true, min: 1, max: 1000 },
      salt: { type: String, required: true, trim: true, maxlength: 512 },
      memoryKiB: { type: Number, required: true, enum: [65536] },
      timeCost: { type: Number, required: true, enum: [3] },
      parallelism: { type: Number, required: true, enum: [1] },
      outputBytes: { type: Number, required: true, enum: [32] },
    },
    currentKeyId: { type: String, required: true, trim: true, maxlength: 128 },
    encryptionFormatVersion: { type: Number, required: true, min: 1, max: 1000 },
    migrationState: {
      type: String,
      required: true,
      enum: ['legacy-quarantined', 'awaiting-owner', 'encrypting', 'verified', 'blocked'],
    },
    deletedAt: { type: Date },
  },
  { timestamps: true, versionKey: false, strict: 'throw', collection: 'vaults' },
);

vaultSchema.index({ ownerUserId: 1, deletedAt: 1 });
vaultSchema.index({ ownerUserId: 1, _id: 1 });

export const VaultModel = model<IVault>('Vault', vaultSchema);
