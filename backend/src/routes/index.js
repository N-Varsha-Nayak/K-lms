import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { progressRouter } from '../modules/progress/progress.routes.js';
import { subjectsRouter } from '../modules/subjects/subjects.routes.js';
import { videosRouter } from '../modules/videos/videos.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  return res.json({ status: 'ok' });
});

router.use('/auth', authRouter);
router.use('/subjects', subjectsRouter);
router.use('/videos', videosRouter);
router.use('/progress', progressRouter);

export const apiRouter = router;
