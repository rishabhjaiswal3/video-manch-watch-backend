"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Video = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const VideoOutputSchema = new mongoose_1.Schema({
    quality: { type: String, required: true },
    r2Key: { type: String }, // Optional — HLS outputs use playlistUrl instead
    url: { type: String },
    size: { type: Number },
    playlistUrl: { type: String },
    segmentCount: { type: Number },
});
const VideoSchema = new mongoose_1.Schema({
    videoId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    userType: {
        type: String,
        enum: ['user', 'creator'],
        default: 'user',
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 5000,
    },
    originalFile: {
        filename: { type: String, required: true },
        size: { type: Number, required: true },
        mimeType: { type: String, required: true },
        r2Key: { type: String, required: true },
    },
    // Original video metadata
    originalMetadata: {
        width: { type: Number },
        height: { type: Number },
        duration: { type: Number },
        codec: { type: String },
        bitrate: { type: Number },
        fps: { type: Number },
    },
    status: {
        type: String,
        enum: ['pending', 'uploading', 'queued', 'processing', 'completed', 'failed', 'deleted'],
        default: 'pending',
        index: true,
    },
    statusHistory: [
        {
            from: { type: String },
            to: { type: String },
            at: { type: Date, default: Date.now },
            reason: { type: String },
        },
    ],
    transcoding: {
        jobId: { type: String },
        progress: { type: Number, default: 0 },
        startedAt: { type: Date },
        completedAt: { type: Date },
        error: { type: String },
    },
    transcodingCompleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    // Performance metrics
    kpis: {
        timings: {
            queueWait: { type: Number },
            download: { type: Number },
            transcode: { type: Number },
            upload: { type: Number },
            total: { type: Number },
        },
        sizes: {
            original: { type: Number },
            '1080p': { type: Number },
            '720p': { type: Number },
            '480p': { type: Number },
            '360p': { type: Number },
            '240p': { type: Number },
            total: { type: Number },
        },
    },
    // HLS
    masterPlaylistUrl: { type: String },
    outputs: [VideoOutputSchema],
    // Thumbnails
    thumbnail: { type: String },
    thumbnails: [{ type: String }],
    duration: { type: Number },
    // Categorization
    tags: [{ type: String, trim: true, maxlength: 50 }],
    genres: [{ type: String, trim: true, maxlength: 50 }],
    // Content flags
    contentType: {
        type: String,
        enum: ['vod', 'live', 'reel'],
        default: 'vod',
    },
    isAdultContent: { type: Boolean, default: false },
    isDownloadable: { type: Boolean, default: false },
    showTitle: { type: Boolean, default: true },
    // Visibility
    visibility: {
        type: String,
        enum: ['listed', 'unlisted'],
        default: 'unlisted',
        index: true,
    },
    // Engagement controls
    allowLikes: { type: Boolean, default: true },
    allowDislikes: { type: Boolean, default: true },
    allowComments: { type: Boolean, default: true },
    // Engagement counters
    likeCount: { type: Number, default: 0, min: 0 },
    dislikeCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    // Retry tracking
    retryCount: { type: Number, default: 0 },
    // Presigned URL tracking
    presignedUrlExpiresAt: { type: Date },
    // Webhook
    webhookUrl: { type: String },
    webhookHeaders: { type: Map, of: String },
}, {
    timestamps: true,
});
// Indexes for better query performance
VideoSchema.index({ userId: 1, status: 1 });
VideoSchema.index({ contentType: 1 });
VideoSchema.index({ tags: 1 });
VideoSchema.index({ genres: 1 });
VideoSchema.index({ createdAt: -1 });
VideoSchema.index({ userId: 1, visibility: 1 });
exports.Video = mongoose_1.default.model('Video', VideoSchema);
//# sourceMappingURL=Video.js.map