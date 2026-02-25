import mongoose, { Document } from 'mongoose';
export interface IAppConfig extends Document {
    key: string;
    playerUrl: string;
    updatedAt: Date;
}
export declare const AppConfig: mongoose.Model<IAppConfig, {}, {}, {}, mongoose.Document<unknown, {}, IAppConfig, {}, {}> & IAppConfig & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=AppConfig.d.ts.map