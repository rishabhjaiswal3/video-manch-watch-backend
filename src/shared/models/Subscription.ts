import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  subscriberId: string;
  creatorId: string;
  notificationsEnabled: boolean;
  createdAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    subscriberId: {
      type: String,
      required: true,
      index: true,
    },
    creatorId: {
      type: String,
      required: true,
      index: true,
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound unique index - one subscription per subscriber per creator
SubscriptionSchema.index({ subscriberId: 1, creatorId: 1 }, { unique: true });

// Index for getting all subscribers of a creator
SubscriptionSchema.index({ creatorId: 1, createdAt: -1 });

// Index for getting all subscriptions of a user
SubscriptionSchema.index({ subscriberId: 1, createdAt: -1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
