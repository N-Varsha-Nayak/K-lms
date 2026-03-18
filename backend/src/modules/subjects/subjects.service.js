import { dbQuery } from '../../config/db.js';
import { createHttpError } from '../../utils/errors.js';
import {
  computeLockMap,
  getCompletedVideoIds,
  getOrderedVideosBySubject
} from '../videos/unlock.service.js';

let enrollmentsColumnsCache = null;

async function getEnrollmentsColumns() {
  if (enrollmentsColumnsCache) return enrollmentsColumnsCache;

  const rows = await dbQuery('SHOW COLUMNS FROM enrollments');
  enrollmentsColumnsCache = new Set(rows.map((row) => row.Field));
  return enrollmentsColumnsCache;
}

function normalizeSubject(row) {
  return {
    ...row,
    id: Number(row.id),
    price_inr: Number(row.price_inr ?? 0),
    rating: Number(row.rating ?? 0),
    enrolled_count: Number(row.enrolled_count ?? 0),
    estimated_hours: Number(row.estimated_hours ?? 0),
    total_sections: Number(row.total_sections ?? 0),
    total_videos: Number(row.total_videos ?? 0)
  };
}

export async function listSubjects(filters = {}) {
  const {
    search = '',
    category = '',
    level = '',
    pricingTier = '',
    sortBy = 'popular'
  } = filters;

  const orderByMap = {
    popular: 's.enrolled_count DESC, s.rating DESC, s.created_at DESC',
    rating: 's.rating DESC, s.enrolled_count DESC, s.created_at DESC',
    newest: 's.created_at DESC, s.rating DESC',
    title: 's.title ASC'
  };

  const rows = await dbQuery(
    `
      SELECT
        s.id,
        s.slug,
        s.title,
        s.description,
        s.short_description,
        s.category,
        s.level,
        s.pricing_tier,
        s.price_inr,
        s.instructor_name,
        s.thumbnail_url,
        s.rating,
        s.enrolled_count,
        s.estimated_hours,
        (
          SELECT v1.youtube_url
          FROM videos v1
          INNER JOIN sections sec1 ON sec1.id = v1.section_id
          WHERE sec1.subject_id = s.id
          ORDER BY sec1.order_index ASC, v1.order_index ASC, v1.id ASC
          LIMIT 1
        ) AS preview_youtube_url,
        s.created_at,
        s.updated_at,
        COUNT(DISTINCT sec.id) AS total_sections,
        COUNT(v.id) AS total_videos
      FROM subjects s
      LEFT JOIN sections sec ON sec.subject_id = s.id
      LEFT JOIN videos v ON v.section_id = sec.id
      WHERE (:search = '' OR LOWER(CONCAT_WS(' ', s.title, s.description, s.category, s.instructor_name, s.level)) LIKE :searchLike)
        AND (:category = '' OR s.category = :category)
        AND (:level = '' OR s.level = :level)
        AND (:pricingTier = '' OR s.pricing_tier = :pricingTier)
      GROUP BY
        s.id,
        s.slug,
        s.title,
        s.description,
        s.short_description,
        s.category,
        s.level,
        s.pricing_tier,
        s.price_inr,
        s.instructor_name,
        s.thumbnail_url,
        s.rating,
        s.enrolled_count,
        s.estimated_hours,
        s.created_at,
        s.updated_at
      ORDER BY ${orderByMap[sortBy] ?? orderByMap.popular}
    `,
    {
      search,
      searchLike: `%${search.toLowerCase()}%`,
      category,
      level,
      pricingTier
    }
  );

  return rows.map(normalizeSubject);
}

export async function getCatalogMetadata() {
  const rows = await dbQuery(
    `
      SELECT
        COUNT(*) AS total_courses,
        SUM(CASE WHEN pricing_tier = 'free' THEN 1 ELSE 0 END) AS free_courses,
        SUM(CASE WHEN pricing_tier = 'premium' THEN 1 ELSE 0 END) AS premium_courses,
        COUNT(DISTINCT category) AS total_categories
      FROM subjects
    `
  );

  const row = rows[0] ?? {};
  return {
    total_courses: Number(row.total_courses ?? 0),
    free_courses: Number(row.free_courses ?? 0),
    premium_courses: Number(row.premium_courses ?? 0),
    total_categories: Number(row.total_categories ?? 0)
  };
}

export async function getSubjectById(subjectId) {
  const rows = await dbQuery(
    `
      SELECT
        s.id,
        s.slug,
        s.title,
        s.description,
        s.short_description,
        s.category,
        s.level,
        s.pricing_tier,
        s.price_inr,
        s.instructor_name,
        s.thumbnail_url,
        s.rating,
        s.enrolled_count,
        s.estimated_hours,
        s.created_at,
        s.updated_at,
        COUNT(DISTINCT sec.id) AS total_sections,
        COUNT(v.id) AS total_videos
      FROM subjects s
      LEFT JOIN sections sec ON sec.subject_id = s.id
      LEFT JOIN videos v ON v.section_id = sec.id
      WHERE s.id = :subjectId
      GROUP BY
        s.id,
        s.slug,
        s.title,
        s.description,
        s.short_description,
        s.category,
        s.level,
        s.pricing_tier,
        s.price_inr,
        s.instructor_name,
        s.thumbnail_url,
        s.rating,
        s.enrolled_count,
        s.estimated_hours,
        s.created_at,
        s.updated_at
      LIMIT 1
    `,
    { subjectId }
  );
  if (rows.length === 0) throw createHttpError(404, 'Subject not found');
  return normalizeSubject(rows[0]);
}

export async function enrollInSubject(userId, subjectId) {
  await getSubjectById(subjectId);

  const columns = await getEnrollmentsColumns();
  const subjectColumn = columns.has('subject_id') ? 'subject_id' : 'course_id';
  const createdColumn = columns.has('created_at') ? 'created_at' : 'enrolled_at';
  const hasLegacyCourseColumn = columns.has('course_id');

  const existing = await dbQuery(
    `
      SELECT id
      FROM enrollments
      WHERE user_id = :userId
        AND ${subjectColumn} = :subjectId
      LIMIT 1
    `,
    { userId, subjectId }
  );

  if (existing.length > 0) return;

  await dbQuery(
    hasLegacyCourseColumn && subjectColumn === 'subject_id'
      ? `
          INSERT INTO enrollments (user_id, course_id, ${subjectColumn}, ${createdColumn})
          VALUES (:userId, NULL, :subjectId, NOW())
        `
      : `
          INSERT INTO enrollments (user_id, ${subjectColumn}, ${createdColumn})
          VALUES (:userId, :subjectId, NOW())
        `,
    { userId, subjectId }
  );
}

export async function getSubjectTree(userId, subjectId) {
  const subject = await getSubjectById(subjectId);

  const sections = await dbQuery(
    `
      SELECT id, subject_id, title, order_index
      FROM sections
      WHERE subject_id = :subjectId
      ORDER BY order_index ASC, id ASC
    `,
    { subjectId }
  );

  const videos = await dbQuery(
    `
      SELECT v.id, v.section_id, v.title, v.description, v.youtube_url, v.order_index, v.duration_seconds
      FROM videos v
      INNER JOIN sections s ON s.id = v.section_id
      WHERE s.subject_id = :subjectId
      ORDER BY s.order_index ASC, v.order_index ASC, v.id ASC
    `,
    { subjectId }
  );

  const progressRows = await dbQuery(
    `
      SELECT video_id, is_completed
      FROM video_progress vp
      INNER JOIN videos v ON v.id = vp.video_id
      INNER JOIN sections s ON s.id = v.section_id
      WHERE vp.user_id = :userId
        AND s.subject_id = :subjectId
    `,
    { userId, subjectId }
  );

  const completeSet = new Set(
    progressRows.filter((row) => Number(row.is_completed) === 1).map((row) => Number(row.video_id))
  );

  const orderedVideos = await getOrderedVideosBySubject(subjectId);
  const completedSet = await getCompletedVideoIds(userId, subjectId);
  const lockMap = computeLockMap(orderedVideos, completedSet);

  const sectionMap = new Map();
  for (const section of sections) {
    sectionMap.set(Number(section.id), {
      id: Number(section.id),
      subject_id: Number(section.subject_id),
      title: section.title,
      order_index: Number(section.order_index),
      videos: []
    });
  }

  for (const video of videos) {
    const info = lockMap.get(Number(video.id)) ?? {
      locked: true,
      unlockReason: 'Complete the previous video to unlock this content.'
    };

    const section = sectionMap.get(Number(video.section_id));
    if (!section) continue;

    section.videos.push({
      id: Number(video.id),
      section_id: Number(video.section_id),
      title: video.title,
      description: video.description,
      youtube_url: video.youtube_url,
      order_index: Number(video.order_index),
      duration_seconds: Number(video.duration_seconds),
      is_completed: completeSet.has(Number(video.id)),
      locked: info.locked
    });
  }

  return {
    ...subject,
    sections: Array.from(sectionMap.values())
  };
}

export async function getFirstUnlockedVideoId(userId, subjectId) {
  const orderedVideos = await getOrderedVideosBySubject(subjectId);
  if (orderedVideos.length === 0) throw createHttpError(404, 'No videos found in this subject');

  const completedSet = await getCompletedVideoIds(userId, subjectId);
  const lockMap = computeLockMap(orderedVideos, completedSet);
  const firstUnlocked = orderedVideos.find((video) => !lockMap.get(Number(video.id))?.locked);

  return Number(firstUnlocked?.id ?? orderedVideos[0].id);
}
