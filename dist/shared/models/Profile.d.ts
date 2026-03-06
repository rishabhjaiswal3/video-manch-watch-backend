import mongoose, { Document } from 'mongoose';
export interface IProfileLink {
    label: string;
    url: string;
}
export interface IProfile extends Document {
    userId: string;
    username: string;
    displayName: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_reveal';
    avatar?: string;
    banner?: string;
    bio?: string;
    location?: string;
    links?: IProfileLink[];
    isVerified: boolean;
    subscriberCount: number;
    totalViews: number;
    totalLikes: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Profile: mongoose.Model<IProfile, {}, {}, {}, mongoose.Document<unknown, {}, IProfile, {}, {}> & IProfile & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Profile.d.ts.map