import mongoose, { Schema } from 'mongoose';

const NotificationReceiptSchema = new Schema(
  {
    notificationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    channel: { type: String, enum: ['in_app', 'push'], required: true },
    status: { type: String, enum: ['queued', 'sent', 'failed', 'read'], default: 'queued', index: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    sentAt: { type: Date },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

NotificationReceiptSchema.index({ notificationId: 1, userId: 1, channel: 1 }, { unique: true });
NotificationReceiptSchema.index({ userId: 1, createdAt: -1 });

export const NotificationReceipt = mongoose.model('NotificationReceipt', NotificationReceiptSchema);
