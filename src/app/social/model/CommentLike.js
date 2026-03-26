import mongoose, { Schema } from "mongoose";

const CommentLikeSchema = new Schema(
  {
    commentId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CommentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });

export const CommentLike = mongoose.model("CommentLike", CommentLikeSchema);
