import { Request, Response } from 'express';
import { WatchLaterService } from '../services/watchLater.service.js';

const service = new WatchLaterService();

export class WatchLaterController {
  async add(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { videoId } = req.params;
      const result = await service.add(userId, videoId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      if (err.message === 'Video not found') {
        res.status(404).json({ success: false, error: 'Video not found' });
      } else {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { videoId } = req.params;
      const result = await service.remove(userId, videoId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getList(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
      const result = await service.getList(userId, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { videoId } = req.params;
      const result = await service.getStatus(userId, videoId);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
