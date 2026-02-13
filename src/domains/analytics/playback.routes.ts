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

export { default } from '../../routes/playback.js';
