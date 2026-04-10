import { UserRecommendation } from '../app/media/model/UserRecommendation.js';
import { GlobalRecommendation } from '../app/media/model/GlobalRecommendation.js';
import { Video } from '../app/media/model/Video.js';
import { Profile } from '../app/user/model/Profile.js';
import { WatchHistory } from '../app/playback/model/WatchHistory.js';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Video field projection for recommendations — same shape as mapVideoSummary in video.js.
 * Never project originalFile blobs or internal fields.
 */
const VIDEO_PROJECTION = {
  videoId: 1, userId: 1, title: 1, description: 1,
  thumbnail: 1, duration: 1, masterPlaylistUrl: 1, outputs: 1,
  contentType: 1, tags: 1, genres: 1, createdAt: 1,
  viewCount: 1, likeCount: 1,
  _id: 0,
};

const mapVideoSummary = (video, profile) => ({
  id:               video.videoId,
  videoId:          video.videoId,
  userId:           video.userId,
  title:            video.title,
  description:      video.description,
  thumbnail:        video.thumbnail,
  duration:         video.duration,
  masterPlaylistUrl: video.masterPlaylistUrl,
  outputs:          video.outputs || [],
  contentType:      video.contentType,
  tags:             video.tags || [],
  genres:           video.genres || [],
  createdAt:        video.createdAt,
  viewCount:        video.viewCount || 0,
  totalViews:       video.viewCount || 0,
  subscriberCount:  profile?.subscriberCount || 0,
  channel:          profile?.displayName || profile?.username || 'Creator',
  channelAvatar:    profile?.avatar || '/placeholder.svg',
  views:            `${video.viewCount || 0} views`,
  timestamp:        video.createdAt,
});

/**
 * Build the base eligibility query for video hydration.
 * Mirrors the Python worker's eligibility.py — the two must stay in sync.
 */
const buildEligibilityQuery = (videoIds, contentType) => {
  const query = {
    videoId:    { $in: videoIds },
    status:     'completed',
    visibility: 'listed',
    isAdultContent: false,  // TODO: gate per user profile/age when profile service exposes it
  };
  if (contentType && ['vod', 'reel', 'live'].includes(contentType)) {
    query.contentType = contentType;
  }
  return query;
};

/**
 * Hydrate a list of videoIds into full video objects, preserving artifact order.
 * Filters out ineligible videos (deleted, unlisted, adult, wrong contentType).
 *
 * @param {string[]} videoIds  — ordered list from the artifact
 * @param {string|undefined} contentType
 * @param {Set<string>} excludeIds — videoIds to exclude (e.g. recently watched)
 * @returns {{ items: object[], eligible: number }}
 */
async function hydrateAndFilter(videoIds, contentType, excludeIds = new Set()) {
  if (!videoIds.length) return { items: [], eligible: 0 };

  const query = buildEligibilityQuery(videoIds, contentType);
  const videos = await Video.find(query).select(VIDEO_PROJECTION).lean();

  // Build a lookup map for O(1) ordering
  const videoMap = new Map(videos.map((v) => [v.videoId, v]));

  // Attach profiles
  const userIds = [...new Set(videos.map((v) => v.userId).filter(Boolean))];
  const profiles = userIds.length
    ? await Profile.find({ userId: { $in: userIds } }).lean()
    : [];
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  // Preserve artifact order, exclude filtered ids
  const items = [];
  for (const vid of videoIds) {
    if (excludeIds.has(vid)) continue;
    const video = videoMap.get(vid);
    if (!video) continue;
    items.push(mapVideoSummary(video, profileMap.get(video.userId)));
  }

  return { items, eligible: videos.length };
}

/**
 * Load recently-watched videoIds for a user to optionally exclude from recs.
 * Uses a small limit — we only need the freshest N to avoid "just watched" repeats.
 */
async function getRecentlyWatched(userId, limit = 30) {
  const rows = await WatchHistory.find({ userId })
    .sort({ watchedAt: -1 })
    .limit(limit)
    .select({ videoId: 1, _id: 0 })
    .lean();
  return new Set(rows.map((r) => r.videoId));
}

/**
 * Load global trending fallback for a given contentType.
 * Tries contentType-specific key first, then generic fallback.
 */
async function loadGlobalFallback(contentType) {
  const key = contentType === 'reel' ? 'trending_reel' : 'trending_vod';
  const doc = await GlobalRecommendation.findOne({ key }).lean();
  return doc ?? null;
}

/**
 * getRecommendations — main serving function.
 *
 * Strategy:
 *   1. Load UserRecommendation artifact.
 *   2. If missing/empty → use GlobalRecommendation (cold start).
 *   3. Optionally exclude recently-watched videos (EXCLUDE_RECENT_WATCHED env flag).
 *   4. Hydrate + filter to limit*3 candidates (buffer for filtering losses).
 *   5. If personalized count < limit → backfill from global trending.
 *   6. Return top limit items.
 *
 * @param {string} userId
 * @param {{ limit?: number, contentType?: string, excludeRecent?: boolean }} options
 */
export async function getRecommendations(userId, { limit, contentType, excludeRecent = true } = {}) {
  const safeLimit = Math.min(toPositiveInt(limit, 20), 50);
  // Fetch more than needed to absorb filtering losses
  const candidateBuffer = safeLimit * 4;

  // ── Step 1: load artifact ──────────────────────────────────────────────────
  const [userRec, recentlyWatched] = await Promise.all([
    UserRecommendation.findOne({ userId }).lean(),
    excludeRecent ? getRecentlyWatched(userId, 50) : Promise.resolve(new Set()),
  ]);

  const hasPersonalized = userRec && userRec.videoIds && userRec.videoIds.length > 0;

  // ── Step 2: hydrate personalized candidates ────────────────────────────────
  let personalizedItems = [];
  let modelVersion = null;
  let generatedAt = null;
  let source = 'global';

  if (hasPersonalized) {
    const candidateIds = userRec.videoIds.slice(0, candidateBuffer);
    const { items } = await hydrateAndFilter(candidateIds, contentType, recentlyWatched);
    personalizedItems = items;
    modelVersion = userRec.modelVersion;
    generatedAt = userRec.generatedAt;
    source = 'personalized';
  }

  // ── Step 3: backfill from global if needed ─────────────────────────────────
  let items = personalizedItems.slice(0, safeLimit);
  const deficit = safeLimit - items.length;

  if (deficit > 0) {
    const globalDoc = await loadGlobalFallback(contentType);
    if (globalDoc && globalDoc.videoIds?.length) {
      // Exclude already-selected videoIds to avoid dupes
      const alreadySelected = new Set(items.map((v) => v.videoId));
      const globalCandidates = globalDoc.videoIds.filter((vid) => !alreadySelected.has(vid) && !recentlyWatched.has(vid));

      const { items: globalItems } = await hydrateAndFilter(
        globalCandidates.slice(0, deficit * 4),
        contentType,
        alreadySelected
      );

      items = [...items, ...globalItems.slice(0, deficit)];
      if (!modelVersion) {
        modelVersion = globalDoc.modelVersion;
        generatedAt = globalDoc.generatedAt;
      }
      source = personalizedItems.length > 0 ? 'mixed' : 'global';
    }
  }

  return {
    items: items.map((video, idx) => ({
      ...video,
      // recPosition for impression tracking on the client
      recPosition: idx,
    })),
    source,
    generatedAt,
    modelVersion,
    total: items.length,
  };
}
