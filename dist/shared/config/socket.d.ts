import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
export interface VideoRoomData {
    videoId: string;
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
//# sourceMappingURL=socket.d.ts.map