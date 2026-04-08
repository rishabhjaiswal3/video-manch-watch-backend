import { Video } from '../app/media/model/Video.js';
import { Profile } from '../app/user/model/Profile.js';
import { WatchHistory } from '../app/playback/model/WatchHistory.js';
import { attachProfiles, mapVideoSummary } from './video.js';
import { getCachedJson, setCachedJson } from '../utils/cache.js';

const TEXT_SEARCH_LIMIT = 100;
const REGEX_FALLBACK_THRESHOLD = 5;
const REGEX_FALLBACK_LIMIT = 30;
const SEARCH_CACHE_TTL = 2 * 60 * 1000;
const SUGGEST_CACHE_TTL = 5 * 60 * 1000;
const HISTORY_LIMIT = 50;

const WEIGHTS_ANON = { text: 0.50, popularity: 0.30, recency: 0.20, personal: 0.00 };
const WEIGHTS_AUTH = { text: 0.40, popularity: 0.25, recency: 0.15, personal: 0.20 };

// --- Helpers (shared patterns with relatedVideos.js) ---

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function recencyScore(video) {
  const ageMs = Date.now() - new Date(video.createdAt).getTime();
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

// --- Main exports ---

export async function searchVideos({ query, contentType, page = 1, limit = 20, userId }) {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 50);
  const cacheKey = `search:${contentType || 'all'}:${query.toLowerCase()}:${userId || 'anon'}:p${safePage}`;

  const cached = await getCachedJson(cacheKey);
  if (cached) return cached;

  // Text search aggregation
  const matchStage = {
    $text: { $search: query },
    status: 'completed',
    visibility: 'listed',
    ...(contentType && { contentType }),
  };

  let candidates = await Video.aggregate([
    { $match: matchStage },
    { $addFields: { textScore: { $meta: 'textScore' } } },
    { $sort: { textScore: -1 } },
    { $limit: TEXT_SEARCH_LIMIT },
  ]);

  let searchSource = 'text';

  // Regex fallback for partial matches
  if (candidates.length < REGEX_FALLBACK_THRESHOLD) {
    const existingIds = new Set(candidates.map((c) => c.videoId));
    const safeSearch = escapeRegex(query);
    const regexResults = await Video.find({
      videoId: { $nin: Array.from(existingIds) },
      status: 'completed',
      visibility: 'listed',
      ...(contentType && { contentType }),
      $or: [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { tags: { $regex: safeSearch, $options: 'i' } },
        { genres: { $regex: safeSearch, $options: 'i' } },
      ],
    })
      .limit(REGEX_FALLBACK_LIMIT)
      .lean();

    candidates = [
      ...candidates,
      ...regexResults.map((v) => ({ ...v, textScore: 0.5 })),
    ];
    searchSource = candidates.length > 0 ? 'text+regex' : 'regex';
  }

  // Creator name search — find profiles matching the query, then fetch their videos
  const safeCreatorSearch = escapeRegex(query);
  const matchingProfiles = await Profile.find(
    {
      $or: [
        { username: { $regex: safeCreatorSearch, $options: 'i' } },
        { displayName: { $regex: safeCreatorSearch, $options: 'i' } },
      ],
    },
    { userId: 1 }
  ).limit(10).lean();

  if (matchingProfiles.length > 0) {
    const existingIds = new Set(candidates.map((c) => c.videoId));
    const creatorUserIds = matchingProfiles.map((p) => p.userId);
    const creatorVideos = await Video.find({
      userId: { $in: creatorUserIds },
      videoId: { $nin: Array.from(existingIds) },
      status: 'completed',
      visibility: 'listed',
      ...(contentType && { contentType }),
    })
      .sort({ viewCount: -1 })
      .limit(REGEX_FALLBACK_LIMIT)
      .lean();

    candidates = [
      ...candidates,
      ...creatorVideos.map((v) => ({ ...v, textScore: 0.4 })),
    ];
    if (searchSource === 'regex' && creatorVideos.length > 0) searchSource = 'creator';
  }

  if (!candidates.length) {
    const empty = {
      videos: [],
      pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 1 },
      query,
      source: 'empty',
    };
    await setCachedJson(cacheKey, empty, SEARCH_CACHE_TTL);
    return empty;
  }

  // Fetch user profile in parallel (if logged in)
  let userProfile = null;
  if (userId) {
    const entries = await WatchHistory.find({ userId })
      .sort({ watchedAt: -1 })
      .limit(HISTORY_LIMIT)
      .lean();
    if (entries.length) {
      const watchedVideoIds = entries.map((e) => e.videoId);
      const watchedVideos = await Video.find(
        { videoId: { $in: watchedVideoIds } },
        { tags: 1, genres: 1, userId: 1 }
      ).lean();
      userProfile = buildUserProfile(watchedVideos);
    }
  }

  // Score candidates
  const weights = userId && userProfile ? WEIGHTS_AUTH : WEIGHTS_ANON;
  const maxTextScore = Math.max(...candidates.map((c) => c.textScore || 0), 0.001);
  const popScores = buildPopularityScores(candidates);

  const scored = candidates.map((candidate, i) => ({
    video: candidate,
    score:
      weights.text * ((candidate.textScore || 0) / maxTextScore) +
      weights.popularity * popScores[i] +
      weights.recency * recencyScore(candidate) +
      weights.personal * personalScore(candidate, userProfile),
  }));

  scored.sort((a, b) => b.score - a.score || (b.video.viewCount || 0) - (a.video.viewCount || 0));

  // Paginate
  const total = scored.length;
  const start = (safePage - 1) * safeLimit;
  const pageVideos = scored.slice(start, start + safeLimit).map((s) => s.video);

  // Attach profiles and map
  const profileMap = await attachProfiles(pageVideos);
  const mapped = pageVideos.map((video) => mapVideoSummary(video, profileMap.get(video.userId)));

  const result = {
    videos: mapped,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
    query,
    source: userId && userProfile ? 'personalized' : searchSource,
  };

  await setCachedJson(cacheKey, result, SEARCH_CACHE_TTL);
  return result;
}

export async function getSearchSuggestions({ prefix, limit = 8 }) {
  const cacheKey = `suggest:${prefix.toLowerCase()}`;
  const cached = await getCachedJson(cacheKey);
  if (cached) return cached;

  const safePrefix = escapeRegex(prefix);

  // Tag, title, and creator suggestions in parallel
  const [tagResults, titleResults, creatorResults] = await Promise.all([
    Video.aggregate([
      { $match: { status: 'completed', visibility: 'listed' } },
      { $unwind: '$tags' },
      { $match: { tags: { $regex: `^${safePrefix}`, $options: 'i' } } },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]),
    Video.find(
      {
        title: { $regex: safePrefix, $options: 'i' },
        status: 'completed',
        visibility: 'listed',
      },
      { title: 1, viewCount: 1, videoId: 1 }
    )
      .sort({ viewCount: -1 })
      .limit(limit)
      .lean(),
    Profile.find(
      {
        $or: [
          { username: { $regex: `^${safePrefix}`, $options: 'i' } },
          { displayName: { $regex: safePrefix, $options: 'i' } },
        ],
      },
      { username: 1, displayName: 1, avatar: 1 }
    )
      .limit(limit)
      .lean(),
  ]);

  const suggestions = [
    ...creatorResults.map((c) => ({ type: 'creator', text: c.displayName || c.username, avatar: c.avatar })),
    ...tagResults.map((t) => ({ type: 'tag', text: t._id, count: t.count })),
    ...titleResults.map((v) => ({ type: 'video', text: v.title, videoId: v.videoId })),
  ];

  const result = { suggestions };
  await setCachedJson(cacheKey, result, SUGGEST_CACHE_TTL);
  return result;
}
