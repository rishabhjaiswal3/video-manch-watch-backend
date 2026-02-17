import mongoose, { Document } from 'mongoose';
export interface ICommentReaction extends Document {
    commentId: string;
    userId: string;
    type: 'like';
    createdAt: Date;
}
export declare const CommentReaction: mongoose.Model<ICommentReaction, {}, {}, {}, mongoose.Document<unknown, {}, ICommentReaction, {}, {}> & ICommentReaction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=CommentReaction.d.ts.map