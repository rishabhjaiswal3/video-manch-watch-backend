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
exports.ActiveSession = exports.VideoAnalytics = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const VideoAnalyticsSchema = new mongoose_1.Schema({
    videoId: {
        type: String,
        required: true,
        index: true,
    },
    date: {
        type: String,
        required: true,
        index: true,
    },
    // View counts
    views: { type: Number, default: 0 },
    uniqueViewers: { type: Number, default: 0 },
    // Watch time
    totalWatchTime: { type: Number, default: 0 },
    avgWatchTime: { type: Number, default: 0 },
    // Completion
    completions: { type: Number, default: 0 },
    avgCompletionRate: { type: Number, default: 0 },
    // Quality distribution
    qualityStats: {
        '1080p': { type: Number, default: 0 },
        '720p': { type: Number, default: 0 },
        '480p': { type: Number, default: 0 },
        '360p': { type: Number, default: 0 },
        'auto': { type: Number, default: 0 },
    },
    // Engagement
    totalPlays: { type: Number, default: 0 },
    totalPauses: { type: Number, default: 0 },
    totalSeeks: { type: Number, default: 0 },
    bufferingEvents: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    // Peak concurrent
    peakConcurrent: { type: Number, default: 0 },
    // Sessions
    sessions: [{ type: String }],
}, {
    timestamps: true,
});
// Compound index for efficient queries
VideoAnalyticsSchema.index({ videoId: 1, date: -1 });
VideoAnalyticsSchema.index({ date: -1 });
exports.VideoAnalytics = mongoose_1.default.model('VideoAnalytics', VideoAnalyticsSchema);
const ActiveSessionSchema = new mongoose_1.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    videoId: {
        type: String,
        required: true,
        index: true,
    },
    userId: { type: String },
    startedAt: { type: Date, default: Date.now },
    lastHeartbeat: { type: Date, default: Date.now },
    quality: { type: String, default: 'auto' },
    watchTime: { type: Number, default: 0 },
    currentTime: { type: Number, default: 0 },
}, {
    timestamps: true,
});
// TTL index - automatically delete sessions after no heartbeat
// Note: This value (120 seconds) is set at index creation time.
// To change: 1) Update ANALYTICS_SESSION_TTL_SECONDS in .env
// 2) Drop the existing index in MongoDB: db.activesessions.dropIndex("lastHeartbeat_1")
// 3) Restart the server to recreate with new TTL
// Default: 120 seconds (2 minutes)
const SESSION_TTL_SECONDS = parseInt(process.env.ANALYTICS_SESSION_TTL_SECONDS || '120', 10);
ActiveSessionSchema.index({ lastHeartbeat: 1 }, { expireAfterSeconds: SESSION_TTL_SECONDS });
exports.ActiveSession = mongoose_1.default.model('ActiveSession', ActiveSessionSchema);
//# sourceMappingURL=VideoAnalytics.js.map