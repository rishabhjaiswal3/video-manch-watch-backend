"use strict";
/**
 * ANALYTICS DOMAIN — Creator Analytics Routes
 *
 * Video processing/transcoding analytics for creators.
 * Used by: Creator Portal
 *
 * Endpoints:
 *   GET /api/analytics/overview
 *   GET /api/analytics/videos
 *   GET /api/analytics/video/:videoId
 *   GET /api/analytics/trends
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
var analytics_js_1 = require("../../routes/analytics.js");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(analytics_js_1).default; } });
//# sourceMappingURL=creator.routes.js.map