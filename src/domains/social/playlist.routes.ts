import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';
import { PlaylistController } from './controllers/playlist.controller.js';

const router = Router();
const playlistController = new PlaylistController();

router.use(authenticate);

// List & create playlists
router.get('/', (req, res) => playlistController.list(req, res));
router.post('/', (req, res) => playlistController.create(req, res));

// Single playlist operations
router.get('/:playlistId', (req, res) => playlistController.get(req, res));
router.patch('/:playlistId', (req, res) => playlistController.update(req, res));
router.delete('/:playlistId', (req, res) => playlistController.delete(req, res));

// Video operations within a playlist
router.post('/:playlistId/videos/:videoId', (req, res) => playlistController.addVideo(req, res));
router.delete('/:playlistId/videos/:videoId', (req, res) => playlistController.removeVideo(req, res));

// Thumbnail upload
router.post('/:playlistId/thumbnail-url', (req, res) => playlistController.getThumbnailUploadUrl(req, res));
router.patch('/:playlistId/thumbnail', (req, res) => playlistController.saveThumbnail(req, res));

export default router;
