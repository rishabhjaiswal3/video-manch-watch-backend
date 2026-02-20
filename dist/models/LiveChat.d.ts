import mongoose, { Document } from 'mongoose';
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
export declare const LiveChatMessage: mongoose.Model<ILiveChatMessage, {}, {}, {}, mongoose.Document<unknown, {}, ILiveChatMessage, {}, {}> & ILiveChatMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=LiveChat.d.ts.map