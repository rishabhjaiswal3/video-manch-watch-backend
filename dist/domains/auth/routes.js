"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_js_1 = require("./controllers/auth.controller.js");
const validate_js_1 = require("../../middleware/validate.js");
const auth_js_1 = require("../../schemas/auth.js");
const rateLimiter_js_1 = require("../../middleware/rateLimiter.js");
const auth_js_2 = require("../../middleware/auth.js");
const router = (0, express_1.Router)();
const authController = new auth_controller_js_1.AuthController();
// Apply stricter rate limiting to all auth routes
router.use(rateLimiter_js_1.authLimiter);
/**
 * Public Routes
 */
router.post('/signup', (0, validate_js_1.validate)(auth_js_1.signupSchema), (req, res) => authController.signup(req, res));
router.post('/login', (0, validate_js_1.validate)(auth_js_1.loginSchema), (req, res) => authController.login(req, res));
router.post('/refresh', (0, validate_js_1.validate)(auth_js_1.refreshTokenSchema), (req, res) => authController.refresh(req, res));
/**
 * Protected Routes
 */
router.post('/logout', auth_js_2.authenticate, (req, res) => authController.logout(req, res));
exports.default = router;
//# sourceMappingURL=routes.js.map