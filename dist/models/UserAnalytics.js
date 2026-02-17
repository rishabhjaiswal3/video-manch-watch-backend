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
exports.UserAnalyticsSummary = exports.UserWatchHistory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UserWatchHistorySchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    videoId: {
        type: String,
        required: true,
        index: true,
    },
    // Watch time
    totalWatchTime: { type: Number, default: 0 },
    lastWatchedPosition: { type: Number, default: 0 },
    maxWatchedPosition: { type: Number, default: 0 },
    // Completion
    videoDuration: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    // Session tracking
    totalSessions: { type: Number, default: 0 },
    totalPlays: { type: Number, default: 0 },
    totalPauses: { type: Number, default: 0 },
    totalSeeks: { type: Number, default: 0 },
    // Quality
    lastQuality: { type: String, default: 'auto' },
    // Metadata
    videoType: { type: String },
    // Timestamps
    firstWatchedAt: { type: Date, default: Date.now },
    lastWatchedAt: { type: Date, default: Date.now },
}, {
    timestamps: true,
});
// Compound index — one document per user×video pair (unique)
UserWatchHistorySchema.index({ userId: 1, videoId: 1 }, { unique: true });
// Index for "recently watched" queries
UserWatchHistorySchema.index({ userId: 1, lastWatchedAt: -1 });
// Index for "continue watching" queries (not completed, recently watched)
UserWatchHistorySchema.index({ userId: 1, isCompleted: 1, lastWatchedAt: -1 });
// Index for platform-wide stats
UserWatchHistorySchema.index({ videoId: 1, lastWatchedAt: -1 });
exports.UserWatchHistory = mongoose_1.default.model('UserWatchHistory', UserWatchHistorySchema);
const UserAnalyticsSummarySchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    // Totals
    totalWatchTime: { type: Number, default: 0 },
    totalVideosWatched: { type: Number, default: 0 },
    totalReelsWatched: { type: Number, default: 0 },
    totalCompletedVideos: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    // Daily
    todayWatchTime: { type: Number, default: 0 },
    todayDate: { type: String, default: '' },
    // Streaks
    lastActiveDate: { type: String, default: '' },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    // Preferences
    preferredQuality: { type: String, default: 'auto' },
    avgSessionDuration: { type: Number, default: 0 },
}, {
    timestamps: true,
});
exports.UserAnalyticsSummary = mongoose_1.default.model('UserAnalyticsSummary', UserAnalyticsSummarySchema);
//# sourceMappingURL=UserAnalytics.js.map