import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Video } from '../../shared/models/Video.js';
import { Profile } from '../../shared/models/Profile.js';
import { ActiveSession } from '../../shared/models/VideoAnalytics.js';
import { VideoAnalytics } from '../../shared/models/VideoAnalytics.js';
import { authenticate } from '../../shared/middleware/auth.js';
import { requireAdminOrCreator } from '../../shared/middleware/adminAuth.js';
import { liveLimiter } from '../../shared/middleware/rateLimiter.js';
import { ensureAuthenticatedUser } from '../../shared/utils/authHelpers.js';

const router = Router();

const RTMP_INGEST_URL = process.env.RTMP_INGEST_URL || 'rtmp://live.videomanch.com/live';
const BROWSER_INGEST_WS_URL = process.env.BROWSER_INGEST_WS_URL || 'wss://live.videomanch.com/live/ingest';

const getDefaultMasterPlaylistKey = (userType: string, userId: string, videoId: string) =>
  `live/${userType}/${userId}/${videoId}/master.m3u8`;

const getPlaybackEntryUrl = (videoId: string) => `/playback/stream/${videoId}`;

router.post('/start', authenticate, requireAdminOrCreator, liveLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, userType } = ensureAuthenticatedUser(req);
    const {
      title,
      description,
      thumbnail,
      tags,
      visibility = 'listed',
      masterPlaylistUrl,
      allowLikes = true,
      allowDislikes = true,
      allowComments = true,
    } = req.body || {};
    console.log('[LIVE] Start requested', {
      userId,
      userType,
      hasTitle: Boolean(title),
      visibility,
      hasMasterPlaylistUrlOverride: Boolean(masterPlaylistUrl),
      requestId: req.headers['x-request-id'] || null,
    });

    if (!title || typeof title !== 'string') {
      console.log('[LIVE] Start rejected - invalid title', { userId, userType, titleType: typeof title });
      return res.status(400).json({ success: false, error: 'title is required.' });
    }

    const existingLive = await Video.findOne({
      userId,
      contentType: 'live',
      isLive: true,
    }).select('videoId title liveStartedAt');

    if (existingLive) {
      console.log('[LIVE] Start rejected - active stream already exists', {
        userId,
        existingVideoId: existingLive.videoId,
      });
      return res.status(409).json({
        success: false,
        error: 'You already have an active live stream.',
        data: {
          videoId: existingLive.videoId,
          title: existingLive.title,
          startedAt: existingLive.liveStartedAt,
          playbackEntryUrl: getPlaybackEntryUrl(existingLive.videoId),
        },
      });
    }

    const videoId = uuidv4();
    const streamKey = crypto.randomBytes(24).toString('hex');
    const playlistKey = (typeof masterPlaylistUrl === 'string' && masterPlaylistUrl.trim())
      ? masterPlaylistUrl.trim()
      : getDefaultMasterPlaylistKey(userType, userId, videoId);
    console.log('[LIVE] Creating live stream record', {
      userId,
      userType,
      videoId,
      playlistKey,
      ingestBase: BROWSER_INGEST_WS_URL,
    });

    const now = new Date();
    const video = await Video.create({
      videoId,
      userId,
      userType: userType === 'admin' ? 'creator' : userType,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      status: 'completed',
      transcodingCompleted: true,
      contentType: 'live',
      isLive: true,
      liveStatus: 'live',
      liveStartedAt: now,
      streamKey,
      masterPlaylistUrl: playlistKey,
      thumbnail: typeof thumbnail === 'string' ? thumbnail : undefined,
      tags: Array.isArray(tags) ? tags : [],
      visibility: visibility === 'unlisted' ? 'unlisted' : 'listed',
      allowLikes: Boolean(allowLikes),
      allowDislikes: Boolean(allowDislikes),
      allowComments: Boolean(allowComments),
      duration: 0,
      outputs: [],
      originalFile: {
        filename: `live-${videoId}.m3u8`,
        size: 0,
        mimeType: 'application/vnd.apple.mpegurl',
        r2Key: playlistKey,
      },
      statusHistory: [{
        from: 'pending',
        to: 'completed',
        at: now,
        reason: 'live_started',
      }],
    });
    console.log('[LIVE] Stream created', {
      userId,
      userType,
      videoId: video.videoId,
      playlistKey,
      wsIngestUrl: `${BROWSER_INGEST_WS_URL}/${video.videoId}?key=${streamKey}`,
      playbackEntryUrl: getPlaybackEntryUrl(video.videoId),
    });

    return res.status(201).json({
      success: true,
      data: {
        videoId: video.videoId,
        title: video.title,
        streamKey,
        ingest: {
          rtmpUrl: RTMP_INGEST_URL,
          rtmpKey: streamKey,
          wsIngestUrl: `${BROWSER_INGEST_WS_URL}/${video.videoId}?key=${streamKey}`,
        },
        playbackEntryUrl: getPlaybackEntryUrl(video.videoId),
        startedAt: video.liveStartedAt,
      },
    });
  } catch (error: any) {
    console.error('[LIVE] Failed to start stream:', {
      message: error?.message,
      stack: error?.stack,
      requestId: req.headers['x-request-id'] || null,
    });
    return res.status(500).json({ success: false, error: error.message || 'Failed to start live stream.' });
  }
});

router.post('/:videoId/end', authenticate, requireAdminOrCreator, async (req: Request, res: Response) => {
  try {
    const { userId, roles } = ensureAuthenticatedUser(req);
    const { videoId } = req.params;
    console.log('[LIVE] End requested', {
      userId,
      roles,
      videoId,
      requestId: req.headers['x-request-id'] || null,
    });

    const liveVideo = await Video.findOne({ videoId, contentType: 'live' });
    if (!liveVideo) {
      console.log('[LIVE] End rejected - stream not found', { userId, videoId });
      return res.status(404).json({ success: false, error: 'Live stream not found.' });
    }

    if (!roles.includes('admin') && liveVideo.userId !== userId) {
      console.log('[LIVE] End rejected - forbidden', {
        userId,
        ownerUserId: liveVideo.userId,
        videoId,
      });
      return res.status(403).json({ success: false, error: 'Forbidden.' });
    }

    liveVideo.isLive = false;
    liveVideo.liveStatus = 'ended';
    liveVideo.liveEndedAt = new Date();
    liveVideo.streamKey = undefined;
    await liveVideo.save();
    console.log('[LIVE] Stream marked ended', {
      userId,
      videoId: liveVideo.videoId,
      liveEndedAt: liveVideo.liveEndedAt,
    });

    await ActiveSession.deleteMany({ videoId });
    console.log('[LIVE] Active sessions cleared', { videoId });

    return res.json({
      success: true,
      data: {
        videoId: liveVideo.videoId,
        endedAt: liveVideo.liveEndedAt,
      },
    });
  } catch (error: any) {
    console.error('[LIVE] Failed to end stream:', {
      message: error?.message,
      stack: error?.stack,
      requestId: req.headers['x-request-id'] || null,
    });
    return res.status(500).json({ success: false, error: error.message || 'Failed to end live stream.' });
  }
});

router.get('/my', authenticate, requireAdminOrCreator, async (req: Request, res: Response) => {
  try {
    const { userId } = ensureAuthenticatedUser(req);
    const videos = await Video.find({ userId, contentType: 'live' })
      .sort({ liveStartedAt: -1, createdAt: -1 })
      .limit(25)
      .lean();

    const [viewerRows, historicalRows] = await Promise.all([
      ActiveSession.aggregate([
        { $match: { videoId: { $in: videos.map((v: any) => v.videoId) } } },
        { $group: { _id: '$videoId', viewers: { $sum: 1 } } },
      ]),
      VideoAnalytics.aggregate([
        { $match: { videoId: { $in: videos.map((v: any) => v.videoId) } } },
        { $group: { _id: '$videoId', totalViews: { $sum: '$views' } } },
      ]),
    ]);
    const viewerMap = new Map(viewerRows.map((row: any) => [row._id, Number(row.viewers || 0)]));
    const historicalMap = new Map(historicalRows.map((row: any) => [row._id, Number(row.totalViews || 0)]));

    return res.json({
      success: true,
      data: videos.map((video: any) => ({
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        isLive: Boolean(video.isLive),
        liveStatus: video.liveStatus || (video.isLive ? 'live' : 'ended'),
        liveStartedAt: video.liveStartedAt,
        liveEndedAt: video.liveEndedAt,
        viewers: viewerMap.get(video.videoId) || 0,
        totalViews: historicalMap.get(video.videoId) || 0,
        playbackEntryUrl: getPlaybackEntryUrl(video.videoId),
      })),
    });
  } catch (error: any) {
    console.error('[LIVE] Failed to fetch creator streams:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch live streams.' });
  }
});

router.get('/active', async (_req: Request, res: Response) => {
  try {
    const liveVideos = await Video.find({
      contentType: 'live',
      isLive: true,
      status: 'completed',
    })
      .sort({ liveStartedAt: -1 })
      .limit(50)
      .lean();

    if (liveVideos.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const [viewerRows, historicalRows, profiles] = await Promise.all([
      ActiveSession.aggregate([
        { $match: { videoId: { $in: liveVideos.map((v: any) => v.videoId) } } },
        { $group: { _id: '$videoId', viewers: { $sum: 1 } } },
      ]),
      VideoAnalytics.aggregate([
        { $match: { videoId: { $in: liveVideos.map((v: any) => v.videoId) } } },
        { $group: { _id: '$videoId', totalViews: { $sum: '$views' } } },
      ]),
      Profile.find({ userId: { $in: liveVideos.map((v: any) => v.userId) } })
        .select('userId displayName username avatar isVerified')
        .lean(),
    ]);

    const viewerMap = new Map(viewerRows.map((row: any) => [row._id, Number(row.viewers || 0)]));
    const historicalMap = new Map(historicalRows.map((row: any) => [row._id, Number(row.totalViews || 0)]));
    const profileMap = new Map(profiles.map((p: any) => [p.userId, p]));

    return res.json({
      success: true,
      data: liveVideos.map((video: any) => {
        const profile = profileMap.get(video.userId);
        return {
          videoId: video.videoId,
          userId: video.userId,
          title: video.title,
          description: video.description,
          thumbnail: video.thumbnail,
          tags: video.tags || [],
          startedAt: video.liveStartedAt || video.createdAt,
          viewers: viewerMap.get(video.videoId) || 0,
          totalViews: historicalMap.get(video.videoId) || 0,
          channel: profile?.displayName || profile?.username || 'Unknown',
          channelAvatar: profile?.avatar || '',
          channelVerified: Boolean(profile?.isVerified),
          playbackEntryUrl: getPlaybackEntryUrl(video.videoId),
        };
      }),
    });
  } catch (error: any) {
    console.error('[LIVE] Failed to fetch active streams:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch active streams.' });
  }
});

export default router;
