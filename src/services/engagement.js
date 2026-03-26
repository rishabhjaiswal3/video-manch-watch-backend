import { VideoEngagement } from "../app/social/model/VideoEngagement.js";
import { Video } from "../app/media/model/Video.js";
import { getCachedJson, invalidateByPrefix, setCachedJson } from "../utils/cache.js";

const LIKED_VIDEOS_CACHE_TTL_MS = Number.parseInt(process.env.LIKED_VIDEOS_CACHE_TTL_MS || "30000", 10);

const normalizePagination = (page, limit) => {
  const p = Math.max(1, Number.parseInt(page || "1", 10) || 1);
  const l = Math.max(1, Math.min(100, Number.parseInt(limit || "20", 10) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
};

const getCounters = async (videoId) => {
  const [likeCount, dislikeCount] = await Promise.all([
    VideoEngagement.countDocuments({ videoId, type: "like" }),
    VideoEngagement.countDocuments({ videoId, type: "dislike" }),
  ]);
  return { likeCount, dislikeCount };
};

const invalidateUserLikedCache = async (userId) => {
  await invalidateByPrefix(`engagement:likedVideos:${userId}:`);
};

export async function likeVideo(userId, videoId) {
  if (!userId) throw new Error("Authentication required");
  if (!videoId) throw new Error("videoId is required");

  const video = await Video.findOne({ videoId }).select("videoId allowLikes allowDislikes").lean();
  if (!video) throw new Error("video not found");
  if (video.allowLikes === false) throw new Error("likes are disabled for this video");

  const existing = await VideoEngagement.findOne({ userId, videoId });
  if (!existing) {
    await VideoEngagement.create({ userId, videoId, type: "like" });
  } else if (existing.type !== "like") {
    existing.type = "like";
    await existing.save();
  }

  const counters = await getCounters(videoId);
  await Video.updateOne({ videoId }, { $set: counters });
  await invalidateUserLikedCache(userId);

  return {
    success: true,
    data: { ...counters, type: "like", isNew: !existing },
    version: Date.now(),
  };
}

export async function dislikeVideo(userId, videoId) {
  if (!userId) throw new Error("Authentication required");
  if (!videoId) throw new Error("videoId is required");

  const video = await Video.findOne({ videoId }).select("videoId allowDislikes").lean();
  if (!video) throw new Error("video not found");
  if (video.allowDislikes === false) throw new Error("dislikes are disabled for this video");

  const existing = await VideoEngagement.findOne({ userId, videoId });
  if (!existing) {
    await VideoEngagement.create({ userId, videoId, type: "dislike" });
  } else if (existing.type !== "dislike") {
    existing.type = "dislike";
    await existing.save();
  }

  const counters = await getCounters(videoId);
  await Video.updateOne({ videoId }, { $set: counters });
  await invalidateUserLikedCache(userId);

  return {
    success: true,
    data: { ...counters, type: "dislike", isNew: !existing },
    version: Date.now(),
  };
}

export async function removeEngagement(userId, videoId) {
  if (!userId) throw new Error("Authentication required");
  if (!videoId) throw new Error("videoId is required");

  await VideoEngagement.deleteOne({ userId, videoId });
  const counters = await getCounters(videoId);
  await Video.updateOne({ videoId }, { $set: counters });
  await invalidateUserLikedCache(userId);

  return {
    success: true,
    data: counters,
    version: Date.now(),
  };
}

export async function getVideoEngagement(videoId) {
  if (!videoId) throw new Error("videoId is required");
  const video = await Video.findOne({ videoId }).select("likeCount dislikeCount").lean();
  if (video) {
    return { likeCount: video.likeCount || 0, dislikeCount: video.dislikeCount || 0 };
  }
  return getCounters(videoId);
}

export async function getUserEngagementStatus(userId, videoId) {
  if (!userId) throw new Error("Authentication required");
  if (!videoId) throw new Error("videoId is required");

  const engagement = await VideoEngagement.findOne({ userId, videoId }).lean();
  if (!engagement) return { engaged: false };
  return { engaged: true, type: engagement.type };
}

export async function getUserLikedVideos(userId, page, limit) {
  if (!userId) throw new Error("Authentication required");
  const { page: p, limit: l, skip } = normalizePagination(page, limit);
  const cacheKey = `engagement:likedVideos:${userId}:${p}:${l}`;
  const cached = await getCachedJson(cacheKey);
  if (cached) return cached;

  const filter = { userId, type: "like" };
  const [engagements, total] = await Promise.all([
    VideoEngagement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
    VideoEngagement.countDocuments(filter),
  ]);

  const videoIds = engagements.map((engagement) => engagement.videoId);
  const videos = await Video.find({ videoId: { $in: videoIds } })
    .select("videoId title thumbnail thumbnails duration createdAt contentType totalViews")
    .lean();
  const videoMap = new Map(videos.map((video) => [video.videoId, video]));

  const likedVideos = videoIds
    .map((videoId) => videoMap.get(videoId))
    .filter(Boolean)
    .map((video) => ({
      videoId: video.videoId,
      title: video.title,
      thumbnail: video.thumbnail || video.thumbnails?.[0],
      duration: video.duration,
      createdAt: video.createdAt,
      contentType: video.contentType,
      views: video.totalViews || 0,
    }));

  const result = {
    videos: likedVideos,
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.max(1, Math.ceil(total / l)),
    },
  };
  await setCachedJson(cacheKey, result, LIKED_VIDEOS_CACHE_TTL_MS);
  return result;
}
