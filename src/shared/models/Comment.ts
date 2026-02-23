import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  commentId: string;
  videoId: string;
  userId: string;
  parentId?: string;
  content: string;
  likeCount: number;
  replyCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    commentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    videoId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    parentId: {
      type: String,
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching video comments (top-level, sorted by time)
CommentSchema.index({ videoId: 1, parentId: 1, createdAt: -1 });

// Index for fetching replies to a comment
CommentSchema.index({ parentId: 1, createdAt: 1 });

// Index for user's comments
CommentSchema.index({ userId: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
