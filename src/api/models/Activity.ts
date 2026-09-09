import { model, Schema } from 'mongoose';
import { ObjectId } from './common';

export interface IActivity {
  userId: ObjectId;
  vaultId?: ObjectId;
  itemId?: ObjectId;
  action: string;
  safeLabel: string;
  createdAt: Date;
  expiresAt?: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    vaultId: { type: Schema.Types.ObjectId, immutable: true },
    itemId: { type: Schema.Types.ObjectId, immutable: true },
    action: { type: String, required: true, trim: true, minlength: 1, maxlength: 128 },
    safeLabel: { type: String, required: true, trim: true, maxlength: 240 },
    expiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, strict: 'throw', collection: 'activities' },
);

activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ vaultId: 1, createdAt: -1 });
activitySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ActivityModel = model<IActivity>('Activity', activitySchema);
