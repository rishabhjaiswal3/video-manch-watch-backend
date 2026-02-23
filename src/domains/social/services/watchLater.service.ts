import { WatchLater } from '../../../shared/models/WatchLater.js';
import { Video } from '../../../shared/models/Video.js';

export class WatchLaterService {
  /** Add a video to the user's watch later list */
  async add(userId: string, videoId: string): Promise<{ added: boolean; alreadyExists: boolean }> {
    const video = await Video.findOne({ videoId, status: 'completed' }).lean();
    if (!video) throw new Error('Video not found');

    try {
      await WatchLater.create({ userId, videoId });
      return { added: true, alreadyExists: false };
    } catch (err: any) {
      if (err.code === 11000) {
        // Duplicate key — already in list
        return { added: false, alreadyExists: true };
      }
      throw err;
    }
  }

  /** Remove a video from watch later */
  async remove(userId: string, videoId: string): Promise<{ removed: boolean }> {
    const result = await WatchLater.deleteOne({ userId, videoId });
    return { removed: result.deletedCount > 0 };
  }

  /** Get all watch later videos for a user (paginated), joined with video data */
  async getList(
    userId: string,
    page: number,
    limit: number
  ): Promise<{
    videos: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      WatchLater.find({ userId }).sort({ addedAt: -1 }).skip(skip).limit(limit).lean(),
      WatchLater.countDocuments({ userId }),
    ]);

    const videoIds = entries.map(e => e.videoId);
    const videos = await Video.find({ videoId: { $in: videoIds }, status: 'completed' })
      .select('videoId title description thumbnail duration contentType tags createdAt userId userType')
      .lean();

    // Preserve watch-later order
    const videoMap = new Map(videos.map(v => [v.videoId, v]));
    const ordered = entries
      .map(e => {
        const v = videoMap.get(e.videoId);
        if (!v) return null;
        return { ...v, addedAt: e.addedAt };
      })
      .filter(Boolean);

    return {
      videos: ordered,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Check if a video is in the user's watch later */
  async getStatus(userId: string, videoId: string): Promise<{ saved: boolean }> {
    const entry = await WatchLater.findOne({ userId, videoId }).lean();
    return { saved: !!entry };
  }
}
