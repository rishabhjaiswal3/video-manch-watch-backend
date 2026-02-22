import { Video } from '../../../models/Video.js';
import { generateSignedUrl } from '../../../utils/signedUrl.js';
import { v4 as uuidv4 } from 'uuid';

interface RegisterVODInput {
    userId: string;
    userType: 'user' | 'creator';
    title: string;
    description?: string;
    category?: string;
    masterPlaylistUrl: string;
    thumbnail?: string;
    duration?: number;
    contentType?: 'vod' | 'reel' | 'live';
    source?: string;
    sourceStreamId?: string;
}

export class VideoService {
    /**
     * Register a VOD entry created from live recording.
     */
    async registerVOD(input: RegisterVODInput): Promise<{ videoId: string }> {
        const videoId = uuidv4();

        await Video.create({
            videoId,
            userId: input.userId,
            userType: input.userType,
            title: input.title,
            description: input.description,
            status: 'completed',
            transcodingCompleted: true,
            contentType: input.contentType || 'vod',
            masterPlaylistUrl: input.masterPlaylistUrl,
            thumbnail: input.thumbnail,
            duration: input.duration || 0,
            outputs: [],
            originalFile: {
                filename: `live-recording-${videoId}.m3u8`,
                size: 0,
                mimeType: 'application/vnd.apple.mpegurl',
                r2Key: input.masterPlaylistUrl,
            },
            statusHistory: [{
                from: 'pending',
                to: 'completed',
                at: new Date(),
                reason: input.source || 'live_recording',
            }],
        });

        return { videoId };
    }

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
