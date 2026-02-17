"use strict";
/**
 * MEDIA DOMAIN — Playback / Streaming Routes
 *
 * Handles signed HLS stream URLs, master playlist rewriting.
 * Used by: Watch Website, Creator Portal
 *
 * Endpoints:
 *   GET /api/media/playback/stream/:videoId
 *   GET /api/media/playback/master/:videoId
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
// The analytics-related playback routes are in the analytics domain
var playback_js_1 = require("../../routes/playback.js");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(playback_js_1).default; } });
//# sourceMappingURL=playback.routes.js.map