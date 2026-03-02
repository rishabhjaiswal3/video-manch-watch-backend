import { Request, Response } from 'express';
import { ReelReportService } from '../services/reelReport.service.js';

const reelReportService = new ReelReportService();

export class ReelReportController {
  async reportReel(req: Request, res: Response) {
    try {
      const payload = req.body;
      const result = await reelReportService.createReelReport({
        ...payload,
        reporterIp: req.ip,
        reporterUserAgent: req.get('user-agent') || '',
      });

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[REEL-REPORT] Submit report error:', error);

      if (error.message === 'Video not found') {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to submit report',
      });
    }
  }
}
