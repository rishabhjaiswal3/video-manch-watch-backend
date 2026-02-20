"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementService = void 0;
const VideoEngagement_js_1 = require("../../../models/VideoEngagement.js");
const Video_js_1 = require("../../../models/Video.js");
const Profile_js_1 = require("../../../models/Profile.js");
class EngagementService {
    /**
     * Like a video
     */
    async likeVideo(userId, videoId) {
        const video = await Video_js_1.Video.findOne({ videoId, status: 'completed' });
        if (!video) {
            throw new Error('Video not found');
        }
        // Check existing engagement
        const existing = await VideoEngagement_js_1.VideoEngagement.findOne({ videoId, userId });
        if (existing) {
            if (existing.type === 'like') {
                // Already liked
                return { type: 'like', isNew: false };
            }
            // Was dislike, change to like
            existing.type = 'like';
            await existing.save();
            // Update counters: -1 dislike, +1 like
            await Video_js_1.Video.updateOne({ videoId }, { $inc: { likeCount: 1, dislikeCount: -1 } });
            // Update creator's total likes
            await Profile_js_1.Profile.updateOne({ userId: video.userId }, { $inc: { totalLikes: 1 } });
            return { type: 'like', isNew: true };
        }
        // New like
        await VideoEngagement_js_1.VideoEngagement.create({ videoId, userId, type: 'like' });
        // Update video counter
        await Video_js_1.Video.updateOne({ videoId }, { $inc: { likeCount: 1 } });
        // Update creator's total likes
        await Profile_js_1.Profile.updateOne({ userId: video.userId }, { $inc: { totalLikes: 1 } });
        return { type: 'like', isNew: true };
    }
    /**
     * Dislike a video
     */
    async dislikeVideo(userId, videoId) {
        const video = await Video_js_1.Video.findOne({ videoId, status: 'completed' });
        if (!video) {
            throw new Error('Video not found');
        }
        // Check existing engagement
        const existing = await VideoEngagement_js_1.VideoEngagement.findOne({ videoId, userId });
        if (existing) {
            if (existing.type === 'dislike') {
                // Already disliked
                return { type: 'dislike', isNew: false };
            }
            // Was like, change to dislike
            existing.type = 'dislike';
            await existing.save();
            // Update counters: -1 like, +1 dislike
            await Video_js_1.Video.updateOne({ videoId }, { $inc: { likeCount: -1, dislikeCount: 1 } });
            // Update creator's total likes (decrease)
            await Profile_js_1.Profile.updateOne({ userId: video.userId }, { $inc: { totalLikes: -1 } });
            return { type: 'dislike', isNew: true };
        }
        // New dislike
        await VideoEngagement_js_1.VideoEngagement.create({ videoId, userId, type: 'dislike' });
        // Update video counter
        await Video_js_1.Video.updateOne({ videoId }, { $inc: { dislikeCount: 1 } });
        return { type: 'dislike', isNew: true };
    }
    /**
     * Remove engagement (unlike/undislike)
     */
    async removeEngagement(userId, videoId) {
        const video = await Video_js_1.Video.findOne({ videoId });
        if (!video) {
            throw new Error('Video not found');
        }
        const existing = await VideoEngagement_js_1.VideoEngagement.findOneAndDelete({ videoId, userId });
        if (!existing) {
            return { removed: false };
        }
        // Update counters
        if (existing.type === 'like') {
            await Video_js_1.Video.updateOne({ videoId }, { $inc: { likeCount: -1 } });
            await Profile_js_1.Profile.updateOne({ userId: video.userId }, { $inc: { totalLikes: -1 } });
        }
        else {
            await Video_js_1.Video.updateOne({ videoId }, { $inc: { dislikeCount: -1 } });
        }
        return { removed: true, previousType: existing.type };
    }
    /**
     * Get video engagement stats
     */
    async getVideoEngagement(videoId) {
        const video = await Video_js_1.Video.findOne({ videoId }).select('likeCount dislikeCount').lean();
        if (!video) {
            throw new Error('Video not found');
        }
        return {
            likeCount: video.likeCount || 0,
            dislikeCount: video.dislikeCount || 0,
        };
    }
    /**
     * Get user's engagement status on a video
     */
    async getUserEngagementStatus(userId, videoId) {
        const engagement = await VideoEngagement_js_1.VideoEngagement.findOne({ videoId, userId });
        if (!engagement) {
            return { engaged: false };
        }
        return { engaged: true, type: engagement.type };
    }
    /**
     * Get user's liked videos
     */
    async getUserLikedVideos(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        // Get engagement entries
        const [engagements, total] = await Promise.all([
            VideoEngagement_js_1.VideoEngagement.find({ userId, type: 'like' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            VideoEngagement_js_1.VideoEngagement.countDocuments({ userId, type: 'like' }),
        ]);
        // Get video details
        const videoIds = engagements.map((e) => e.videoId);
        const videos = await Video_js_1.Video.find({
            videoId: { $in: videoIds },
            status: 'completed',
        })
            .select('videoId title thumbnail duration createdAt contentType userId')
            .lean();
        // Create a map for ordering
        const videoMap = new Map(videos.map((v) => [v.videoId, v]));
        const orderedVideos = videoIds
            .map((id) => videoMap.get(id))
            .filter((v) => v !== undefined);
        return {
            videos: orderedVideos,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
exports.EngagementService = EngagementService;
//# sourceMappingURL=engagement.service.js.map