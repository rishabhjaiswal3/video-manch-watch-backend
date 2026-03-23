import mongoose, { Schema } from 'mongoose';

const CommentSchema = new Schema(
  {
    commentId: { type: String, required: true, unique: true, index: true },
    videoId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    parentId: { type: String, default: null, index: true },
    content: { type: String, required: true, maxlength: 2000 },
    likeCount: { type: Number, default: 0, min: 0 },
    replyCount: { type: Number, default: 0, min: 0 },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CommentSchema.index({ videoId: 1, parentId: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1, createdAt: 1 });
CommentSchema.index({ userId: 1, createdAt: -1 });

export const Comment = mongoose.model('Comment', CommentSchema);
