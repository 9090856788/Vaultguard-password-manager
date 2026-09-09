import { model, Schema } from 'mongoose';
import { ObjectId } from './common';

export interface ICategory {
  legacyId?: string;
  vaultId: ObjectId;
  ownerUserId: ObjectId;
  normalizedName: string;
  displayName: string;
  iconName?: string;
  color?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    legacyId: { type: String, trim: true, maxlength: 128 },
    vaultId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    ownerUserId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    normalizedName: { type: String, required: true, trim: true, lowercase: true, minlength: 1, maxlength: 160 },
    displayName: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    iconName: { type: String, trim: true, maxlength: 64 },
    color: { type: String, trim: true, maxlength: 64 },
    isSystem: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true, versionKey: false, strict: 'throw', collection: 'categories' },
);

categorySchema.index(
  { vaultId: 1, normalizedName: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
categorySchema.index({ vaultId: 1, deletedAt: 1 });

export const CategoryModel = model<ICategory>('Category', categorySchema);
