import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
export interface VideoRoomData {
    videoId: string;
    userId?: string;
}
export interface LiveRoomData {
    streamId: string;
    userId?: string;
}
export declare const initializeSocket: (httpServer: HttpServer, corsOrigins: string[]) => Server;
export declare const getIO: () => Server;
export declare const emitToVideoRoom: (videoId: string, event: string, data: unknown) => void;
export declare const emitNewComment: (videoId: string, comment: unknown) => void;
export declare const emitDeleteComment: (videoId: string, data: {
    commentId: string;
    parentId?: string | null;
}) => void;
export declare const emitUpdateComment: (videoId: string, comment: unknown) => void;
export declare const emitEngagementUpdate: (videoId: string, data: {
    likeCount: number;
    dislikeCount: number;
}) => void;
export declare const emitToLiveRoom: (streamId: string, event: string, data: unknown) => void;
export declare const emitLiveStarted: (streamId: string, data: {
    streamId: string;
    title: string;
    userId: string;
}) => void;
export declare const emitLiveEnded: (streamId: string) => void;
export declare const emitLiveViewerCount: (streamId: string, count: number) => void;
export declare const emitLiveChatMessage: (streamId: string, message: unknown) => void;
export declare const emitLiveChatDeleted: (streamId: string, messageId: string) => void;
export declare const emitLiveChatPinned: (streamId: string, message: unknown) => void;
export declare const emitLiveStatusUpdate: (streamId: string, status: string) => void;
//# sourceMappingURL=socket.d.ts.map