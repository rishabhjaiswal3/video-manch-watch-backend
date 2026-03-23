import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as commentCtrl from './controller/comment.controller.js';
import * as engagementCtrl from './controller/engagement.controller.js';
import * as subscriptionCtrl from './controller/subscription.controller.js';
import * as watchLaterCtrl from './controller/watchLater.controller.js';
import * as playlistCtrl from './controller/playlist.controller.js';
import * as reelReportCtrl from './controller/reelReport.controller.js';

const router = Router();

router.get('/comments/:videoId', commentCtrl.getVideoComments);
router.post('/comments/:videoId', authenticate, commentCtrl.addComment);
router.get('/comments/video/:videoId', commentCtrl.getVideoComments);
router.post('/comments/video/:videoId', authenticate, commentCtrl.addComment);
router.get('/comments/:commentId/replies', commentCtrl.getCommentReplies);
router.post('/comments/:commentId/reply', authenticate, commentCtrl.replyToComment);
router.patch('/comments/:commentId', authenticate, commentCtrl.editComment);
router.delete('/comments/:commentId', authenticate, commentCtrl.deleteComment);
router.post('/comments/:commentId/like', authenticate, commentCtrl.likeComment);
router.delete('/comments/:commentId/like', authenticate, commentCtrl.unlikeComment);

router.post('/engagement/:videoId/like', authenticate, engagementCtrl.likeVideo);
router.post('/engagement/:videoId/dislike', authenticate, engagementCtrl.dislikeVideo);
router.delete('/engagement/:videoId', authenticate, engagementCtrl.removeEngagement);
router.get('/engagement/:videoId', engagementCtrl.getVideoEngagement);
router.get('/engagement/:videoId/status', authenticate, engagementCtrl.getUserEngagementStatus);
router.get('/engagement/liked/videos', authenticate, engagementCtrl.getUserLikedVideos);
router.post('/engagement/video/:videoId/like', authenticate, engagementCtrl.likeVideo);
router.post('/engagement/video/:videoId/dislike', authenticate, engagementCtrl.dislikeVideo);
router.delete('/engagement/video/:videoId', authenticate, engagementCtrl.removeEngagement);
router.get('/engagement/video/:videoId', engagementCtrl.getVideoEngagement);
router.get('/engagement/video/:videoId/status', authenticate, engagementCtrl.getUserEngagementStatus);
router.get('/engagement/user/liked', authenticate, engagementCtrl.getUserLikedVideos);

router.post('/subscriptions/:creatorId', authenticate, subscriptionCtrl.subscribe);
router.delete('/subscriptions/:creatorId', authenticate, subscriptionCtrl.unsubscribe);
router.get('/subscriptions/:creatorId/status', authenticate, subscriptionCtrl.getSubscriptionStatus);
router.patch('/subscriptions/:creatorId/notify', authenticate, subscriptionCtrl.toggleNotifications);
router.get('/subscriptions/following', authenticate, subscriptionCtrl.getFollowing);
router.get('/subscriptions/my/following', authenticate, subscriptionCtrl.getFollowing);
router.get('/subscriptions/subscribers', authenticate, subscriptionCtrl.getSubscribers);

router.post('/watch-later/:videoId', authenticate, watchLaterCtrl.add);
router.delete('/watch-later/:videoId', authenticate, watchLaterCtrl.remove);
router.get('/watch-later', authenticate, watchLaterCtrl.getList);
router.get('/watch-later/:videoId', authenticate, watchLaterCtrl.getStatus);
router.get('/watch-later/:videoId/status', authenticate, watchLaterCtrl.getStatus);

router.get('/playlists', authenticate, playlistCtrl.list);
router.post('/playlists', authenticate, playlistCtrl.create);
router.get('/playlists/:playlistId', authenticate, playlistCtrl.get);
router.patch('/playlists/:playlistId', authenticate, playlistCtrl.update);
router.delete('/playlists/:playlistId', authenticate, playlistCtrl.deletePlaylist);
router.post('/playlists/:playlistId/videos/:videoId', authenticate, playlistCtrl.addVideo);
router.delete('/playlists/:playlistId/videos/:videoId', authenticate, playlistCtrl.removeVideo);
router.post('/playlists/:playlistId/thumbnail-url', authenticate, playlistCtrl.getThumbnailUploadUrl);
router.patch('/playlists/:playlistId/thumbnail', authenticate, playlistCtrl.saveThumbnail);

router.post('/reports/reel', reelReportCtrl.reportReel);
router.post('/reports/reels', reelReportCtrl.reportReel);

export default router;
