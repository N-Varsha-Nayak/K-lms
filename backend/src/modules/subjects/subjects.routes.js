import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/authMiddleware.js';
import {
  enrollInSubject,
  getCatalogMetadata,
  getFirstUnlockedVideoId,
  getSubjectById,
  getSubjectTree,
  listSubjects
} from './subjects.service.js';

const router = Router();

const listSubjectsQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  level: z.string().trim().optional(),
  pricing_tier: z.enum(['free', 'premium']).optional(),
  sort_by: z.enum(['popular', 'rating', 'newest', 'title']).optional()
});

router.get('/', async (req, res, next) => {
  try {
    const query = listSubjectsQuerySchema.parse(req.query);
    const [subjects, catalog] = await Promise.all([
      listSubjects({
        search: query.search ?? '',
        category: query.category ?? '',
        level: query.level ?? '',
        pricingTier: query.pricing_tier ?? '',
        sortBy: query.sort_by ?? 'popular'
      }),
      getCatalogMetadata()
    ]);
    return res.json({ subjects, catalog });
  } catch (error) {
    return next(error);
  }
});

router.get('/:subjectId', async (req, res, next) => {
  try {
    const subjectId = z.coerce.number().int().positive().parse(req.params.subjectId);
    const subject = await getSubjectById(subjectId);
    return res.json(subject);
  } catch (error) {
    return next(error);
  }
});

router.get('/:subjectId/tree', requireAuth, async (req, res, next) => {
  try {
    const subjectId = z.coerce.number().int().positive().parse(req.params.subjectId);
    const tree = await getSubjectTree(req.user.id, subjectId);
    return res.json(tree);
  } catch (error) {
    return next(error);
  }
});

router.post('/:subjectId/enroll', requireAuth, async (req, res, next) => {
  try {
    const subjectId = z.coerce.number().int().positive().parse(req.params.subjectId);
    await enrollInSubject(req.user.id, subjectId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.get('/:subjectId/first-video', requireAuth, async (req, res, next) => {
  try {
    const subjectId = z.coerce.number().int().positive().parse(req.params.subjectId);
    const videoId = await getFirstUnlockedVideoId(req.user.id, subjectId);
    return res.json({ video_id: videoId });
  } catch (error) {
    return next(error);
  }
});

export const subjectsRouter = router;
