import { Router, Request, Response } from 'express';
import { AppConfig } from '../models/AppConfig.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

const DEFAULT_PLAYER_URL =
  process.env.PLAYER_SCRIPT_URL ||
  'https://video-manch-player.videomanch.com/v.1.0.0/videomanch-player.js';

/**
 * GET /api/config/player
 * Public: get current player script URL
 */
router.get('/player', async (_req: Request, res: Response) => {
  try {
    const config = await AppConfig.findOne({ key: 'player' }).lean();
    return res.status(200).json({
      success: true,
      data: {
        playerUrl: config?.playerUrl || DEFAULT_PLAYER_URL,
      },
    });
  } catch (error) {
    console.error('[CONFIG] Error fetching player config:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch player config',
    });
  }
});

/**
 * POST /api/config/player
 * Admin-only: update player URL
 */
router.post('/player', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { playerUrl } = req.body || {};

    if (!playerUrl || typeof playerUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'playerUrl is required',
      });
    }

    let parsed: URL | null = null;
    try {
      parsed = new URL(playerUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'playerUrl must be a valid URL',
      });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({
        success: false,
        error: 'playerUrl must be http or https',
      });
    }

    const config = await AppConfig.findOneAndUpdate(
      { key: 'player' },
      { $set: { playerUrl } },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      data: {
        playerUrl: config?.playerUrl || playerUrl,
      },
    });
  } catch (error) {
    console.error('[CONFIG] Error updating player config:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update player config',
    });
  }
});

export default router;
