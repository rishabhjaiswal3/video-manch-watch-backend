import { Request, Response } from 'express';
export declare class PlaylistController {
    /**
     * GET /playlists — list all playlists for the current user
     */
    list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /playlists — create a new playlist
     * body: { title, videoId? }  — if videoId provided, adds video immediately
     */
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /playlists/:playlistId — rename a playlist
     * body: { title }
     */
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /playlists/:playlistId — get a single playlist
     */
    get(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * DELETE /playlists/:playlistId — delete a playlist
     */
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /playlists/:playlistId/videos/:videoId — add video to playlist
     */
    addVideo(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * DELETE /playlists/:playlistId/videos/:videoId — remove video from playlist
     */
    removeVideo(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /playlists/:playlistId/thumbnail-url
     * body: { mimeType }
     */
    getThumbnailUploadUrl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /playlists/:playlistId/thumbnail
     * body: { thumbnailUrl }
     */
    saveThumbnail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=playlist.controller.d.ts.map