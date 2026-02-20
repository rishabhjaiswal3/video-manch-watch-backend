"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Video_js_1 = require("../models/Video.js");
const auth_js_1 = require("../middleware/auth.js");
const authHelpers_js_1 = require("../utils/authHelpers.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authenticate);
const QUALITY_BUCKETS = ['1080p', '720p', '480p', '360p', '240p'];
const CONTENT_TYPE_BUCKETS = ['vod', 'live', 'reel'];
const RESOLUTION_BUCKETS = ['4K+', '1080p', '720p', '480p', '360p', 'Other'];
const MAX_TREND_DAYS = 30;
/**
 * GET /api/analytics/overview
 * Get platform-wide analytics overview
 */
router.get('/overview', async (req, res) => {
    try {
        const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        const [summaryResult, storageResult, performanceResult, qualityResult, contentTypeResult, resolutionResult,] = await Promise.all([
            Video_js_1.Video.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: null,
                        totalVideos: { $sum: 1 },
                        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                        processing: {
                            $sum: {
                                $cond: [
                                    { $in: ['$status', ['queued', 'processing']] },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]),
            Video_js_1.Video.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: null,
                        totalOriginalSize: { $sum: { $ifNull: ['$originalFile.size', 0] } },
                        totalTranscodedSize: { $sum: { $ifNull: ['$kpis.sizes.total', 0] } },
                        totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
                    },
                },
            ]),
            Video_js_1.Video.aggregate([
                {
                    $match: {
                        userId,
                        status: 'completed',
                        'kpis.timings.total': { $exists: true },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgDownloadTime: {
                            $avg: { $ifNull: ['$kpis.timings.download', 0] },
                        },
                        avgTranscodeTime: {
                            $avg: { $ifNull: ['$kpis.timings.transcode', 0] },
                        },
                        avgUploadTime: {
                            $avg: { $ifNull: ['$kpis.timings.upload', 0] },
                        },
                        avgTotalTime: {
                            $avg: { $ifNull: ['$kpis.timings.total', 0] },
                        },
                    },
                },
            ]),
            Video_js_1.Video.aggregate([
                { $match: { userId } },
                { $unwind: { path: '$outputs', preserveNullAndEmptyArrays: false } },
                { $match: { 'outputs.quality': { $exists: true } } },
                {
                    $group: {
                        _id: '$outputs.quality',
                        count: { $sum: 1 },
                    },
                },
            ]),
            Video_js_1.Video.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: { $ifNull: ['$contentType', 'vod'] },
                        count: { $sum: 1 },
                    },
                },
            ]),
            Video_js_1.Video.aggregate([
                { $match: { userId } },
                {
                    $project: {
                        height: { $ifNull: ['$originalMetadata.height', 0] },
                    },
                },
                {
                    $addFields: {
                        bucket: {
                            $switch: {
                                branches: [
                                    { case: { $gte: ['$height', 2160] }, then: '4K+' },
                                    { case: { $gte: ['$height', 1080] }, then: '1080p' },
                                    { case: { $gte: ['$height', 720] }, then: '720p' },
                                    { case: { $gte: ['$height', 480] }, then: '480p' },
                                    { case: { $gte: ['$height', 360] }, then: '360p' },
                                ],
                                default: 'Other',
                            },
                        },
                    },
                },
                {
                    $group: {
                        _id: '$bucket',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);
        const summary = summaryResult[0] ?? {
            totalVideos: 0,
            completed: 0,
            failed: 0,
            processing: 0,
        };
        const storage = storageResult[0] ?? {
            totalOriginalSize: 0,
            totalTranscodedSize: 0,
            totalDuration: 0,
        };
        const performance = performanceResult[0] ?? {
            avgDownloadTime: 0,
            avgTranscodeTime: 0,
            avgUploadTime: 0,
            avgTotalTime: 0,
        };
        return res.json({
            success: true,
            data: {
                summary: {
                    totalVideos: summary.totalVideos,
                    completedVideos: summary.completed,
                    failedVideos: summary.failed,
                    processingVideos: summary.processing,
                    successRate: summary.totalVideos > 0
                        ? ((summary.completed / summary.totalVideos) * 100).toFixed(1)
                        : '100',
                },
                storage: {
                    totalOriginalSize: storage.totalOriginalSize,
                    totalTranscodedSize: storage.totalTranscodedSize,
                    compressionRatio: storage.totalOriginalSize
                        ? (storage.totalTranscodedSize / storage.totalOriginalSize).toFixed(2)
                        : '0',
                    totalDuration: storage.totalDuration,
                    formattedOriginalSize: formatBytes(storage.totalOriginalSize),
                    formattedTranscodedSize: formatBytes(storage.totalTranscodedSize),
                    formattedDuration: formatDuration(storage.totalDuration),
                },
                performance: {
                    avgDownloadTime: performance.avgDownloadTime,
                    avgTranscodeTime: performance.avgTranscodeTime,
                    avgUploadTime: performance.avgUploadTime,
                    avgTotalTime: performance.avgTotalTime,
                    formattedAvgDownloadTime: formatTime(performance.avgDownloadTime),
                    formattedAvgTranscodeTime: formatTime(performance.avgTranscodeTime),
                    formattedAvgUploadTime: formatTime(performance.avgUploadTime),
                    formattedAvgTotalTime: formatTime(performance.avgTotalTime),
                },
                distributions: {
                    quality: buildQualityDistribution(qualityResult),
                    contentType: buildContentTypeDistribution(contentTypeResult),
                    resolution: buildResolutionDistribution(resolutionResult),
                },
            },
        });
    }
    catch (error) {
        console.error('[ANALYTICS] Error fetching overview:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/analytics/videos
 * Get list of videos with analytics data
 */
router.get('/videos', async (req, res) => {
    try {
        const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        const query = { userId };
        if (status && status !== 'all') {
            query.status = status;
        }
        const [videos, total] = await Promise.all([
            Video_js_1.Video.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(Number(limit))
                .select('-originalFile.r2Key')
                .lean(),
            Video_js_1.Video.countDocuments(query),
        ]);
        res.json({
            success: true,
            data: {
                videos,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    }
    catch (error) {
        console.error('[ANALYTICS] Error fetching videos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/analytics/video/:videoId
 * Get detailed analytics for a specific video
 */
router.get('/video/:videoId', async (req, res) => {
    try {
        const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        const { videoId } = req.params;
        const video = await Video_js_1.Video.findOne({ videoId, userId }).lean();
        if (!video) {
            return res.status(404).json({ success: false, error: 'Video not found' });
        }
        const sanitizedVideo = {
            videoId: video.videoId,
            title: video.title,
            description: video.description,
            status: video.status,
            userType: video.userType,
            contentType: video.contentType,
            thumbnail: video.thumbnail,
            thumbnails: video.thumbnails,
            duration: video.duration,
            tags: video.tags,
            genres: video.genres,
            masterPlaylistUrl: video.masterPlaylistUrl,
            outputs: sanitizeOutputs(video.outputs),
            transcoding: video.transcoding,
            kpis: video.kpis,
            createdAt: video.createdAt,
            updatedAt: video.updatedAt,
        };
        const processingEfficiency = video.kpis?.timings?.total && video.duration
            ? (video.duration / (video.kpis.timings.total / 1000)).toFixed(2)
            : null;
        const originalSize = video.originalFile?.size ?? 0;
        const transcodedSize = video.kpis?.sizes?.total ?? 0;
        const sizeReduction = originalSize > 0
            ? (((originalSize - transcodedSize) / originalSize) * 100).toFixed(1)
            : null;
        res.json({
            success: true,
            data: {
                video: sanitizedVideo,
                analytics: {
                    processingEfficiency, // seconds of video per second of processing
                    sizeReduction, // percentage reduction
                    originalSize: formatBytes(originalSize),
                    transcodedSize: formatBytes(transcodedSize),
                    duration: formatDuration(video.duration || 0),
                    timings: video.kpis?.timings ? {
                        download: formatTime(video.kpis.timings.download || 0),
                        transcode: formatTime(video.kpis.timings.transcode || 0),
                        upload: formatTime(video.kpis.timings.upload || 0),
                        total: formatTime(video.kpis.timings.total || 0),
                    } : null,
                },
            },
        });
    }
    catch (error) {
        console.error('[ANALYTICS] Error fetching video analytics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/analytics/trends
 * Get processing trends over time
 */
router.get('/trends', async (req, res) => {
    try {
        const { userId } = (0, authHelpers_js_1.ensureAuthenticatedUser)(req);
        const rawDays = Number(req.query.days ?? 7);
        const days = Math.min(Math.max(rawDays || 7, 1), MAX_TREND_DAYS);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);
        const trends = await Video_js_1.Video.aggregate([
            {
                $match: {
                    userId,
                    createdAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $project: {
                    date: {
                        $dateToString: { date: '$createdAt', format: '%Y-%m-%d' },
                    },
                    status: 1,
                    size: '$originalFile.size',
                },
            },
            {
                $group: {
                    _id: '$date',
                    uploaded: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                    },
                    failed: {
                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
                    },
                    totalSize: { $sum: { $ifNull: ['$size', 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        const filledTrends = fillTrendWindow(trends, startDate, days);
        res.json({
            success: true,
            data: {
                trends: filledTrends,
                period: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    days,
                },
            },
        });
    }
    catch (error) {
        console.error('[ANALYTICS] Error fetching trends:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
function buildQualityDistribution(rows) {
    const distribution = {};
    QUALITY_BUCKETS.forEach((bucket) => {
        distribution[bucket] = 0;
    });
    rows.forEach(({ _id, count }) => {
        if (distribution[_id] !== undefined) {
            distribution[_id] = count;
        }
    });
    return distribution;
}
function buildContentTypeDistribution(rows) {
    const distribution = {};
    CONTENT_TYPE_BUCKETS.forEach((bucket) => {
        distribution[bucket] = 0;
    });
    rows.forEach(({ _id, count }) => {
        distribution[_id] = (distribution[_id] || 0) + count;
    });
    return distribution;
}
function buildResolutionDistribution(rows) {
    const distribution = {};
    RESOLUTION_BUCKETS.forEach((bucket) => {
        distribution[bucket] = 0;
    });
    rows.forEach(({ _id, count }) => {
        distribution[_id] = (distribution[_id] || 0) + count;
    });
    return distribution;
}
function sanitizeOutputs(outputs) {
    if (!outputs)
        return [];
    return outputs.map(({ quality, url, playlistUrl, size, segmentCount }) => ({
        quality,
        url,
        playlistUrl,
        size,
        segmentCount,
    }));
}
function fillTrendWindow(rows, start, days) {
    const map = {};
    rows.forEach((row) => {
        map[row._id] = {
            uploaded: row.uploaded,
            completed: row.completed,
            failed: row.failed,
            totalSize: row.totalSize,
        };
    });
    const filled = [];
    for (let i = 0; i < days; i += 1) {
        const cursor = new Date(start);
        cursor.setDate(start.getDate() + i);
        const date = cursor.toISOString().split('T')[0];
        const entry = map[date];
        filled.push({
            date,
            uploaded: entry?.uploaded ?? 0,
            completed: entry?.completed ?? 0,
            failed: entry?.failed ?? 0,
            totalSize: entry?.totalSize ?? 0,
        });
    }
    return filled;
}
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function formatDuration(seconds) {
    if (seconds === 0)
        return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0)
        return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0)
        return `${minutes}m ${secs}s`;
    return `${secs}s`;
}
function formatTime(ms) {
    if (ms === 0)
        return '0s';
    const seconds = ms / 1000;
    if (seconds < 60)
        return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(0);
    return `${minutes}m ${secs}s`;
}
exports.default = router;
//# sourceMappingURL=analytics.js.map