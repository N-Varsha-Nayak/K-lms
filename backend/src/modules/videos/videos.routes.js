import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { getVideoDetailsForUser } from './videos.service.js';

const router = Router();

router.get('/:videoId', requireAuth, async (req, res, next) => {
  try {
    const videoId = z.coerce.number().int().positive().parse(req.params.videoId);
    const video = await getVideoDetailsForUser(req.user.id, videoId);
    return res.json(video);
  } catch (error) {
    return next(error);
  }
});

export const videosRouter = router;
