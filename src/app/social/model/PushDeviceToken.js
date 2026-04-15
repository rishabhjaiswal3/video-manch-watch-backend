import mongoose, { Schema } from 'mongoose';

const PushDeviceTokenSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    platform: { type: String, enum: ['web_watch', 'web_creator', 'android', 'ios'], required: true, index: true },
    fcmToken: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    appVersion: { type: String },
    deviceMeta: { type: Schema.Types.Mixed },
    lastSeenAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

PushDeviceTokenSchema.index({ userId: 1, platform: 1, isActive: 1 });

export const PushDeviceToken = mongoose.model('PushDeviceToken', PushDeviceTokenSchema);
