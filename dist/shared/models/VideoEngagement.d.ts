import mongoose, { Document } from 'mongoose';
export interface IVideoEngagement extends Document {
    videoId: string;
    userId: string;
    type: 'like' | 'dislike';
    createdAt: Date;
}
export declare const VideoEngagement: mongoose.Model<IVideoEngagement, {}, {}, {}, mongoose.Document<unknown, {}, IVideoEngagement, {}, {}> & IVideoEngagement & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=VideoEngagement.d.ts.map