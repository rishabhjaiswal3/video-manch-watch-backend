import { Request, Response } from 'express';
import { ConfigService } from '../services/config.service.js';

const configService = new ConfigService();

export class ConfigController {
    /**
     * GET /api/config/player
     */
    async getPlayerConfig(req: Request, res: Response) {
        try {
            const playerUrl = await configService.getPlayerUrl();
            return res.status(200).json({
                success: true,
                data: { playerUrl },
            });
        } catch (error) {
            console.error('[CONFIG] Error fetching player config:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch player config',
            });
        }
    }

    /**
     * POST /api/config/player
     */
    async updatePlayerConfig(req: Request, res: Response) {
        try {
            const { playerUrl } = req.body || {};
            const updatedUrl = await configService.updatePlayerUrl(playerUrl);

            return res.status(200).json({
                success: true,
                data: { playerUrl: updatedUrl },
            });
        } catch (error: any) {
            if (error.message.includes('playerUrl')) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                error: 'Failed to update player config',
            });
        }
    }
}
