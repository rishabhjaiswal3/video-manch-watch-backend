import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { ConfigController } from './controllers/config.controller.js';

const router = Router();
const configController = new ConfigController();

// Public route (player script URL needs to be accessible by everyone)
router.get('/player', (req, res) => configController.getPlayerConfig(req, res));

// Admin-only route for updates
router.post('/player', authenticate, requireAdmin, (req, res) => configController.updatePlayerConfig(req, res));

export default router;
