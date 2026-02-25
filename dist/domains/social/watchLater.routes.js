"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const watchLater_controller_js_1 = require("./controllers/watchLater.controller.js");
const auth_js_1 = require("../../shared/middleware/auth.js");
const router = (0, express_1.Router)();
const controller = new watchLater_controller_js_1.WatchLaterController();
// All routes require auth
router.use(auth_js_1.authenticate);
// GET  /watch-later           — get user's watch later list
router.get('/', (req, res) => controller.getList(req, res));
// POST /watch-later/:videoId  — add video to watch later
router.post('/:videoId', (req, res) => controller.add(req, res));
// DELETE /watch-later/:videoId — remove from watch later
router.delete('/:videoId', (req, res) => controller.remove(req, res));
// GET /watch-later/:videoId/status — check if saved
router.get('/:videoId/status', (req, res) => controller.getStatus(req, res));
exports.default = router;
//# sourceMappingURL=watchLater.routes.js.map