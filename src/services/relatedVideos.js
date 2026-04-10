import { Video } from '../app/media/model/Video.js';
import { WatchHistory } from '../app/playback/model/WatchHistory.js';
import { attachProfiles, mapVideoSummary } from './video.js';
import { getCachedJson, setCachedJson } from '../utils/cache.js';
import { AppError } from '../middleware/errorHandler.js';

const CANDIDATE_LIMIT = 80;
const FALLBACK_MIN = 20;
const CACHE_TTL_ANON = 10 * 60 * 1000;
const CACHE_TTL_AUTH = 5 * 60 * 1000;
const HISTORY_LIMIT = 50;

// --- Scoring weights ---
const WEIGHTS_ANON = { content: 0.55, popularity: 0.30, recency: 0.15, personal: 0.00 };
const WEIGHTS_AUTH = { content: 0.45, popularity: 0.25, recency: 0.10, personal: 0.20 };

// --- Helpers ---

function jaccard(a, b) {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function contentScore(candidate, source) {
  const tagOverlap = jaccard(candidate.tags, source.tags);
  const genreOverlap = jaccard(candidate.genres, source.genres);
  const sameCreator = candidate.userId === source.userId ? 1 : 0;
  const sameType = candidate.contentType === source.contentType ? 1 : 0;
  return 0.40 * tagOverlap + 0.35 * genreOverlap + 0.15 * sameCreator + 0.10 * sameType;
}

function recencyScore(candidate) {
  const ageMs = Date.now() - new Date(candidate.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - ageDays / 365);
}

function buildPopularityScores(candidates) {
  const maxViews = Math.max(...candidates.map((c) => c.viewCount || 0), 1);
  const logMaxViews = Math.log10(maxViews + 1);
  const engagementRates = candidates.map((c) => (c.likeCount || 0) / Math.max(c.viewCount || 0, 1));
  const maxEngagement = Math.max(...engagementRates, 0.001);

  return candidates.map((c, i) => {
    const normalizedViews = logMaxViews > 0 ? Math.log10((c.viewCount || 0) + 1) / logMaxViews : 0;
    const normalizedEngagement = Math.min(engagementRates[i] / maxEngagement, 1);
    return 0.6 * normalizedViews + 0.4 * normalizedEngagement;
  });
}

function buildUserProfile(watchedVideos) {
  const tagCounts = {};
  const genreCounts = {};
  const creatorIds = new Set();

  for (const video of watchedVideos) {
    for (const tag of video.tags || []) {
      const key = tag.toLowerCase();
      tagCounts[key] = (tagCounts[key] || 0) + 1;
    }
    for (const genre of video.genres || []) {
      const key = genre.toLowerCase();
      genreCounts[key] = (genreCounts[key] || 0) + 1;
    }
    if (video.userId) creatorIds.add(video.userId);
  }

  const maxTagCount = Math.max(...Object.values(tagCounts), 1);
  const maxGenreCount = Math.max(...Object.values(genreCounts), 1);

  return { tagCounts, genreCounts, creatorIds, maxTagCount, maxGenreCount };
}

function personalScore(candidate, profile) {
  if (!profile) return 0;

  let tagAffinity = 0;
  for (const tag of candidate.tags || []) {
    tagAffinity += profile.tagCounts[tag.toLowerCase()] || 0;
  }
  tagAffinity = Math.min(tagAffinity / profile.maxTagCount, 1);

  let genreAffinity = 0;
  for (const genre of candidate.genres || []) {
    genreAffinity += profile.genreCounts[genre.toLowerCase()] || 0;
  }
  genreAffinity = Math.min(genreAffinity / profile.maxGenreCount, 1);

  const creatorAffinity = profile.creatorIds.has(candidate.userId) ? 1 : 0;

  return 0.45 * tagAffinity + 0.35 * genreAffinity + 0.20 * creatorAffinity;
}

// --- Main export ---

export async function getRelatedVideos({ videoId, userId, page = 1, limit = 15 }) {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 50);
  const cacheKey = `related:${videoId}:${userId || 'anon'}`;

  // Check cache for the full ranked list
  const cached = await getCachedJson(cacheKey);
  if (cached) {
    const start = (safePage - 1) * safeLimit;
    const pageItems = cached.ranked.slice(start, start + safeLimit);
    return {
      videos: pageItems,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: cached.ranked.length,
        totalPages: Math.max(1, Math.ceil(cached.ranked.length / safeLimit)),
      },
      source: cached.source,
      modelVersion: 'v1.0-content-hybrid',
    };
  }

  // Fetch source video
  const source = await Video.findOne({ videoId, status: 'completed' }).lean();
  if (!source) {
    throw new AppError('Video not found', 404);
  }

  // Build candidate query — match on tags, genres, or same creator
  const orConditions = [];
  if (source.tags?.length) orConditions.push({ tags: { $in: source.tags } });
  if (source.genres?.length) orConditions.push({ genres: { $in: source.genres } });
  if (source.userId) orConditions.push({ userId: source.userId });

  const candidateQuery = {
    videoId: { $ne: source.videoId },
    status: 'completed',
    visibility: 'listed',
    ...(source.contentType && { contentType: source.contentType }),
    ...(orConditions.length > 0 && { $or: orConditions }),
  };

  // Fetch candidates + user profile in parallel
  const candidatePromise = Video.find(candidateQuery)
    .limit(CANDIDATE_LIMIT)
    .lean();

  let userProfilePromise = Promise.resolve(null);
  if (userId) {
    userProfilePromise = WatchHistory.find({ userId })
      .sort({ watchedAt: -1 })
      .limit(HISTORY_LIMIT)
      .lean()
      .then(async (entries) => {
        if (!entries.length) return null;
        const watchedVideoIds = entries.map((e) => e.videoId);
        const watchedVideos = await Video.find(
          { videoId: { $in: watchedVideoIds } },
          { tags: 1, genres: 1, userId: 1 }
        ).lean();
        return buildUserProfile(watchedVideos);
      });
  }

  let [candidates, userProfile] = await Promise.all([candidatePromise, userProfilePromise]);

  // Fallback: if too few candidates, fetch popular videos of same type
  if (candidates.length < FALLBACK_MIN) {
    const existingIds = new Set(candidates.map((c) => c.videoId));
    existingIds.add(source.videoId);
    const fallback = await Video.find({
      videoId: { $nin: Array.from(existingIds) },
      status: 'completed',
      visibility: 'listed',
      ...(source.contentType && { contentType: source.contentType }),
    })
      .sort({ viewCount: -1 })
      .limit(CANDIDATE_LIMIT - candidates.length)
      .lean();
    candidates = [...candidates, ...fallback];
  }

  if (!candidates.length) {
    return {
      videos: [],
      pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 1 },
      source: 'empty',
      modelVersion: 'v1.0-content-hybrid',
    };
  }

  // Score all candidates
  const weights = userId && userProfile ? WEIGHTS_AUTH : WEIGHTS_ANON;
  const popScores = buildPopularityScores(candidates);

  const scored = candidates.map((candidate, i) => ({
    video: candidate,
    score:
      weights.content * contentScore(candidate, source) +
      weights.popularity * popScores[i] +
      weights.recency * recencyScore(candidate) +
      weights.personal * personalScore(candidate, userProfile),
  }));

  // Sort by score descending, break ties with viewCount
  scored.sort((a, b) => b.score - a.score || (b.video.viewCount || 0) - (a.video.viewCount || 0));

  // Attach profiles and map to response format
  const rankedVideos = scored.map((s) => s.video);
  const profileMap = await attachProfiles(rankedVideos);
  const mapped = rankedVideos.map((video) => mapVideoSummary(video, profileMap.get(video.userId)));

  // Cache the full ranked list
  const source_ = userId && userProfile ? 'personalized' : 'content-based';
  const ttl = userId ? CACHE_TTL_AUTH : CACHE_TTL_ANON;
  await setCachedJson(cacheKey, { ranked: mapped, source: source_ }, ttl);

  // Paginate
  const start = (safePage - 1) * safeLimit;
  const pageItems = mapped.slice(start, start + safeLimit);

  return {
    videos: pageItems,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: mapped.length,
      totalPages: Math.max(1, Math.ceil(mapped.length / safeLimit)),
    },
    source: source_,
    modelVersion: 'v1.0-content-hybrid',
  };
}
