import { Video } from '../app/media/model/Video.js';
import { WatchLater } from '../app/social/model/WatchLater.js';
import { AppError } from '../middleware/errorHandler.js';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const mapVideoSummary = (video, extra = {}) => ({
  videoId: video.videoId,
  title: video.title,
  thumbnail: video.thumbnail,
  duration: video.duration,
  contentType: video.contentType,
  userId: video.userId,
  createdAt: video.createdAt,
  ...extra,
});

export async function add(userId, videoId) {
  if (!userId || !videoId) {
    throw new AppError('User ID and video ID are required', 400);
  }

  const video = await Video.findOne({ videoId }).lean();
  if (!video) {
    throw new AppError('Video not found', 404);
  }

  await WatchLater.updateOne(
    { userId, videoId },
    { $setOnInsert: { userId, videoId, addedAt: new Date() } },
    { upsert: true }
  );

  return { saved: true };
}

export async function remove(userId, videoId) {
  if (!userId || !videoId) {
    throw new AppError('User ID and video ID are required', 400);
  }

  await WatchLater.deleteOne({ userId, videoId });
  return { saved: false };
}

export async function getList(userId, page, limit) {
  if (!userId) {
    throw new AppError('User ID is required', 400);
  }

  const safePage = toPositiveInt(page, 1);
  const safeLimit = Math.min(toPositiveInt(limit, 20), 100);
  const skip = (safePage - 1) * safeLimit;

  const [entries, total] = await Promise.all([
    WatchLater.find({ userId }).sort({ addedAt: -1 }).skip(skip).limit(safeLimit).lean(),
    WatchLater.countDocuments({ userId }),
  ]);

  const videoIds = entries.map((entry) => entry.videoId);
  const videos = await Video.find({ videoId: { $in: videoIds } }).lean();
  const videoMap = new Map(videos.map((video) => [video.videoId, video]));

  const items = entries
    .map((entry) => {
      const video = videoMap.get(entry.videoId);
      if (!video) return null;
      return mapVideoSummary(video, { addedAt: entry.addedAt });
    })
    .filter(Boolean);

  return {
    videos: items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

export async function getStatus(userId, videoId) {
  if (!userId || !videoId) {
    throw new AppError('User ID and video ID are required', 400);
  }

  const existing = await WatchLater.exists({ userId, videoId });
  return { saved: Boolean(existing) };
}
