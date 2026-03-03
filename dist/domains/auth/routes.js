"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_js_1 = require("./controllers/auth.controller.js");
const validate_js_1 = require("../../shared/middleware/validate.js");
const auth_js_1 = require("../../shared/schemas/auth.js");
const rateLimiter_js_1 = require("../../shared/middleware/rateLimiter.js");
const router = (0, express_1.Router)();
const authController = new auth_controller_js_1.AuthController();
// Apply stricter rate limiting to all auth routes
router.use(rateLimiter_js_1.authLimiter);
/**
 * Public Routes
 */
router.post('/signup', (0, validate_js_1.validate)(auth_js_1.signupSchema), (req, res) => authController.signup(req, res));
router.post('/login', (0, validate_js_1.validate)(auth_js_1.loginSchema), (req, res) => authController.login(req, res));
router.post('/login/user', (0, validate_js_1.validate)(auth_js_1.roleLoginFlowSchema), rateLimiter_js_1.otpVerifyLimiter, (req, res) => authController.loginUser(req, res));
router.post('/login/creator', (0, validate_js_1.validate)(auth_js_1.roleLoginFlowSchema), rateLimiter_js_1.otpVerifyLimiter, (req, res) => authController.loginCreator(req, res));
router.post('/password/user/request', (0, validate_js_1.validate)(auth_js_1.passwordResetRequestSchema), (req, res) => authController.requestUserPasswordReset(req, res));
router.post('/password/creator/request', (0, validate_js_1.validate)(auth_js_1.passwordResetRequestSchema), (req, res) => authController.requestCreatorPasswordReset(req, res));
router.post('/password/user/reset', (0, validate_js_1.validate)(auth_js_1.passwordResetConfirmSchema), (req, res) => authController.resetUserPassword(req, res));
router.post('/password/creator/reset', (0, validate_js_1.validate)(auth_js_1.passwordResetConfirmSchema), (req, res) => authController.resetCreatorPassword(req, res));
router.post('/refresh', (0, validate_js_1.validate)(auth_js_1.refreshTokenSchema), (req, res) => authController.refresh(req, res));
/**
 * Protected Routes
 */
router.post('/logout', (req, res) => authController.logout(req, res));
exports.default = router;
//# sourceMappingURL=routes.js.map