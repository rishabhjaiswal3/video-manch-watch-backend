import { v4 as uuidv4 } from 'uuid';
import { Playlist } from '../../../shared/models/Playlist.js';
import { Video } from '../../../shared/models/Video.js';

const MAX_PLAYLISTS_PER_USER = 100;
const MAX_VIDEOS_PER_PLAYLIST = 500;

export class PlaylistService {

    /**
     * List all playlists for a user
     */
    async listPlaylists(userId: string) {
        const playlists = await Playlist.find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        return playlists.map(p => ({
            playlistId: p.playlistId,
            title: p.title,
            videoCount: p.videoIds.length,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));
    }

    /**
     * Create a new playlist
     */
    async createPlaylist(userId: string, title: string) {
        const count = await Playlist.countDocuments({ userId });
        if (count >= MAX_PLAYLISTS_PER_USER) {
            throw new Error(`Maximum ${MAX_PLAYLISTS_PER_USER} playlists allowed`);
        }

        const playlist = new Playlist({
            playlistId: uuidv4(),
            userId,
            title: title.trim(),
            videoIds: [],
        });

        await playlist.save();

        return {
            playlistId: playlist.playlistId,
            title: playlist.title,
            videoCount: 0,
            createdAt: playlist.createdAt,
            updatedAt: playlist.updatedAt,
        };
    }

    /**
     * Add a video to a playlist
     */
    async addVideoToPlaylist(userId: string, playlistId: string, videoId: string) {
        const playlist = await Playlist.findOne({ playlistId, userId });
        if (!playlist) throw new Error('Playlist not found');

        if (playlist.videoIds.length >= MAX_VIDEOS_PER_PLAYLIST) {
            throw new Error(`Playlist can contain at most ${MAX_VIDEOS_PER_PLAYLIST} videos`);
        }

        // Verify the video belongs to the user
        const video = await Video.findOne({ videoId, userId }).lean();
        if (!video) throw new Error('Video not found');

        if (playlist.videoIds.includes(videoId)) {
            return { playlistId, videoId, added: false, message: 'Video already in playlist' };
        }

        playlist.videoIds.push(videoId);
        await playlist.save();

        return { playlistId, videoId, added: true, videoCount: playlist.videoIds.length };
    }

    /**
     * Create a new playlist and immediately add a video to it
     */
    async createPlaylistWithVideo(userId: string, title: string, videoId: string) {
        const video = await Video.findOne({ videoId, userId }).lean();
        if (!video) throw new Error('Video not found');

        const count = await Playlist.countDocuments({ userId });
        if (count >= MAX_PLAYLISTS_PER_USER) {
            throw new Error(`Maximum ${MAX_PLAYLISTS_PER_USER} playlists allowed`);
        }

        const playlist = new Playlist({
            playlistId: uuidv4(),
            userId,
            title: title.trim(),
            videoIds: [videoId],
        });

        await playlist.save();

        return {
            playlistId: playlist.playlistId,
            title: playlist.title,
            videoCount: 1,
            createdAt: playlist.createdAt,
            updatedAt: playlist.updatedAt,
        };
    }

    /**
     * Remove a video from a playlist
     */
    async removeVideoFromPlaylist(userId: string, playlistId: string, videoId: string) {
        const playlist = await Playlist.findOne({ playlistId, userId });
        if (!playlist) throw new Error('Playlist not found');

        const idx = playlist.videoIds.indexOf(videoId);
        if (idx === -1) {
            return { playlistId, videoId, removed: false, message: 'Video not in playlist' };
        }

        playlist.videoIds.splice(idx, 1);
        await playlist.save();

        return { playlistId, videoId, removed: true, videoCount: playlist.videoIds.length };
    }

    /**
     * Delete a playlist
     */
    async deletePlaylist(userId: string, playlistId: string) {
        const result = await Playlist.findOneAndDelete({ playlistId, userId });
        if (!result) throw new Error('Playlist not found');
        return { playlistId, deleted: true };
    }

    /**
     * Get a single playlist with its video IDs
     */
    async getPlaylist(userId: string, playlistId: string) {
        const playlist = await Playlist.findOne({ playlistId, userId }).lean();
        if (!playlist) throw new Error('Playlist not found');
        return {
            playlistId: playlist.playlistId,
            title: playlist.title,
            videoIds: playlist.videoIds,
            videoCount: playlist.videoIds.length,
            createdAt: playlist.createdAt,
            updatedAt: playlist.updatedAt,
        };
    }
}
