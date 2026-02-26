"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaylistController = void 0;
const playlist_service_js_1 = require("../services/playlist.service.js");
const authHelpers_js_1 = require("../.././../shared/utils/authHelpers.js");
const playlistService = new playlist_service_js_1.PlaylistService();
class PlaylistController {
    /**
     * GET /playlists — list all playlists for the current user
     */
    async list(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const playlists = await playlistService.listPlaylists(userId);
            return res.status(200).json({ success: true, data: playlists });
        }
        catch (error) {
            console.error('[PLAYLIST-LIST] Error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * POST /playlists — create a new playlist
     * body: { title, videoId? }  — if videoId provided, adds video immediately
     */
    async create(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
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
            }
            else {
                result = await playlistService.createPlaylist(userId, title);
            }
            return res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[PLAYLIST-CREATE] Error:', error);
            return res.status(400).json({ success: false, error: error.message });
        }
    }
    /**
     * PATCH /playlists/:playlistId — rename a playlist
     * body: { title }
     */
    async update(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { playlistId } = req.params;
            const { title } = req.body;
            if (!title || !title.trim()) {
                return res.status(400).json({ success: false, error: 'Title is required' });
            }
            if (title.trim().length > 200) {
                return res.status(400).json({ success: false, error: 'Title too long (max 200 characters)' });
            }
            const result = await playlistService.updatePlaylist(userId, playlistId, title);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[PLAYLIST-UPDATE] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }
    /**
     * GET /playlists/:playlistId — get a single playlist
     */
    async get(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { playlistId } = req.params;
            const result = await playlistService.getPlaylist(userId, playlistId);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[PLAYLIST-GET] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }
    /**
     * DELETE /playlists/:playlistId — delete a playlist
     */
    async delete(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { playlistId } = req.params;
            const result = await playlistService.deletePlaylist(userId, playlistId);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[PLAYLIST-DELETE] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }
    /**
     * POST /playlists/:playlistId/videos/:videoId — add video to playlist
     */
    async addVideo(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { playlistId, videoId } = req.params;
            const result = await playlistService.addVideoToPlaylist(userId, playlistId, videoId);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[PLAYLIST-ADD-VIDEO] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }
    /**
     * DELETE /playlists/:playlistId/videos/:videoId — remove video from playlist
     */
    async removeVideo(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { playlistId, videoId } = req.params;
            const result = await playlistService.removeVideoFromPlaylist(userId, playlistId, videoId);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[PLAYLIST-REMOVE-VIDEO] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }
    /**
     * POST /playlists/:playlistId/thumbnail-url
     * body: { mimeType }
     */
    async getThumbnailUploadUrl(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { playlistId } = req.params;
            const { mimeType } = req.body;
            if (!mimeType || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
                return res.status(400).json({ success: false, error: 'Valid mimeType required (image/jpeg, image/png, image/webp)' });
            }
            const result = await playlistService.getThumbnailUploadUrl(userId, playlistId, mimeType);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[PLAYLIST-THUMBNAIL-URL] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }
    /**
     * PATCH /playlists/:playlistId/thumbnail
     * body: { thumbnailUrl }
     */
    async saveThumbnail(req, res) {
        try {
            const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
            const { playlistId } = req.params;
            const { thumbnailUrl } = req.body;
            if (!thumbnailUrl) {
                return res.status(400).json({ success: false, error: 'thumbnailUrl is required' });
            }
            const result = await playlistService.saveThumbnailUrl(userId, playlistId, thumbnailUrl);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('[PLAYLIST-THUMBNAIL-SAVE] Error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            return res.status(status).json({ success: false, error: error.message });
        }
    }
}
exports.PlaylistController = PlaylistController;
//# sourceMappingURL=playlist.controller.js.map