import { model, Schema } from 'mongoose';
import { ObjectId } from './common';

export interface IAuditEvent {
  eventVersion: number;
  type: string;
  actor: { userId?: ObjectId; kind: 'user' | 'system' | 'admin' };
  resource: { type?: string; id?: ObjectId; vaultId?: ObjectId };
  outcome: 'success' | 'failure' | 'blocked';
  requestId?: string;
  device: { userAgent?: string };
  network: { ipPrefix?: string };
  reasonCode?: string;
  createdAt: Date;
  expiresAt?: Date;
}

const auditEventSchema = new Schema<IAuditEvent>(
  {
    eventVersion: { type: Number, required: true, min: 1, max: 1000 },
    type: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    actor: {
      userId: { type: Schema.Types.ObjectId },
      kind: { type: String, required: true, enum: ['user', 'system', 'admin'] },
    },
    resource: {
      type: { type: String, trim: true, maxlength: 64 },
      id: { type: Schema.Types.ObjectId },
      vaultId: { type: Schema.Types.ObjectId },
    },
    outcome: { type: String, required: true, enum: ['success', 'failure', 'blocked'] },
    requestId: { type: String, trim: true, maxlength: 128 },
    device: { userAgent: { type: String, trim: true, maxlength: 512 } },
    network: { ipPrefix: { type: String, trim: true, maxlength: 128 } },
    reasonCode: { type: String, trim: true, maxlength: 160 },
    expiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, strict: 'throw', collection: 'auditEvents' },
);

auditEventSchema.index({ 'actor.userId': 1, createdAt: -1 });
auditEventSchema.index({ type: 1, createdAt: -1 });
auditEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuditEventModel = model<IAuditEvent>('AuditEvent', auditEventSchema);
