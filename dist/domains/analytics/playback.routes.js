"use strict";
/**
 * ANALYTICS DOMAIN — Playback Analytics Routes
 *
 * Real-time viewer tracking, watch history, user stats.
 * Events ingestion → Redis → Worker → MongoDB.
 * Used by: Watch Website, Creator Portal, Player
 *
 * Endpoints:
 *   POST /api/playback/events
 *   GET  /api/playback/stats/:videoId
 *   GET  /api/playback/concurrent/:videoId
 *   GET  /api/playback/live
 *   GET  /api/playback/overview
 *   GET  /api/playback/user/:userId/history
 *   GET  /api/playback/user/:userId/continue
 *   GET  /api/playback/user/:userId/stats
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
var playback_route_impl_js_1 = require("./routes/playback.route.impl.js");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(playback_route_impl_js_1).default; } });
//# sourceMappingURL=playback.routes.js.map