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
exports.LiveStream = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const LiveStreamSchema = new mongoose_1.Schema({
    streamId: {
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
        default: 'creator',
    },
    // Stream metadata
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
    thumbnail: {
        type: String,
    },
    category: {
        type: String,
        trim: true,
        maxlength: 50,
    },
    tags: [{
            type: String,
            trim: true,
            maxlength: 50,
        }],
    // Stream credentials
    streamKey: {
        type: String,
        required: true,
        index: true,
    },
    // RTMP ingest
    rtmpUrl: {
        type: String,
        required: true,
    },
    // Playback
    playbackUrl: {
        type: String,
    },
    playbackR2Key: {
        type: String,
    },
    // Status
    status: {
        type: String,
        enum: ['created', 'ready', 'live', 'ended', 'failed'],
        default: 'created',
        index: true,
    },
    statusHistory: [{
            from: { type: String },
            to: { type: String },
            at: { type: Date, default: Date.now },
            reason: { type: String },
        }],
    // Metrics
    viewerCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    peakViewers: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalViews: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Timing
    scheduledAt: {
        type: Date,
    },
    startedAt: {
        type: Date,
    },
    endedAt: {
        type: Date,
    },
    duration: {
        type: Number,
    },
    // Settings
    recordingEnabled: {
        type: Boolean,
        default: true,
    },
    recordedVideoId: {
        type: String,
    },
    chatEnabled: {
        type: Boolean,
        default: true,
    },
    isAdultContent: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
// Compound indexes for query patterns
LiveStreamSchema.index({ userId: 1, status: 1 });
LiveStreamSchema.index({ status: 1, createdAt: -1 });
LiveStreamSchema.index({ category: 1, status: 1 });
LiveStreamSchema.index({ createdAt: -1 });
LiveStreamSchema.index({ startedAt: -1 });
exports.LiveStream = mongoose_1.default.model('LiveStream', LiveStreamSchema);
//# sourceMappingURL=LiveStream.js.map