import { Router } from 'express';
import { CategoryController } from './controllers/category.controller.js';

const router = Router();
const categoryController = new CategoryController();

// Public — no auth required
router.get('/', (req, res) => categoryController.listPublic(req, res));

export default router;
