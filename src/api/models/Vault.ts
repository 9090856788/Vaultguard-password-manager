import { model, Schema } from 'mongoose';
import { EncryptedSecretEnvelope, encryptedSecretEnvelopeSchema, ObjectId } from './common';

export interface IVault {
  legacyId?: string;
  ownerUserId: ObjectId;
  name: string;
  wrappedVekEnvelope?: EncryptedSecretEnvelope;
  kdf?: {
    algorithm: 'Argon2id';
    version: number;
    salt: string;
    memoryKiB: number;
    timeCost: number;
    parallelism: number;
    outputBytes: 32;
    purpose: 'vault-kek';
  };
  currentKeyId?: string;
  encryptionFormatVersion?: number;
  migrationState: 'legacy-quarantined' | 'awaiting-owner' | 'encrypting' | 'preparing' | 'verified' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const vaultSchema = new Schema<IVault>(
  {
    legacyId: { type: String, trim: true, maxlength: 128 },
    ownerUserId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    wrappedVekEnvelope: {
      type: encryptedSecretEnvelopeSchema,
      required: function (this: IVault) { return this.migrationState !== 'preparing'; },
    },
    kdf: {
      algorithm: { type: String, required: function (this: IVault) { return this.migrationState !== 'preparing'; }, enum: ['Argon2id'] },
      version: { type: Number, required: function (this: IVault) { return this.migrationState !== 'preparing'; }, min: 1, max: 1000 },
      salt: { type: String, required: function (this: IVault) { return this.migrationState !== 'preparing'; }, trim: true, maxlength: 512 },
      memoryKiB: { type: Number, required: function (this: IVault) { return this.migrationState !== 'preparing'; }, enum: [65536] },
      timeCost: { type: Number, required: function (this: IVault) { return this.migrationState !== 'preparing'; }, enum: [3] },
      parallelism: { type: Number, required: function (this: IVault) { return this.migrationState !== 'preparing'; }, enum: [1] },
      outputBytes: { type: Number, required: function (this: IVault) { return this.migrationState !== 'preparing'; }, enum: [32] },
      purpose: { type: String, required: function (this: IVault) { return this.migrationState !== 'preparing'; }, enum: ['vault-kek'] },
    },
    currentKeyId: { type: String, required: function (this: IVault) { return this.migrationState !== 'preparing'; }, trim: true, maxlength: 128 },
    encryptionFormatVersion: { type: Number, required: function (this: IVault) { return this.migrationState !== 'preparing'; }, min: 1, max: 1000 },
    migrationState: {
      type: String,
      required: true,
      enum: ['legacy-quarantined', 'awaiting-owner', 'encrypting', 'preparing', 'verified', 'blocked'],
    },
    deletedAt: { type: Date },
  },
  { timestamps: true, versionKey: false, strict: 'throw', collection: 'vaults' },
);

vaultSchema.index({ ownerUserId: 1, deletedAt: 1 });
vaultSchema.index({ ownerUserId: 1, _id: 1 });

export const VaultModel = model<IVault>('Vault', vaultSchema);
