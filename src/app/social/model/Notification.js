import mongoose, { Schema } from 'mongoose';

const NotificationSchema = new Schema(
  {
    notificationId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['admin_broadcast', 'admin_creator_notice', 'new_upload'], required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    createdBy: { type: String, index: true },
    audienceType: { type: String, enum: ['all', 'selected', 'segment'], required: true },
    selectedUserIds: [{ type: String }],
    segment: { type: String },
    targetApps: { type: [String], enum: ['watch', 'creator'], default: ['watch'] },
    stats: {
      totalRecipients: { type: Number, default: 0 },
      pushSent: { type: Number, default: 0 },
      pushFailed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model('Notification', NotificationSchema);
