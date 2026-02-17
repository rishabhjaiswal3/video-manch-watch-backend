import mongoose, { Schema, Document } from 'mongoose';

export interface ICommentReaction extends Document {
  commentId: string;
  userId: string;
  type: 'like';
  createdAt: Date;
}

const CommentReactionSchema = new Schema<ICommentReaction>(
  {
    commentId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['like'],
      default: 'like',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound unique index - one reaction per user per comment
CommentReactionSchema.index({ commentId: 1, userId: 1 }, { unique: true });

export const CommentReaction = mongoose.model<ICommentReaction>('CommentReaction', CommentReactionSchema);
