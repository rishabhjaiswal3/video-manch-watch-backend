import { Video } from '../app/media/model/Video.js';
import { WatchHistory } from '../app/playback/model/WatchHistory.js';
import { VideoEngagement } from '../app/social/model/VideoEngagement.js';
import { attachProfiles, mapVideoSummary } from './video.js';
import { getCachedJson, setCachedJson } from '../utils/cache.js';

const CANDIDATE_LIMIT = 150;
const HISTORY_LIMIT = 50;
const LIKED_LIMIT = 30;
const CACHE_TTL_ANON = 10 * 60 * 1000;   // 10 min
const CACHE_TTL_AUTH = 5 * 60 * 1000;     // 5 min
const MODEL_VERSION = 'v1.0-home-hybrid';

// --- Scoring weights ---
const WEIGHTS_ANON = { popularity: 0.55, recency: 0.35, diversity: 0.10 };
const WEIGHTS_AUTH = { preference: 0.35, popularity: 0.25, recency: 0.15, creatorAffinity: 0.15, diversity: 0.10 };

// --- Helpers ---

function recencyScore(video) {
  const ageMs = Date.now() - new Date(video.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  // Strong boost for first 7 days, gradual decay over 90 days
  if (ageDays <= 7) return 1;
  if (ageDays <= 30) return 0.8 - 0.3 * ((ageDays - 7) / 23);
  return Math.max(0, 0.5 - (ageDays - 30) / 120);
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

function buildUserProfile(watchedVideos, likedVideos) {
  const tagCounts = {};
  const genreCounts = {};
  const creatorCounts = {};

  // Watch history — base signal
  for (const video of watchedVideos) {
    for (const tag of video.tags || []) {
      const key = tag.toLowerCase();
      tagCounts[key] = (tagCounts[key] || 0) + 1;
    }
    for (const genre of video.genres || []) {
      const key = genre.toLowerCase();
      genreCounts[key] = (genreCounts[key] || 0) + 1;
    }
    if (video.userId) {
      creatorCounts[video.userId] = (creatorCounts[video.userId] || 0) + 1;
    }
  }

  // Likes — stronger signal, weight 2x
  for (const video of likedVideos) {
    for (const tag of video.tags || []) {
      const key = tag.toLowerCase();
      tagCounts[key] = (tagCounts[key] || 0) + 2;
    }
    for (const genre of video.genres || []) {
      const key = genre.toLowerCase();
      genreCounts[key] = (genreCounts[key] || 0) + 2;
    }
    if (video.userId) {
      creatorCounts[video.userId] = (creatorCounts[video.userId] || 0) + 2;
    }
  }

  const maxTagCount = Math.max(...Object.values(tagCounts), 1);
  const maxGenreCount = Math.max(...Object.values(genreCounts), 1);
  const maxCreatorCount = Math.max(...Object.values(creatorCounts), 1);

  return { tagCounts, genreCounts, creatorCounts, maxTagCount, maxGenreCount, maxCreatorCount };
}

function preferenceScore(candidate, profile) {
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

  return 0.55 * tagAffinity + 0.45 * genreAffinity;
}

function creatorAffinityScore(candidate, profile) {
  const count = profile.creatorCounts[candidate.userId] || 0;
  return Math.min(count / profile.maxCreatorCount, 1);
}

// Diversity: penalize seeing too many videos from the same creator in a row
function applyDiversityShuffle(scored) {
  const result = [];
  const creatorLastIndex = {};

  for (const item of scored) {
    const creatorId = item.video.userId;
    const lastIdx = creatorLastIndex[creatorId];
    // Penalize if same creator appeared in last 3 positions
    if (lastIdx !== undefined && result.length - lastIdx <= 3) {
      item.score *= 0.85;
    }
    result.push(item);
    creatorLastIndex[creatorId] = result.length - 1;
  }

  // Re-sort after penalty
  result.sort((a, b) => b.score - a.score);
  return result;
}

// --- Main export ---

export async function getRecommendations({ userId, limit = 10, contentType }) {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 50);
  const cacheKey = `recs:home:${userId || 'anon'}:${contentType || 'all'}`;

  // Check cache
  const cached = await getCachedJson(cacheKey);
  if (cached) {
    return {
      items: cached.items.slice(0, safeLimit),
      source: cached.source,
      modelVersion: MODEL_VERSION,
      total: Math.min(cached.items.length, safeLimit),
    };
  }

  // Fetch all eligible videos
  const videoQuery = {
    status: 'completed',
    visibility: 'listed',
    ...(contentType && { contentType }),
  };

  let userProfile = null;
  let watchedVideoIds = new Set();
  let source = 'global';

  if (userId) {
    // Fetch watch history + likes in parallel
    const [historyEntries, likedEngagements] = await Promise.all([
      WatchHistory.find({ userId })
        .sort({ watchedAt: -1 })
        .limit(HISTORY_LIMIT)
        .lean(),
      VideoEngagement.find({ userId, type: 'like' })
        .sort({ createdAt: -1 })
        .limit(LIKED_LIMIT)
        .lean(),
    ]);

    watchedVideoIds = new Set(historyEntries.map((e) => e.videoId));
    const likedVideoIds = likedEngagements.map((e) => e.videoId);
    const allProfileVideoIds = [...new Set([...watchedVideoIds, ...likedVideoIds])];

    if (allProfileVideoIds.length > 0) {
      const profileVideos = await Video.find(
        { videoId: { $in: allProfileVideoIds } },
        { tags: 1, genres: 1, userId: 1, videoId: 1 }
      ).lean();

      const watchedVideos = profileVideos.filter((v) => watchedVideoIds.has(v.videoId));
      const likedVideos = profileVideos.filter((v) => likedVideoIds.includes(v.videoId));

      userProfile = buildUserProfile(watchedVideos, likedVideos);
      source = 'personalized';
    }
  }

  // Fetch candidates — exclude already-watched for auth users
  const candidates = await Video.find({
    ...videoQuery,
    ...(watchedVideoIds.size > 0 && { videoId: { $nin: Array.from(watchedVideoIds) } }),
  })
    .sort({ viewCount: -1, createdAt: -1 })
    .limit(CANDIDATE_LIMIT)
    .lean();

  if (!candidates.length) {
    // Fallback: return most popular even if watched
    const fallback = await Video.find(videoQuery)
      .sort({ viewCount: -1 })
      .limit(safeLimit)
      .lean();

    const profileMap = await attachProfiles(fallback);
    const items = fallback.map((v) => mapVideoSummary(v, profileMap.get(v.userId)));

    const result = { items, source: 'global', modelVersion: MODEL_VERSION, total: items.length };
    await setCachedJson(cacheKey, result, CACHE_TTL_ANON);
    return result;
  }

  // Score candidates
  const popScores = buildPopularityScores(candidates);

  let scored;
  if (userId && userProfile) {
    scored = candidates.map((video, i) => ({
      video,
      score:
        WEIGHTS_AUTH.preference * preferenceScore(video, userProfile) +
        WEIGHTS_AUTH.popularity * popScores[i] +
        WEIGHTS_AUTH.recency * recencyScore(video) +
        WEIGHTS_AUTH.creatorAffinity * creatorAffinityScore(video, userProfile) +
        WEIGHTS_AUTH.diversity * Math.random() * 0.3, // slight randomness for discovery
    }));
  } else {
    scored = candidates.map((video, i) => ({
      video,
      score:
        WEIGHTS_ANON.popularity * popScores[i] +
        WEIGHTS_ANON.recency * recencyScore(video) +
        WEIGHTS_ANON.diversity * Math.random() * 0.3,
    }));
  }

  // Sort by score, apply diversity penalty, then re-sort
  scored.sort((a, b) => b.score - a.score || (b.video.viewCount || 0) - (a.video.viewCount || 0));
  scored = applyDiversityShuffle(scored);

  // Take top results, attach profiles, map to response
  const topVideos = scored.slice(0, safeLimit).map((s) => s.video);
  const profileMap = await attachProfiles(topVideos);
  const items = topVideos.map((v) => mapVideoSummary(v, profileMap.get(v.userId)));

  // Cache
  const ttl = userId ? CACHE_TTL_AUTH : CACHE_TTL_ANON;
  await setCachedJson(cacheKey, { items, source }, ttl);

  return { items, source, modelVersion: MODEL_VERSION, total: items.length };
}
