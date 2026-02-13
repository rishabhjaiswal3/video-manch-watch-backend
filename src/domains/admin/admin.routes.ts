import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { AdminController } from './controllers/admin.controller.js';

const router = Router();
const adminController = new AdminController();

// Shared middleware for all admin routes
router.use(authenticate);
router.use(requireAdmin);

// User Management
router.get('/users', (req, res) => adminController.getUsers(req, res));
router.get('/users/:userId', (req, res) => adminController.getUser(req, res));
router.patch('/users/:userId/role', (req, res) => adminController.updateUserRole(req, res));

// Platform Stats
router.get('/stats', (req, res) => adminController.getStats(req, res));

export default router;
