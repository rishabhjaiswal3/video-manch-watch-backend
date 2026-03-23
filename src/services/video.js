import crypto from 'crypto';
import { Video } from '../app/media/model/Video.js';
import { Profile } from '../app/user/model/Profile.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateSignedUrl } from '../utils/signedUrl.js';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

const normalizeText = (value) => String(value || '').trim();

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(',')
    .map((item) => normalizeText(item))
    .filter(Boolean);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildCaseInsensitiveExactRegex = (value) => new RegExp(`^${escapeRegex(value)}$`, 'i');

const buildVideoQuery = ({ contentType, search, searchString, category, tags, genres, forceReels = false }) => {
  const query = {
    status: 'completed',
    visibility: 'listed',
  };
  const searchValue = normalizeText(searchString || search);
  const normalizedCategory = normalizeText(category);
  const normalizedTags = normalizeList(tags);
  const normalizedGenres = normalizeList(genres);
  const andConditions = [];

  if (forceReels) {
    query.contentType = 'reel';
  } else if (contentType) {
    query.contentType = contentType;
  }

  if (searchValue) {
    const safeSearch = escapeRegex(searchValue);
    andConditions.push({
      $or: [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { tags: { $regex: safeSearch, $options: 'i' } },
        { genres: { $regex: safeSearch, $options: 'i' } },
      ],
    });
  }

  if (normalizedCategory) {
    andConditions.push({
      $or: [
        { tags: { $in: [buildCaseInsensitiveExactRegex(normalizedCategory)] } },
        { genres: { $in: [buildCaseInsensitiveExactRegex(normalizedCategory)] } },
      ],
    });
  }

  if (normalizedTags.length > 0) {
    andConditions.push({
      tags: {
        $in: normalizedTags.map((tag) => buildCaseInsensitiveExactRegex(tag)),
      },
    });
  }

  if (normalizedGenres.length > 0) {
    andConditions.push({
      genres: {
        $in: normalizedGenres.map((genre) => buildCaseInsensitiveExactRegex(genre)),
      },
    });
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  return query;
};

const mapProfileByUserId = (profiles) =>
  new Map(profiles.map((profile) => [profile.userId, profile]));

const mapVideoSummary = (video, profile) => ({
  id: video.videoId,
  videoId: video.videoId,
  userId: video.userId,
  title: video.title,
  description: video.description,
  thumbnail: video.thumbnail,
  duration: video.duration,
  masterPlaylistUrl: video.masterPlaylistUrl,
  outputs: video.outputs || [],
  contentType: video.contentType,
  tags: video.tags || [],
  genres: video.genres || [],
  createdAt: video.createdAt,
  totalViews: video.totalViews || 0,
  channel: profile?.displayName || profile?.username || 'Creator',
  channelAvatar: profile?.avatar || '/placeholder.svg',
  views: `${video.totalViews || 0} views`,
  timestamp: video.createdAt,
  originalMetadata: video.originalMetadata,
  originalFile: video.originalFile,
});

const mapReelSummary = (video, profile) => ({
  id: video.videoId,
  videoId: video.videoId,
  userId: video.userId,
  username: profile?.username || profile?.displayName || 'creator',
  avatar: profile?.avatar || '/placeholder.svg',
  description: video.description || video.title,
  tags: video.tags || [],
  thumbnail: video.thumbnail,
  masterPlaylistUrl: video.masterPlaylistUrl,
  outputs: video.outputs || [],
  likes: video.likeCount || 0,
  comments: video.commentCount || 0,
  shares: 0,
  bookmarks: 0,
  duration: video.duration,
  originalMetadata: video.originalMetadata,
  contentType: video.contentType,
  createdAt: video.createdAt,
});

const signUrl = (url, videoId) => {
  if (!url || !process.env.VIDEO_SIGNING_SECRET) return url;
  try {
    return generateSignedUrl({ videoId, path: url }).signedPath;
  } catch {
    return url;
  }
};

const signReelUrls = (reel) => ({
  ...reel,
  masterPlaylistUrl: signUrl(reel.masterPlaylistUrl, reel.videoId),
  outputs: (reel.outputs || []).map((output) => ({
    ...output,
    url: signUrl(output.url, reel.videoId),
    playlistUrl: signUrl(output.playlistUrl, reel.videoId),
  })),
});

const attachProfiles = async (videos) => {
  const userIds = Array.from(new Set(videos.map((video) => video.userId).filter(Boolean)));
  const profiles = userIds.length
    ? await Profile.find({ userId: { $in: userIds } }).lean()
    : [];
  return mapProfileByUserId(profiles);
};

export async function registerVOD({ userId, userType, title, description, category, masterPlaylistUrl, thumbnail, duration, contentType, source, sourceStreamId }) {
  if (!userId || !title) {
    throw new AppError('User ID and title are required', 400);
  }

  const normalizedTitle = String(title).trim();
  if (!normalizedTitle) {
    throw new AppError('Title is required', 400);
  }

  const video = await Video.create({
    videoId: crypto.randomUUID(),
    userId,
    userType: userType || 'user',
    title: normalizedTitle,
    description: String(description || '').trim() || undefined,
    originalFile: {
      filename: source?.filename || `${normalizedTitle}.mp4`,
      size: Number(source?.size || 0),
      mimeType: source?.mimeType || 'video/mp4',
      r2Key: source?.r2Key || `videos/${userId}/${Date.now()}`,
    },
    masterPlaylistUrl,
    thumbnail,
    duration,
    tags: category ? [category] : [],
    contentType: contentType || 'vod',
    status: 'completed',
    transcodingCompleted: true,
    visibility: 'listed',
  });

  return video.toObject();
}

export async function listVideos({ page, limit, search, searchString, contentType, category, tags, genres }) {
  const safePage = toPositiveInt(page, 1);
  const safeLimit = Math.min(toPositiveInt(limit, 20), 100);
  const skip = (safePage - 1) * safeLimit;
  const query = buildVideoQuery({
    contentType: contentType || 'vod',
    search,
    searchString,
    category,
    tags,
    genres,
  });

  const [videos, total] = await Promise.all([
    Video.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    Video.countDocuments(query),
  ]);

  const profileMap = await attachProfiles(videos);

  return {
    videos: videos.map((video) => mapVideoSummary(video, profileMap.get(video.userId))),
    pagination: buildPagination(safePage, safeLimit, total),
  };
}

export async function getVideoById(videoId) {
  if (!videoId) {
    throw new AppError('Video ID is required', 400);
  }

  const video = await Video.findOne({
    videoId,
    status: 'completed',
    visibility: 'listed',
  }).lean();

  if (!video) {
    throw new AppError('Video not found', 404);
  }

  const profile = await Profile.findOne({ userId: video.userId }).lean();
  return mapVideoSummary(video, profile);
}

export async function listReels({ page, limit }) {
  const safePage = toPositiveInt(page, 1);
  const safeLimit = Math.min(toPositiveInt(limit, 20), 100);
  const skip = (safePage - 1) * safeLimit;
  const query = buildVideoQuery({ forceReels: true });

  const [videos, total] = await Promise.all([
    Video.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    Video.countDocuments(query),
  ]);

  const profileMap = await attachProfiles(videos);
  const mapped = videos.map((video) => signReelUrls(mapReelSummary(video, profileMap.get(video.userId))));

  return {
    videos: mapped,
    reels: mapped,
    pagination: buildPagination(safePage, safeLimit, total),
  };
}
