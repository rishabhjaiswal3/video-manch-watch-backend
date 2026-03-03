import { Video } from '../../../shared/models/Video.js';
import { Profile } from '../../../shared/models/Profile.js';
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
    private async getProfileMap(userIds: string[]): Promise<Map<string, any>> {
        const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
        if (uniqueUserIds.length === 0) return new Map();

        const profiles = await Profile.find({ userId: { $in: uniqueUserIds } })
            .select('userId username displayName avatar isVerified')
            .lean();

        return new Map(profiles.map((profile: any) => [profile.userId, profile]));
    }

    private enrichVideoWithChannel(video: any, profileMap: Map<string, any>) {
        const profile = profileMap.get(video.userId);
        const channelName = profile?.displayName || profile?.username || 'Unknown user';

        return {
            ...video,
            channel: channelName,
            channelAvatar: profile?.avatar || '',
            channelUsername: profile?.username || '',
            channelVerified: Boolean(profile?.isVerified),
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

        const profileMap = await this.getProfileMap(videos.map((v: any) => v.userId));

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
            return this.enrichVideoWithChannel(videoObj, profileMap);
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
        const profileMap = await this.getProfileMap([video.userId]);

        if (video.masterPlaylistUrl) {
            const { signedPath } = generateSignedUrl({
                videoId: video.videoId,
                path: video.masterPlaylistUrl,
            });
            videoObj.hlsUrl = signedPath;
        }

        return this.enrichVideoWithChannel(videoObj, profileMap);
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

        const profileMap = await this.getProfileMap(videos.map((v: any) => v.userId));

        const signedVideos = videos.map(v => {
            const videoObj = { ...v } as any;
            if (v.masterPlaylistUrl) {
                const { signedPath } = generateSignedUrl({
                    videoId: v.videoId,
                    path: v.masterPlaylistUrl,
                });
                videoObj.hlsUrl = signedPath;
            }
            const enriched = this.enrichVideoWithChannel(videoObj, profileMap);
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
