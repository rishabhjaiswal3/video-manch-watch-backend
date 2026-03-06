import mongoose, { Document } from 'mongoose';
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
export declare const Comment: mongoose.Model<IComment, {}, {}, {}, mongoose.Document<unknown, {}, IComment, {}, {}> & IComment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Comment.d.ts.map