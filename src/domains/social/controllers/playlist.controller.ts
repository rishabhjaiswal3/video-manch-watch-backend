import { Request, Response } from 'express';
import { PlaylistService } from '../services/playlist.service.js';
import { ensureAuthenticatedUser } from '../.././../shared/utils/authHelpers.js';

const playlistService = new PlaylistService();

export class PlaylistController {

    /**
     * GET /playlists — list all playlists for the current user
     */
    async list(req: Request, res: Response) {
        try {
            const { userId } = ensureAuthenticatedUser(req);
            const playlists = await playlistService.listPlaylists(userId);
            return res.status(200).json({ success: true, data: playlists });
        } catch (error: any) {
            console.error('[PLAYLIST-LIST] Error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /playlists — create a new playlist
     * body: { title, videoId? }  — if videoId provided, adds video immediately
     */
    async create(req: Request, res: Response) {
        try {
            const { userId } = ensureAuthenticatedUser(req);
            const { title, videoId } = req.body;

            if (!title || !title.trim()) {
                return res.status(400).json({ success: false, error: 'Title is required' });
            }
            if (title.trim().length > 200) {
                return res.status(400).json({ success: false, error: 'Title is too long (max 200 characters)' });
            }

            let result;
            if (videoId) {
                result = await playlistService.createPlaylistWithVideo(userId, title, videoId);
            } else {
                result = await playlistService.createPlaylist(userId, title);
            }

            return res.status(201).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[PLAYLIST-CREATE] Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /playlists/:playlistId — get a single playlist
     */
    async get(req: Request, res: Response) {
        try {
            const { userId } = ensureAuthenticatedUser(req);
            const { playlistId } = req.params;
            const result = await playlistService.getPlaylist(userId, playlistId);
            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[PLAYLIST-GET] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }

    /**
     * DELETE /playlists/:playlistId — delete a playlist
     */
    async delete(req: Request, res: Response) {
        try {
            const { userId } = ensureAuthenticatedUser(req);
            const { playlistId } = req.params;
            const result = await playlistService.deletePlaylist(userId, playlistId);
            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[PLAYLIST-DELETE] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /playlists/:playlistId/videos/:videoId — add video to playlist
     */
    async addVideo(req: Request, res: Response) {
        try {
            const { userId } = ensureAuthenticatedUser(req);
            const { playlistId, videoId } = req.params;
            const result = await playlistService.addVideoToPlaylist(userId, playlistId, videoId);
            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[PLAYLIST-ADD-VIDEO] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }

    /**
     * DELETE /playlists/:playlistId/videos/:videoId — remove video from playlist
     */
    async removeVideo(req: Request, res: Response) {
        try {
            const { userId } = ensureAuthenticatedUser(req);
            const { playlistId, videoId } = req.params;
            const result = await playlistService.removeVideoFromPlaylist(userId, playlistId, videoId);
            return res.status(200).json({ success: true, data: result });
        } catch (error: any) {
            console.error('[PLAYLIST-REMOVE-VIDEO] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }
}
