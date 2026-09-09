import { AuditEventModel, IAuditEvent } from '../models/AuditEvent';
import { ObjectId } from '../models/common';

export const auditEventRepository = {
  listForActor(userId: ObjectId, limit = 100) {
    const boundedLimit = Math.min(Math.max(limit, 1), 1000);
    return AuditEventModel.find({ 'actor.userId': userId }).sort({ createdAt: -1 }).limit(boundedLimit).lean().exec() as Promise<IAuditEvent[]>;
  },

  create(input: Pick<IAuditEvent, 'eventVersion' | 'type' | 'actor' | 'outcome'> & Partial<IAuditEvent>) {
    return AuditEventModel.create(input);
  },
};
