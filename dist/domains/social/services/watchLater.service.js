"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatchLaterService = void 0;
const WatchLater_js_1 = require("../../../shared/models/WatchLater.js");
const Video_js_1 = require("../../../shared/models/Video.js");
class WatchLaterService {
    /** Add a video to the user's watch later list */
    async add(userId, videoId) {
        const video = await Video_js_1.Video.findOne({ videoId, status: 'completed' }).lean();
        if (!video)
            throw new Error('Video not found');
        try {
            await WatchLater_js_1.WatchLater.create({ userId, videoId });
            return { added: true, alreadyExists: false };
        }
        catch (err) {
            if (err.code === 11000) {
                // Duplicate key — already in list
                return { added: false, alreadyExists: true };
            }
            throw err;
        }
    }
    /** Remove a video from watch later */
    async remove(userId, videoId) {
        const result = await WatchLater_js_1.WatchLater.deleteOne({ userId, videoId });
        return { removed: result.deletedCount > 0 };
    }
    /** Get all watch later videos for a user (paginated), joined with video data */
    async getList(userId, page, limit) {
        const skip = (page - 1) * limit;
        const [entries, total] = await Promise.all([
            WatchLater_js_1.WatchLater.find({ userId }).sort({ addedAt: -1 }).skip(skip).limit(limit).lean(),
            WatchLater_js_1.WatchLater.countDocuments({ userId }),
        ]);
        const videoIds = entries.map(e => e.videoId);
        const videos = await Video_js_1.Video.find({ videoId: { $in: videoIds }, status: 'completed' })
            .select('videoId title description thumbnail duration contentType tags createdAt userId userType')
            .lean();
        // Preserve watch-later order
        const videoMap = new Map(videos.map(v => [v.videoId, v]));
        const ordered = entries
            .map(e => {
            const v = videoMap.get(e.videoId);
            if (!v)
                return null;
            return { ...v, addedAt: e.addedAt };
        })
            .filter(Boolean);
        return {
            videos: ordered,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /** Check if a video is in the user's watch later */
    async getStatus(userId, videoId) {
        const entry = await WatchLater_js_1.WatchLater.findOne({ userId, videoId }).lean();
        return { saved: !!entry };
    }
}
exports.WatchLaterService = WatchLaterService;
//# sourceMappingURL=watchLater.service.js.map