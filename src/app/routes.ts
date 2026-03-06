import { Express } from 'express';

import authRoutes from '../domains/auth/routes.js';
import uploadRoutes from '../domains/media/upload.routes.js';
import videosRoutes from '../domains/media/videos.routes.js';
import playbackRoutes from '../domains/analytics/playback.routes.js';
import creatorAnalyticsRoutes from '../domains/analytics/creator.routes.js';
import adminRoutes from '../domains/admin/admin.routes.js';
import configRoutes from '../domains/admin/config.routes.js';
import profileRoutes from '../domains/social/profile.routes.js';
import engagementRoutes from '../domains/social/engagement.routes.js';
import subscriptionRoutes from '../domains/social/subscription.routes.js';
import commentRoutes from '../domains/social/comment.routes.js';
import watchLaterRoutes from '../domains/social/watchLater.routes.js';
import playlistRoutes from '../domains/social/playlist.routes.js';
import publicPlaylistRoutes from '../domains/social/public-playlist.routes.js';
import reelReportRoutes from '../domains/social/reelReport.routes.js';
import categoryRoutes from '../domains/admin/category.routes.js';
import liveRoutes from '../domains/live/routes.js';

export function registerRoutes(app: Express): void {
  app.use('/auth', authRoutes);
  app.use('/upload', uploadRoutes);
  app.use('/videos', videosRoutes);
  app.use('/playback', playbackRoutes);
  app.use('/analytics', creatorAnalyticsRoutes);
  app.use('/admin', adminRoutes);
  app.use('/config', configRoutes);
  app.use('/profile', profileRoutes);
  app.use('/engagement', engagementRoutes);
  app.use('/subscriptions', subscriptionRoutes);
  app.use('/comments', commentRoutes);
  app.use('/reports', reelReportRoutes);
  app.use('/watch-later', watchLaterRoutes);
  app.use('/playlists', playlistRoutes);
  app.use('/public/playlists', publicPlaylistRoutes);
  app.use('/categories', categoryRoutes);
  app.use('/live', liveRoutes);
}
