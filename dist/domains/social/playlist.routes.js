"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../../shared/middleware/auth.js");
const playlist_controller_js_1 = require("./controllers/playlist.controller.js");
const router = (0, express_1.Router)();
const playlistController = new playlist_controller_js_1.PlaylistController();
router.use(auth_js_1.authenticate);
// List & create playlists
router.get('/', (req, res) => playlistController.list(req, res));
router.post('/', (req, res) => playlistController.create(req, res));
// Single playlist operations
router.get('/:playlistId', (req, res) => playlistController.get(req, res));
router.patch('/:playlistId', (req, res) => playlistController.update(req, res));
router.delete('/:playlistId', (req, res) => playlistController.delete(req, res));
// Video operations within a playlist
router.post('/:playlistId/videos/:videoId', (req, res) => playlistController.addVideo(req, res));
router.delete('/:playlistId/videos/:videoId', (req, res) => playlistController.removeVideo(req, res));
// Thumbnail upload
router.post('/:playlistId/thumbnail-url', (req, res) => playlistController.getThumbnailUploadUrl(req, res));
router.patch('/:playlistId/thumbnail', (req, res) => playlistController.saveThumbnail(req, res));
exports.default = router;
//# sourceMappingURL=playlist.routes.js.map