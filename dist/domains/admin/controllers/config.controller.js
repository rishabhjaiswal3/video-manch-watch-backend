"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigController = void 0;
const config_service_js_1 = require("../services/config.service.js");
const configService = new config_service_js_1.ConfigService();
class ConfigController {
    /**
     * GET /api/config/player
     */
    async getPlayerConfig(req, res) {
        try {
            const playerUrl = await configService.getPlayerUrl();
            return res.status(200).json({
                success: true,
                data: { playerUrl },
            });
        }
        catch (error) {
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
    async updatePlayerConfig(req, res) {
        try {
            const { playerUrl } = req.body || {};
            const updatedUrl = await configService.updatePlayerUrl(playerUrl);
            return res.status(200).json({
                success: true,
                data: { playerUrl: updatedUrl },
            });
        }
        catch (error) {
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
exports.ConfigController = ConfigController;
//# sourceMappingURL=config.controller.js.map