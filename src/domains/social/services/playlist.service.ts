import { v4 as uuidv4 } from 'uuid';
import { Playlist } from '../../../shared/models/Playlist.js';
import { Video } from '../../../shared/models/Video.js';
import { r2Service } from '../../../infra/storage/r2Service.js';

const MAX_PLAYLISTS_PER_USER = 100;
const MAX_VIDEOS_PER_PLAYLIST = 500;

export class PlaylistService {

    /**
     * List all playlists for a user, including a preview of the first 8 video titles
     */
    async listPlaylists(userId: string) {
        const playlists = await Playlist.find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        // Collect all preview video IDs (first 8 per playlist) in one query
        const allPreviewIds = [...new Set(playlists.flatMap(p => p.videoIds.slice(0, 8)))];
        const previewVideos = allPreviewIds.length > 0
            ? await Video.find({ videoId: { $in: allPreviewIds } })
                .select('videoId title thumbnail')
                .lean()
            : [];
        const videoMap = new Map(previewVideos.map(v => [v.videoId, v]));

        return playlists.map(p => ({
            playlistId: p.playlistId,
            title: p.title,
            thumbnailUrl: p.thumbnailUrl ?? null,
            videoCount: p.videoIds.length,
            videoIds: p.videoIds,
            previewVideos: p.videoIds.slice(0, 8)
                .map(id => videoMap.get(id))
                .filter((v): v is NonNullable<typeof v> => v !== undefined)
                .map(v => ({ videoId: v.videoId, title: v.title, thumbnail: v.thumbnail ?? null })),
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
    async addVideoToPlaylist(_userId: string, playlistId: string, videoId: string) {
        const playlist = await Playlist.findOne({ playlistId });
        if (!playlist) throw new Error('Playlist not found');

        if (playlist.videoIds.length >= MAX_VIDEOS_PER_PLAYLIST) {
            throw new Error(`Playlist can contain at most ${MAX_VIDEOS_PER_PLAYLIST} videos`);
        }

        // Verify the video exists (no ownership check — viewers save any video)
        const video = await Video.findOne({ videoId }).lean();
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
     * Rename a playlist
     */
    async updatePlaylist(userId: string, playlistId: string, title: string) {
        const updated = await Playlist.findOneAndUpdate(
            { playlistId, userId },
            { $set: { title: title.trim() } },
            { new: true }
        ).lean();
        if (!updated) throw new Error('Playlist not found');
        return {
            playlistId: updated.playlistId,
            title: updated.title,
            thumbnailUrl: updated.thumbnailUrl ?? null,
            videoCount: updated.videoIds.length,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
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
     * Get a single playlist with full video details (ordered by playlist order)
     */
    async getPlaylist(userId: string, playlistId: string) {
        const playlist = await Playlist.findOne({ playlistId, userId }).lean();
        if (!playlist) throw new Error('Playlist not found');

        const rawVideos = playlist.videoIds.length > 0
            ? await Video.find({ videoId: { $in: playlist.videoIds } })
                .select('videoId title thumbnail duration')
                .lean()
            : [];
        const videoMap = new Map(rawVideos.map(v => [v.videoId, v]));
        const orderedVideos = playlist.videoIds
            .map(id => videoMap.get(id))
            .filter((v): v is NonNullable<typeof v> => v !== undefined)
            .map(v => ({
                videoId: v.videoId,
                title: v.title,
                thumbnail: v.thumbnail ?? null,
                duration: (v as any).duration ?? null,
            }));

        return {
            playlistId: playlist.playlistId,
            title: playlist.title,
            thumbnailUrl: playlist.thumbnailUrl ?? null,
            videoIds: playlist.videoIds,
            videos: orderedVideos,
            videoCount: playlist.videoIds.length,
            createdAt: playlist.createdAt,
            updatedAt: playlist.updatedAt,
        };
    }

    /**
     * Get presigned URL to upload a playlist thumbnail
     */
    async getThumbnailUploadUrl(userId: string, playlistId: string, mimeType: string) {
        const playlist = await Playlist.findOne({ playlistId, userId }).lean();
        if (!playlist) throw new Error('Playlist not found');
        const { uploadUrl, key, expiresIn } = await r2Service.getPlaylistThumbnailPresignedUrl(userId, playlistId, mimeType);
        const publicUrl = r2Service.getPublicUrl(key);
        return { uploadUrl, key, publicUrl, expiresIn };
    }

    /**
     * Save thumbnail URL after upload completes
     */
    async saveThumbnailUrl(userId: string, playlistId: string, thumbnailUrl: string) {
        const updated = await Playlist.findOneAndUpdate(
            { playlistId, userId },
            { $set: { thumbnailUrl } },
            { new: true }
        ).lean();
        if (!updated) throw new Error('Playlist not found');
        return {
            playlistId: updated.playlistId,
            title: updated.title,
            thumbnailUrl: updated.thumbnailUrl ?? null,
            videoCount: updated.videoIds.length,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }
}
