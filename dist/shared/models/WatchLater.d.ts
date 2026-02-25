import mongoose, { Document } from 'mongoose';
export interface IWatchLater extends Document {
    userId: string;
    videoId: string;
    addedAt: Date;
}
export declare const WatchLater: mongoose.Model<IWatchLater, {}, {}, {}, mongoose.Document<unknown, {}, IWatchLater, {}, {}> & IWatchLater & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=WatchLater.d.ts.map