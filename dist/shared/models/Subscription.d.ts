import mongoose, { Document } from 'mongoose';
export interface ISubscription extends Document {
    subscriberId: string;
    creatorId: string;
    notificationsEnabled: boolean;
    createdAt: Date;
}
export declare const Subscription: mongoose.Model<ISubscription, {}, {}, {}, mongoose.Document<unknown, {}, ISubscription, {}, {}> & ISubscription & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Subscription.d.ts.map