import { Router } from 'express';
import { AuthController } from './controllers/auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { signupSchema, loginSchema, refreshTokenSchema } from '../../schemas/auth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();
const authController = new AuthController();

// Apply stricter rate limiting to all auth routes
router.use(authLimiter as any);

/**
 * Public Routes
 */
router.post('/signup', validate(signupSchema), (req, res) => authController.signup(req, res));
router.post('/login', validate(loginSchema), (req, res) => authController.login(req, res));
router.post('/refresh', validate(refreshTokenSchema), (req, res) => authController.refresh(req, res));

/**
 * Protected Routes
 */
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));

export default router;
