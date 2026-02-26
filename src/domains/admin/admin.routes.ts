import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';
import { requireAdmin } from '../../shared/middleware/adminAuth.js';
import { AdminController } from './controllers/admin.controller.js';
import { CategoryController } from './controllers/category.controller.js';

const router = Router();
const adminController = new AdminController();
const categoryController = new CategoryController();

// Shared middleware for all admin routes
router.use(authenticate);
router.use(requireAdmin);

// User Management
router.get('/users', (req, res) => adminController.getUsers(req, res));
router.get('/users/:userId', (req, res) => adminController.getUser(req, res));
router.patch('/users/:userId/role', (req, res) => adminController.updateUserRole(req, res));

// Platform Stats
router.get('/stats', (req, res) => adminController.getStats(req, res));

// Category management (admin only)
router.get('/categories', (req, res) => categoryController.listAll(req, res));
router.post('/categories', (req, res) => categoryController.create(req, res));
router.patch('/categories/:categoryId', (req, res) => categoryController.update(req, res));
router.delete('/categories/:categoryId', (req, res) => categoryController.delete(req, res));

export default router;
