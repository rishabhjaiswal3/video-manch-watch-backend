import { Video } from '../../../models/Video.js';
import { generateSignedUrl } from '../../../utils/signedUrl.js';

export class VideoService {
    /**
     * List public videos (VOD/Live), excluding Reels by default
     */
    async listVideos(params: { page: number; limit: number; search?: string }) {
        const skip = (params.page - 1) * params.limit;

        // Schema uses 'status: completed', 'contentType: vod/reel'
        const query: any = {
            status: 'completed',
            contentType: { $ne: 'reel' }, // Exclude reels from main feed
        };

        if (params.search) {
            query.title = { $regex: params.search, $options: 'i' };
        }

        const [videos, total] = await Promise.all([
            Video.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(params.limit)
                .lean(),
            Video.countDocuments(query),
        ]);

        // Sign URLs for playback
        const signedVideos = videos.map(v => {
            const videoObj = { ...v } as any;
            if (v.masterPlaylistUrl) {
                // masterPlaylistUrl is usually the R2 key or path.
                // We need to sign it.
                const { signedPath } = generateSignedUrl({
                    videoId: v.videoId,
                    path: v.masterPlaylistUrl,
                });
                videoObj.hlsUrl = signedPath;
            }
            return videoObj;
        });

        return {
            videos: signedVideos,
            pagination: {
                page: params.page,
                limit: params.limit,
                total,
                totalPages: Math.ceil(total / params.limit),
            },
        };
    }

    /**
     * Get single video details
     */
    async getVideoById(videoId: string) {
        // Queries by 'videoId' field (string UUID), not Mongoose _id
        const video = await Video.findOne({ videoId: videoId }).lean();

        if (!video || video.status !== 'completed') return null;

        const videoObj = { ...video } as any;

        if (video.masterPlaylistUrl) {
            const { signedPath } = generateSignedUrl({
                videoId: video.videoId,
                path: video.masterPlaylistUrl,
            });
            videoObj.hlsUrl = signedPath;
        }

        return videoObj;
    }

    /**
     * List Reels (vertical short videos)
     */
    async listReels(params: { page: number; limit: number }) {
        const skip = (params.page - 1) * params.limit;

        const query = {
            status: 'completed',
            contentType: 'reel',
        };

        const [videos, total] = await Promise.all([
            Video.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(params.limit)
                .lean(),
            Video.countDocuments(query),
        ]);

        const signedVideos = videos.map(v => {
            const videoObj = { ...v } as any;
            if (v.masterPlaylistUrl) {
                const { signedPath } = generateSignedUrl({
                    videoId: v.videoId,
                    path: v.masterPlaylistUrl,
                });
                videoObj.hlsUrl = signedPath;
            }
            return videoObj;
        });

        return {
            videos: signedVideos,
            pagination: {
                page: params.page,
                limit: params.limit,
                total,
                totalPages: Math.ceil(total / params.limit),
            },
        };
    }
}
