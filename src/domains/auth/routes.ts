import { Router } from 'express';
import { AuthController } from './controllers/auth.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  signupSchema,
  loginSchema,
  roleLoginFlowSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  refreshTokenSchema,
} from '../../shared/schemas/auth.js';
import { authLimiter, otpVerifyLimiter } from '../../shared/middleware/rateLimiter.js';

const router = Router();
const authController = new AuthController();

// Apply stricter rate limiting to all auth routes
router.use(authLimiter as any);

/**
 * Public Routes
 */
router.post('/signup', validate(signupSchema), (req, res) => authController.signup(req, res));
router.post('/login', validate(loginSchema), (req, res) => authController.login(req, res));
router.post('/login/user', validate(roleLoginFlowSchema), otpVerifyLimiter as any, (req, res) => authController.loginUser(req, res));
router.post('/login/creator', validate(roleLoginFlowSchema), otpVerifyLimiter as any, (req, res) => authController.loginCreator(req, res));
router.post('/password/user/request', validate(passwordResetRequestSchema), (req, res) =>
  authController.requestUserPasswordReset(req, res)
);
router.post('/password/creator/request', validate(passwordResetRequestSchema), (req, res) =>
  authController.requestCreatorPasswordReset(req, res)
);
router.post('/password/user/reset', validate(passwordResetConfirmSchema), (req, res) =>
  authController.resetUserPassword(req, res)
);
router.post('/password/creator/reset', validate(passwordResetConfirmSchema), (req, res) =>
  authController.resetCreatorPassword(req, res)
);
router.post('/refresh', validate(refreshTokenSchema), (req, res) => authController.refresh(req, res));

/**
 * Protected Routes
 */
router.post('/logout', (req, res) => authController.logout(req, res));

export default router;
