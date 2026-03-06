"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reelReport_controller_js_1 = require("./controllers/reelReport.controller.js");
const validate_js_1 = require("../../shared/middleware/validate.js");
const social_js_1 = require("../../shared/schemas/social.js");
const router = (0, express_1.Router)();
const reelReportController = new reelReport_controller_js_1.ReelReportController();
router.post('/reels', (0, validate_js_1.validate)(social_js_1.createReelReportSchema), (req, res) => reelReportController.reportReel(req, res));
exports.default = router;
//# sourceMappingURL=reelReport.routes.js.map