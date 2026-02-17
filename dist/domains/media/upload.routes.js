"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const rateLimiter_js_1 = require("../../middleware/rateLimiter.js");
const upload_controller_js_1 = require("./controllers/upload.controller.js");
const router = (0, express_1.Router)();
const uploadController = new upload_controller_js_1.UploadController();
// Shared middleware
router.use(auth_js_1.authenticate);
// List/Stats (Public-ish but authenticated)
router.get('/videos', (req, res) => uploadController.listVideos(req, res));
router.get('/queue-stats', (req, res) => uploadController.getQueueStats(req, res));
router.get('/status/:videoId', (req, res) => uploadController.getStatus(req, res));
router.get('/raw-url/:videoId', (req, res) => uploadController.getRawUrl(req, res));
// Actions (Protected/Mutative)
router.post('/init', rateLimiter_js_1.uploadLimiter, (req, res) => uploadController.init(req, res));
router.post('/complete', (req, res) => uploadController.complete(req, res));
router.post('/retry/:videoId', (req, res) => uploadController.retry(req, res));
router.patch('/video/:videoId', (req, res) => uploadController.update(req, res));
router.delete('/video/:videoId', (req, res) => uploadController.delete(req, res));
exports.default = router;
//# sourceMappingURL=upload.routes.js.map