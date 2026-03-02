import { v4 as uuidv4 } from 'uuid';
import { ReelReport } from '../../../shared/models/ReelReport.js';
import { Video } from '../../../shared/models/Video.js';
import type { CreateReelReportInput } from '../../../shared/schemas/social.js';

type CreateReelReportRequest = CreateReelReportInput & {
  reporterIp?: string;
  reporterUserAgent?: string;
};

export class ReelReportService {
  async createReelReport(input: CreateReelReportRequest): Promise<{ reportId: string; status: 'pending' }> {
    const video = await Video.findOne({ videoId: input.videoId, status: 'completed' }).select('videoId').lean();
    if (!video) {
      throw new Error('Video not found');
    }

    const reportId = uuidv4();
    await ReelReport.create({
      reportId,
      videoId: input.videoId,
      reason: input.reason,
      details: input.details || '',
      source: input.source,
      submittedAt: input.submittedAt,
      reporterIp: input.reporterIp,
      reporterUserAgent: input.reporterUserAgent,
      status: 'pending',
    });

    return {
      reportId,
      status: 'pending',
    };
  }
}
