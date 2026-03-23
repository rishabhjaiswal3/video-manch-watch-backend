import { AppConfig } from '../app/config/model/AppConfig.js';

const DEFAULT_PLAYER_URL = 'https://video-manch-player.videomanch.com/v2.0.0/videomanch-player.js';

export async function getPlayerConfig() {
  const config = await AppConfig.findOne({ key: 'player' }).lean();
  return config?.playerUrl || DEFAULT_PLAYER_URL;
}
