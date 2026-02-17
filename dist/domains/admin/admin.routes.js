"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../../middleware/auth.js");
const adminAuth_js_1 = require("../../middleware/adminAuth.js");
const admin_controller_js_1 = require("./controllers/admin.controller.js");
const router = (0, express_1.Router)();
const adminController = new admin_controller_js_1.AdminController();
// Shared middleware for all admin routes
router.use(auth_js_1.authenticate);
router.use(adminAuth_js_1.requireAdmin);
// User Management
router.get('/users', (req, res) => adminController.getUsers(req, res));
router.get('/users/:userId', (req, res) => adminController.getUser(req, res));
router.patch('/users/:userId/role', (req, res) => adminController.updateUserRole(req, res));
// Platform Stats
router.get('/stats', (req, res) => adminController.getStats(req, res));
exports.default = router;
//# sourceMappingURL=admin.routes.js.map