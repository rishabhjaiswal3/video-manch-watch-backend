import mongoose, { Schema } from 'mongoose';

const SubscriptionSchema = new Schema(
  {
    subscriberId: { type: String, required: true, index: true },
    creatorId: { type: String, required: true, index: true },
    notificationsEnabled: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SubscriptionSchema.index({ subscriberId: 1, creatorId: 1 }, { unique: true });
SubscriptionSchema.index({ creatorId: 1, createdAt: -1 });
SubscriptionSchema.index({ subscriberId: 1, createdAt: -1 });

export const Subscription = mongoose.model('Subscription', SubscriptionSchema);
