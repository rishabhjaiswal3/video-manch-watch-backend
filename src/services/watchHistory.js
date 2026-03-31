import { WatchHistory } from '../app/playback/model/WatchHistory.js';
import { Video } from '../app/media/model/Video.js';

/**
 * Upsert watch progress for a user+video pair.
 * Called by the flush worker — never in the HTTP request path.
 */
export async function upsertProgress(userId, videoId, progressSecs, durationSecs, completionPct) {
  const completed = completionPct >= 90;
  await WatchHistory.findOneAndUpdate(
    { userId, videoId },
    {
      $set: {
        progressSecs,
        durationSecs,
        completionPct,
        completed,
        watchedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * Bulk upsert — used by the flush worker to process many records at once.
 * progressItems: Array<{ userId, videoId, progressSecs, durationSecs, completionPct }>
 */
export async function bulkUpsertProgress(progressItems) {
  if (!progressItems.length) return;

  const ops = progressItems.map(({ userId, videoId, progressSecs, durationSecs, completionPct }) => ({
    updateOne: {
      filter: { userId, videoId },
      update: {
        $set: {
          progressSecs,
          durationSecs,
          completionPct,
          completed: completionPct >= 90,
          watchedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  await WatchHistory.bulkWrite(ops, { ordered: false });
}

/**
 * Ensure a watch-history row exists as soon as authenticated playback starts.
 * This prevents the history page from staying empty when a user watches briefly
 * and leaves before a later progress/watchtime event is flushed.
 */
export async function bulkRegisterStartedHistory(historyItems) {
  if (!historyItems.length) return;

  const ops = historyItems.map(({ userId, videoId, watchedAt }) => ({
    updateOne: {
      filter: { userId, videoId },
      update: {
        $setOnInsert: {
          progressSecs: 0,
          durationSecs: 0,
          completionPct: 0,
          completed: false,
        },
        $set: {
          watchedAt: watchedAt ? new Date(watchedAt) : new Date(),
        },
      },
      upsert: true,
    },
  }));

  await WatchHistory.bulkWrite(ops, { ordered: false });
}

/**
 * Get paginated watch history for a user, with video metadata joined.
 */
export async function getHistory(userId, page = 1, limit = 20) {
  const skip = (Math.max(1, page) - 1) * limit;

  const entries = await WatchHistory.find({ userId })
    .sort({ watchedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  if (!entries.length) return { items: [], total: 0, page, limit };

  const videoIds = entries.map((e) => e.videoId);
  const videos = await Video.find(
    { videoId: { $in: videoIds }, status: 'completed' },
    { videoId: 1, title: 1, thumbnail: 1, thumbnails: 1, duration: 1, channel: 1, viewCount: 1, contentType: 1 }
  ).lean();

  const videoMap = Object.fromEntries(videos.map((v) => [v.videoId, v]));

  const items = entries
    .map((entry) => {
      const video = videoMap[entry.videoId];
      if (!video) return null;
      return {
        videoId:       entry.videoId,
        progressSecs:  entry.progressSecs,
        durationSecs:  entry.durationSecs,
        completionPct: entry.completionPct,
        completed:     entry.completed,
        watchedAt:     entry.watchedAt,
        video,
      };
    })
    .filter(Boolean);

  const total = await WatchHistory.countDocuments({ userId });
  return { items, total, page, limit };
}

/**
 * Get resume position for a single video.
 * Fast path — caller should check Redis first before calling this.
 */
export async function getProgress(userId, videoId) {
  const entry = await WatchHistory.findOne({ userId, videoId }, { progressSecs: 1, completionPct: 1 }).lean();
  if (!entry) return { progressSecs: 0, completionPct: 0 };
  return { progressSecs: entry.progressSecs, completionPct: entry.completionPct };
}
