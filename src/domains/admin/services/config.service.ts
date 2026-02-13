import { AppConfig } from '../../../models/AppConfig.js';

const DEFAULT_PLAYER_URL =
    process.env.PLAYER_SCRIPT_URL ||
    'https://video-manch-player.videomanch.com/v.1.0.0/videomanch-player.js';

export class ConfigService {
    /**
     * Get current player script URL
     */
    async getPlayerUrl() {
        const config = await AppConfig.findOne({ key: 'player' }).lean();
        return config?.playerUrl || DEFAULT_PLAYER_URL;
    }

    /**
     * Update player script URL
     */
    async updatePlayerUrl(newUrl: string) {
        if (!newUrl || typeof newUrl !== 'string') {
            throw new Error('playerUrl is required');
        }

        try {
            const parsed = new URL(newUrl);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                throw new Error('playerUrl must be http or https');
            }
        } catch {
            throw new Error('playerUrl must be a valid URL');
        }

        const config = await AppConfig.findOneAndUpdate(
            { key: 'player' },
            { $set: { playerUrl: newUrl } },
            { new: true, upsert: true }
        ).lean();

        return config?.playerUrl || newUrl;
    }
}
