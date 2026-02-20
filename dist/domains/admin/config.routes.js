"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const adminAuth_js_1 = require("../../middleware/adminAuth.js");
const config_controller_js_1 = require("./controllers/config.controller.js");
const router = (0, express_1.Router)();
const configController = new config_controller_js_1.ConfigController();
// Public route (player script URL needs to be accessible by everyone)
router.get('/player', (req, res) => configController.getPlayerConfig(req, res));
// Admin-only route for updates
router.post('/player', auth_js_1.authenticate, adminAuth_js_1.requireAdmin, (req, res) => configController.updatePlayerConfig(req, res));
exports.default = router;
//# sourceMappingURL=config.routes.js.map