import { Video } from '../../../shared/models/Video.js';
import { Profile } from '../../../shared/models/Profile.js';
import { ActiveSession, VideoAnalytics } from '../../../shared/models/VideoAnalytics.js';
import { generateSignedUrl } from '../../../shared/utils/signedUrl.js';
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
    private async getAnalyticsMap(videoIds: string[]): Promise<Map<string, { totalViews: number; totalWatchTime: number; currentViewers: number }>> {
        const uniqueVideoIds = Array.from(new Set(videoIds.filter(Boolean)));
        if (uniqueVideoIds.length === 0) return new Map();

        const [historical, live] = await Promise.all([
            VideoAnalytics.aggregate([
                { $match: { videoId: { $in: uniqueVideoIds } } },
                {
                    $group: {
                        _id: '$videoId',
                        totalViews: { $sum: '$views' },
                        totalWatchTime: { $sum: '$totalWatchTime' },
                    },
                },
            ]),
            ActiveSession.aggregate([
                { $match: { videoId: { $in: uniqueVideoIds } } },
                {
                    $group: {
                        _id: '$videoId',
                        currentViewers: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const map = new Map<string, { totalViews: number; totalWatchTime: number; currentViewers: number }>();
        uniqueVideoIds.forEach((id) => {
            map.set(id, { totalViews: 0, totalWatchTime: 0, currentViewers: 0 });
        });

        for (const row of historical) {
            const existing = map.get(row._id) || { totalViews: 0, totalWatchTime: 0, currentViewers: 0 };
            map.set(row._id, {
                ...existing,
                totalViews: Number(row.totalViews || 0),
                totalWatchTime: Number(row.totalWatchTime || 0),
            });
        }

        for (const row of live) {
            const existing = map.get(row._id) || { totalViews: 0, totalWatchTime: 0, currentViewers: 0 };
            map.set(row._id, {
                ...existing,
                currentViewers: Number(row.currentViewers || 0),
            });
        }

        return map;
    }

    private async getProfileMap(userIds: string[]): Promise<Map<string, any>> {
        const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
        if (uniqueUserIds.length === 0) return new Map();

        const profiles = await Profile.find({ userId: { $in: uniqueUserIds } })
            .select('userId username displayName avatar isVerified')
            .lean();

        return new Map(profiles.map((profile: any) => [profile.userId, profile]));
    }

    private enrichVideoWithChannel(
        video: any,
        profileMap: Map<string, any>,
        analyticsMap?: Map<string, { totalViews: number; totalWatchTime: number; currentViewers: number }>
    ) {
        const profile = profileMap.get(video.userId);
        const channelName = profile?.displayName || profile?.username || 'Unknown user';
        const analytics = analyticsMap?.get(video.videoId) || { totalViews: 0, totalWatchTime: 0, currentViewers: 0 };

        return {
            ...video,
            channel: channelName,
            channelAvatar: profile?.avatar || '',
            channelUsername: profile?.username || '',
            channelVerified: Boolean(profile?.isVerified),
            totalViews: analytics.totalViews,
            totalWatchTime: analytics.totalWatchTime,
            currentViewers: analytics.currentViewers,
        };
    }

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
            const safeSearch = params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.title = { $regex: safeSearch, $options: 'i' };
        }

        const [videos, total] = await Promise.all([
            Video.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(params.limit)
                .lean(),
            Video.countDocuments(query),
        ]);

        const [profileMap, analyticsMap] = await Promise.all([
            this.getProfileMap(videos.map((v: any) => v.userId)),
            this.getAnalyticsMap(videos.map((v: any) => v.videoId)),
        ]);

        // Sign URLs for playback + attach channel info
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
            return this.enrichVideoWithChannel(videoObj, profileMap, analyticsMap);
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
        const [profileMap, analyticsMap] = await Promise.all([
            this.getProfileMap([video.userId]),
            this.getAnalyticsMap([video.videoId]),
        ]);

        if (video.masterPlaylistUrl) {
            const { signedPath } = generateSignedUrl({
                videoId: video.videoId,
                path: video.masterPlaylistUrl,
                deviceType: 'web',
            });
            videoObj.hlsUrl = signedPath;
        }

        return this.enrichVideoWithChannel(videoObj, profileMap, analyticsMap);
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

        const [profileMap, analyticsMap] = await Promise.all([
            this.getProfileMap(videos.map((v: any) => v.userId)),
            this.getAnalyticsMap(videos.map((v: any) => v.videoId)),
        ]);

        const signedVideos = videos.map(v => {
            const videoObj = { ...v } as any;
            if (v.masterPlaylistUrl) {
                const { signedPath } = generateSignedUrl({
                    videoId: v.videoId,
                    path: v.masterPlaylistUrl,
                    deviceType: 'web',
                });
                videoObj.hlsUrl = signedPath;
            }
            const enriched = this.enrichVideoWithChannel(videoObj, profileMap, analyticsMap);
            return {
                ...enriched,
                username: enriched.channel,
                avatar: enriched.channelAvatar,
            };
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
