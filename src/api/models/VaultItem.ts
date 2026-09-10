import { model, Schema } from 'mongoose';
import { EncryptedSecretEnvelope, encryptedSecretEnvelopeSchema, ObjectId } from './common';

export const VAULT_ITEM_SECRET_FIELDS = ['username', 'password', 'notes', 'totp', 'recoveryCodes'] as const;
export type VaultItemSecretField = typeof VAULT_ITEM_SECRET_FIELDS[number];
export type EncryptedSecrets = Partial<Record<VaultItemSecretField, EncryptedSecretEnvelope>>;

export interface IVaultItem {
  _id?: ObjectId;
  legacyId?: string;
  vaultId: ObjectId;
  ownerUserId: ObjectId;
  metadata: {
    title: string;
    websiteUrl?: string;
    categoryId?: ObjectId;
    tags: string[];
    colorLabel?: string;
    websiteLogo?: string;
    isFavorite: boolean;
    isPinned: boolean;
  };
  encryptedSecrets?: EncryptedSecrets;
  revision: number;
  lifecycleState: 'preparing' | 'active' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const vaultItemSchema = new Schema<IVaultItem>(
  {
    legacyId: { type: String, trim: true, maxlength: 128 },
    vaultId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    ownerUserId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    metadata: new Schema({
      title: { type: String, required: true, trim: true, minlength: 1, maxlength: 240 },
      websiteUrl: { type: String, trim: true, maxlength: 2048 },
      categoryId: { type: Schema.Types.ObjectId },
      tags: {
        type: [String],
        required: true,
        default: [],
        validate: { validator: (tags: string[]) => tags.length <= 50, message: 'Vault items are limited to 50 tags.' },
      },
      colorLabel: { type: String, trim: true, maxlength: 64 },
      websiteLogo: { type: String, trim: true, maxlength: 2048 },
      isFavorite: { type: Boolean, required: true, default: false },
      isPinned: { type: Boolean, required: true, default: false },
    }, { _id: false, strict: 'throw' }),
    encryptedSecrets: {
      type: new Schema({
        username: { type: encryptedSecretEnvelopeSchema },
        password: { type: encryptedSecretEnvelopeSchema },
        notes: { type: encryptedSecretEnvelopeSchema },
        totp: { type: encryptedSecretEnvelopeSchema },
        recoveryCodes: { type: encryptedSecretEnvelopeSchema },
      }, { _id: false, strict: 'throw' }),
      required: function (this: IVaultItem) { return this.lifecycleState !== 'preparing'; },
    },
    revision: { type: Number, required: true, min: 1, default: 1 },
    lifecycleState: { type: String, required: true, enum: ['preparing', 'active', 'deleted'] },
    deletedAt: { type: Date },
  },
  { timestamps: true, versionKey: false, strict: 'throw', collection: 'vaultItems' },
);

vaultItemSchema.index({ vaultId: 1, deletedAt: 1, updatedAt: -1 });
vaultItemSchema.index({ ownerUserId: 1, vaultId: 1, _id: 1 });
vaultItemSchema.index({ vaultId: 1, 'metadata.categoryId': 1, deletedAt: 1 });
vaultItemSchema.index({ vaultId: 1, 'metadata.isFavorite': 1, deletedAt: 1 });

export const VaultItemModel = model<IVaultItem>('VaultItem', vaultItemSchema);
