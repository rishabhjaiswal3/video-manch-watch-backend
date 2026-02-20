import mongoose, { Schema, Document } from 'mongoose';

export type LiveChatMessageType = 'message' | 'system' | 'donation' | 'pinned';

export interface ILiveChatMessage extends Document {
  messageId: string;
  streamId: string;
  userId: string;
  username: string;
  avatar?: string;
  message: string;
  type: LiveChatMessageType;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LiveChatMessageSchema = new Schema<ILiveChatMessage>(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    streamId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    avatar: {
      type: String,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ['message', 'system', 'donation', 'pinned'],
      default: 'message',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching chat messages for a stream (sorted by time)
LiveChatMessageSchema.index({ streamId: 1, createdAt: 1 });

// Index for fetching user's messages
LiveChatMessageSchema.index({ userId: 1, createdAt: -1 });

// Index for pinned messages
LiveChatMessageSchema.index({ streamId: 1, isPinned: 1 });

// TTL index to auto-delete old messages after 7 days
LiveChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const LiveChatMessage = mongoose.model<ILiveChatMessage>('LiveChatMessage', LiveChatMessageSchema);
