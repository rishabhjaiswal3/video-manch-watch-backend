import { Request, Response } from 'express';
export declare class LiveController {
    /**
     * Create a new live stream
     */
    createStream(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get active live streams (public)
     */
    getActiveStreams(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get stream details (public)
     */
    getStreamDetails(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get stream key (owner only)
     */
    getStreamKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Regenerate stream key
     */
    regenerateStreamKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update stream metadata
     */
    updateStream(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Start stream (internal/webhook - called by transcoding engine)
     */
    startStream(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * End stream
     */
    endStream(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get creator's streams (my streams)
     */
    getMyStreams(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Delete stream
     */
    deleteStream(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Validate stream key (for RTMP ingest)
     */
    validateStreamKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update viewer count (internal)
     */
    updateViewerCount(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get chat messages for a stream
     */
    getChatMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Send chat message
     */
    sendChatMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Delete chat message
     */
    deleteChatMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Pin chat message (stream owner only)
     */
    pinChatMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=live.controller.d.ts.map