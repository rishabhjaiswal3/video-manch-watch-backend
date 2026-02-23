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

// The analytics-related playback routes are in the analytics domain
export { default } from '../analytics/playback.routes.js';
