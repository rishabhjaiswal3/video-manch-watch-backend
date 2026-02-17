"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const video_controller_js_1 = require("./controllers/video.controller.js");
const router = (0, express_1.Router)();
const videoController = new video_controller_js_1.VideoController();
router.get('/', (req, res) => videoController.listVideos(req, res));
router.get('/type/reels', (req, res) => videoController.listReels(req, res));
router.get('/:videoId', (req, res) => videoController.getVideo(req, res));
exports.default = router;
//# sourceMappingURL=videos.routes.js.map