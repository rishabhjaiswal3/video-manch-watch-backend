import crypto from 'crypto';
import { Video } from '../app/media/model/Video.js';
import { Playlist } from '../app/social/model/Playlist.js';
import { AppError } from '../middleware/errorHandler.js';

const normalizeTitle = (title) => String(title || '').trim();

const mapVideoSummary = (video) => ({
  videoId: video.videoId,
  title: video.title,
  thumbnail: video.thumbnail,
  duration: video.duration,
  contentType: video.contentType,
  userId: video.userId,
  createdAt: video.createdAt,
});

const enrichPlaylist = async (playlist, { includeAllVideos = false } = {}) => {
  const videoIds = playlist.videoIds || [];
  const videos = videoIds.length
    ? await Video.find({ videoId: { $in: videoIds } }).lean()
    : [];
  const videoMap = new Map(videos.map((video) => [video.videoId, video]));
  const orderedVideos = videoIds.map((videoId) => videoMap.get(videoId)).filter(Boolean).map(mapVideoSummary);

  return {
    playlistId: playlist.playlistId,
    userId: playlist.userId,
    title: playlist.title,
    thumbnailUrl: playlist.thumbnailUrl,
    videoIds,
    videoCount: videoIds.length,
    previewVideos: orderedVideos.slice(0, 6),
    ...(includeAllVideos ? { videos: orderedVideos } : {}),
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
  };
};

export async function listPlaylists(userId) {
  if (!userId) {
    throw new AppError('User ID is required', 400);
  }

  const playlists = await Playlist.find({ userId }).sort({ createdAt: -1 }).lean();
  return Promise.all(playlists.map((playlist) => enrichPlaylist(playlist)));
}

export async function createPlaylist(userId, title) {
  const normalizedTitle = normalizeTitle(title);
  if (!userId) {
    throw new AppError('User ID is required', 400);
  }
  if (!normalizedTitle) {
    throw new AppError('Playlist title is required', 400);
  }

  const playlist = await Playlist.create({
    playlistId: crypto.randomUUID(),
    userId,
    title: normalizedTitle,
    videoIds: [],
  });

  return enrichPlaylist(playlist.toObject());
}

export async function createPlaylistWithVideo(userId, title, videoId) {
  const playlist = await createPlaylist(userId, title);
  await addVideoToPlaylist(userId, playlist.playlistId, videoId);
  return getPlaylist(userId, playlist.playlistId);
}

export async function updatePlaylist(userId, playlistId, title) {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) {
    throw new AppError('Playlist title is required', 400);
  }

  const playlist = await Playlist.findOne({ playlistId, userId });
  if (!playlist) {
    throw new AppError('Playlist not found', 404);
  }

  playlist.title = normalizedTitle;
  await playlist.save();
  return enrichPlaylist(playlist.toObject());
}

export async function getPlaylist(userId, playlistId) {
  const playlist = await Playlist.findOne({ playlistId, userId }).lean();
  if (!playlist) {
    throw new AppError('Playlist not found', 404);
  }

  return enrichPlaylist(playlist, { includeAllVideos: true });
}

export async function deletePlaylist(userId, playlistId) {
  const deleted = await Playlist.findOneAndDelete({ playlistId, userId }).lean();
  if (!deleted) {
    throw new AppError('Playlist not found', 404);
  }

  return { deleted: true };
}

export async function addVideoToPlaylist(userId, playlistId, videoId) {
  const [playlist, video] = await Promise.all([
    Playlist.findOne({ playlistId, userId }),
    Video.findOne({ videoId }).lean(),
  ]);

  if (!playlist) {
    throw new AppError('Playlist not found', 404);
  }
  if (!video) {
    throw new AppError('Video not found', 404);
  }

  if ((playlist.videoIds || []).includes(videoId)) {
    return {
      added: false,
      message: 'Video already exists in playlist',
      playlist: await enrichPlaylist(playlist.toObject()),
    };
  }

  playlist.videoIds.push(videoId);
  await playlist.save();

  return {
    added: true,
    message: 'Video added to playlist',
    playlist: await enrichPlaylist(playlist.toObject()),
  };
}

export async function removeVideoFromPlaylist(userId, playlistId, videoId) {
  const playlist = await Playlist.findOne({ playlistId, userId });
  if (!playlist) {
    throw new AppError('Playlist not found', 404);
  }

  playlist.videoIds = (playlist.videoIds || []).filter((id) => id !== videoId);
  await playlist.save();

  return {
    removed: true,
    playlist: await enrichPlaylist(playlist.toObject()),
  };
}

export async function getThumbnailUploadUrl(userId, playlistId, mimeType) {
  throw new AppError('Thumbnail upload is not implemented in watch backend', 501);
}

export async function saveThumbnailUrl(userId, playlistId, thumbnailUrl) {
  const playlist = await Playlist.findOne({ playlistId, userId });
  if (!playlist) {
    throw new AppError('Playlist not found', 404);
  }

  playlist.thumbnailUrl = thumbnailUrl || null;
  await playlist.save();
  return enrichPlaylist(playlist.toObject());
}
