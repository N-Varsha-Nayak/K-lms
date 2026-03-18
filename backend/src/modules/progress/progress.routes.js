import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/authMiddleware.js';
import {
  getLearnerOverview,
  getNextVideoAfterCompletion,
  getSubjectProgress,
  getVideoProgress,
  upsertVideoProgress
} from './progress.service.js';

const router = Router();

const upsertSchema = z.object({
  last_position_seconds: z.number().int().min(0).default(0),
  is_completed: z.boolean().default(false)
});

router.get('/overview', requireAuth, async (req, res, next) => {
  try {
    const overview = await getLearnerOverview(req.user.id);
    return res.json(overview);
  } catch (error) {
    return next(error);
  }
});

router.get('/subjects/:subjectId', requireAuth, async (req, res, next) => {
  try {
    const subjectId = z.coerce.number().int().positive().parse(req.params.subjectId);
    const summary = await getSubjectProgress(req.user.id, subjectId);
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
});

router.get('/videos/:videoId', requireAuth, async (req, res, next) => {
  try {
    const videoId = z.coerce.number().int().positive().parse(req.params.videoId);
    const progress = await getVideoProgress(req.user.id, videoId);
    return res.json(progress);
  } catch (error) {
    return next(error);
  }
});

router.post('/videos/:videoId', requireAuth, async (req, res, next) => {
  try {
    const videoId = z.coerce.number().int().positive().parse(req.params.videoId);
    const payload = upsertSchema.parse(req.body);

    const progress = await upsertVideoProgress(req.user.id, videoId, payload);
    const nextVideoId = payload.is_completed
      ? await getNextVideoAfterCompletion(req.user.id, videoId)
      : null;

    return res.json({
      progress,
      next_video_id: nextVideoId
    });
  } catch (error) {
    return next(error);
  }
});

export const progressRouter = router;
