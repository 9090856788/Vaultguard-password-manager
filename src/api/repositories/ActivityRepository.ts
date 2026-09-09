import { ActivityModel, IActivity } from '../models/Activity';
import { ObjectId } from '../models/common';
import { userScope } from './scopes';

export const activityRepository = {
  listForOwner(userId: ObjectId, vaultId?: ObjectId) {
    const filter: Record<string, unknown> = userScope(userId);
    if (vaultId) filter.vaultId = vaultId;
    return ActivityModel.find(filter).sort({ createdAt: -1 }).lean().exec() as Promise<IActivity[]>;
  },

  create(input: Pick<IActivity, 'userId' | 'action' | 'safeLabel'> & Partial<IActivity>) {
    return ActivityModel.create(input);
  },
};
