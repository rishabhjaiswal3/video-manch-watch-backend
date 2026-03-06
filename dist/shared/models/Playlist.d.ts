import mongoose, { Document } from 'mongoose';
export interface IPlaylist extends Document {
    playlistId: string;
    userId: string;
    title: string;
    videoIds: string[];
    thumbnailUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Playlist: mongoose.Model<IPlaylist, {}, {}, {}, mongoose.Document<unknown, {}, IPlaylist, {}, {}> & IPlaylist & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Playlist.d.ts.map