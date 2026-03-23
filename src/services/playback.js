import { Video } from '../app/media/model/Video.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateSignedUrl } from '../utils/signedUrl.js';

const TOKEN_EXPIRY_SECONDS = Number.parseInt(process.env.VIDEO_TOKEN_EXPIRY_SECONDS || '3600', 10) || 3600;
const SEGMENT_BASE_URL = (process.env.VIDEO_SEGMENT_BASE_URL || 'https://video-segment.videomanch.com').replace(/\/+$/, '');
const LIVE_HLS_BASE_URL = (process.env.LIVE_HLS_BASE_URL || 'https://live.videomanch.com').replace(/\/+$/, '');

const normalizePath = (input) => {
  if (!input) return '';

  try {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return new URL(input).pathname.replace(/^\//, '');
    }
  } catch {
    return String(input).replace(/^\//, '');
  }

  return String(input).replace(/^\//, '');
};

const toAbsoluteSegmentUrl = (value) => {
  if (!value) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${SEGMENT_BASE_URL}/${value.replace(/^\//, '')}`;
};

export async function getSignedStream(videoId, deviceType) {
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

  if (
    video.contentType === 'live' &&
    video.isLive &&
    video.liveStatus === 'live' &&
    video.liveIngestStatus !== 'disconnected' &&
    video.streamKey
  ) {
    const directLiveUrl = `${LIVE_HLS_BASE_URL}/live/${video.streamKey}/index.m3u8`;
    return {
      videoId,
      title: video.title,
      thumbnail: video.thumbnail,
      duration: video.duration,
      masterPlaylist: {
        signedUrl: directLiveUrl,
        playbackPath: directLiveUrl,
        expires: 0,
        expiresIn: 0,
      },
      outputs: [],
    };
  }

  const masterPlaylistPath = normalizePath(video.masterPlaylistUrl || '');
  if (!masterPlaylistPath) {
    throw new AppError('Video has no playlist', 404);
  }

  const signedMaster = generateSignedUrl({
    videoId,
    path: masterPlaylistPath,
    expiresIn: TOKEN_EXPIRY_SECONDS,
    deviceType,
  });

  const signedMasterPlaybackPath = generateSignedUrl({
    videoId,
    path: `playback/master/${videoId}`,
    expiresIn: TOKEN_EXPIRY_SECONDS,
    deviceType,
  });

  const outputs = (video.outputs || [])
    .map((output) => {
      if (!output.playlistUrl) return null;

      const signedOutput = generateSignedUrl({
        videoId,
        path: normalizePath(output.playlistUrl),
        expiresIn: TOKEN_EXPIRY_SECONDS,
        deviceType,
      });

      return {
        quality: output.quality,
        signedPlaylistUrl: toAbsoluteSegmentUrl(signedOutput.signedPath),
        expires: signedOutput.expires,
      };
    })
    .filter(Boolean);

  return {
    videoId,
    title: video.title,
    thumbnail: video.thumbnail,
    duration: video.duration,
    masterPlaylist: {
      signedUrl: toAbsoluteSegmentUrl(signedMaster.signedPath),
      playbackPath: `/${signedMasterPlaybackPath.signedPath}`,
      expires: signedMaster.expires,
      expiresIn: TOKEN_EXPIRY_SECONDS,
    },
    outputs,
  };
}
