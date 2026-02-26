import { Router, Request, Response } from 'express';
import { Playlist } from '../../shared/models/Playlist.js';
import { Video } from '../../shared/models/Video.js';

const router = Router();

/**
 * GET /public/playlists/:playlistId
 * Returns a single playlist with its video details — no auth required.
 */
router.get('/:playlistId', async (req: Request, res: Response) => {
    try {
        const { playlistId } = req.params;

        const playlist = await Playlist.findOne({ playlistId }).lean();
        if (!playlist) {
            return res.status(404).json({ success: false, error: 'Playlist not found' });
        }

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

        return res.status(200).json({
            success: true,
            data: {
                playlistId: playlist.playlistId,
                title: playlist.title,
                thumbnailUrl: playlist.thumbnailUrl ?? null,
                videos: orderedVideos,
                videoCount: playlist.videoIds.length,
                createdAt: playlist.createdAt,
                updatedAt: playlist.updatedAt,
            },
        });
    } catch (error: any) {
        console.error('[PUBLIC-PLAYLIST-GET] Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to load playlist' });
    }
});

export default router;
