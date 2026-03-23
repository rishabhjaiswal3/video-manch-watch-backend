import * as configService from '../../../services/config.js';

export async function getPlayerConfig(_req, res) {
  try {
    const playerUrl = await configService.getPlayerConfig();
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
