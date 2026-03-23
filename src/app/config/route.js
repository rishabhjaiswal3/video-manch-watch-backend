import { Router } from 'express';
import * as configCtrl from './controller/config.controller.js';

const router = Router();

router.get('/player', configCtrl.getPlayerConfig);

export default router;
