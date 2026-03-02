import { Router } from 'express';
import { ReelReportController } from './controllers/reelReport.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { createReelReportSchema } from '../../shared/schemas/social.js';

const router = Router();
const reelReportController = new ReelReportController();

router.post('/reels', validate(createReelReportSchema), (req, res) =>
  reelReportController.reportReel(req, res)
);

export default router;
