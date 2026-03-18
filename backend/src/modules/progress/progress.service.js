import { dbQuery } from '../../config/db.js';
import { createHttpError } from '../../utils/errors.js';
import {
  findPrevNext,
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

export async function getVideoProgress(userId, videoId) {
  const rows = await dbQuery(
    `
      SELECT id, user_id, video_id, last_position_seconds, is_completed, completed_at, created_at, updated_at
      FROM video_progress
      WHERE user_id = :userId AND video_id = :videoId
      LIMIT 1
    `,
    { userId, videoId }
  );

  if (rows.length === 0) {
    return {
      user_id: Number(userId),
      video_id: Number(videoId),
      last_position_seconds: 0,
      is_completed: false,
      completed_at: null
    };
  }

  const row = rows[0];
  return {
    ...row,
    user_id: Number(row.user_id),
    video_id: Number(row.video_id),
    last_position_seconds: Number(row.last_position_seconds),
    is_completed: Number(row.is_completed) === 1
  };
}

async function getSubjectForVideo(videoId) {
  const rows = await dbQuery(
    `
      SELECT s.subject_id
      FROM videos v
      INNER JOIN sections s ON s.id = v.section_id
      WHERE v.id = :videoId
      LIMIT 1
    `,
    { videoId }
  );
  if (rows.length === 0) throw createHttpError(404, 'Video not found');
  return Number(rows[0].subject_id);
}

export async function upsertVideoProgress(userId, videoId, data) {
  const { last_position_seconds: lastPositionSeconds, is_completed: isCompleted } = data;

  await dbQuery(
    `
      INSERT INTO video_progress (user_id, video_id, last_position_seconds, is_completed, completed_at)
      VALUES (:userId, :videoId, :lastPositionSeconds, :isCompleted, CASE WHEN :isCompleted = 1 THEN NOW() ELSE NULL END)
      ON DUPLICATE KEY UPDATE
        last_position_seconds = VALUES(last_position_seconds),
        is_completed = VALUES(is_completed),
        completed_at = CASE
          WHEN VALUES(is_completed) = 1 AND completed_at IS NULL THEN NOW()
          WHEN VALUES(is_completed) = 0 THEN NULL
          ELSE completed_at
        END
    `,
    {
      userId,
      videoId,
      lastPositionSeconds,
      isCompleted: isCompleted ? 1 : 0
    }
  );

  return getVideoProgress(userId, videoId);
}

export async function getSubjectProgress(userId, subjectId) {
  const orderedVideos = await getOrderedVideosBySubject(subjectId);
  const totalVideos = orderedVideos.length;
  if (totalVideos === 0) {
    return {
      total_videos: 0,
      completed_videos: 0,
      percent_complete: 0,
      last_video_id: null
    };
  }

  const completedSet = await getCompletedVideoIds(userId, subjectId);

  const lastProgressRows = await dbQuery(
    `
      SELECT vp.video_id, vp.updated_at
      FROM video_progress vp
      INNER JOIN videos v ON v.id = vp.video_id
      INNER JOIN sections s ON s.id = v.section_id
      WHERE vp.user_id = :userId
        AND s.subject_id = :subjectId
      ORDER BY vp.updated_at DESC
      LIMIT 1
    `,
    { userId, subjectId }
  );

  const completedVideos = completedSet.size;
  const percent = Math.round((completedVideos / totalVideos) * 100);

  return {
    total_videos: totalVideos,
    completed_videos: completedVideos,
    percent_complete: percent,
    last_video_id: lastProgressRows.length > 0 ? Number(lastProgressRows[0].video_id) : null
  };
}

export async function getNextVideoAfterCompletion(userId, videoId) {
  const subjectId = await getSubjectForVideo(videoId);
  const orderedVideos = await getOrderedVideosBySubject(subjectId);
  const nav = findPrevNext(orderedVideos, videoId);
  if (!nav.nextVideoId) return null;

  const completedSet = await getCompletedVideoIds(userId, subjectId);
  const justCompleted = Number(videoId);
  completedSet.add(justCompleted);

  const next = orderedVideos.find((video) => Number(video.id) === Number(nav.nextVideoId));
  const prevCompleted = completedSet.has(Number(videoId));

  if (next && prevCompleted) return Number(next.id);
  return null;
}

function normalizeOverviewCourse(row) {
  const totalVideos = Number(row.total_videos ?? 0);
  const completedVideos = Number(row.completed_videos ?? 0);
  const percentComplete = totalVideos === 0 ? 0 : Math.round((completedVideos / totalVideos) * 100);

  return {
    id: Number(row.id),
    title: row.title,
    short_description: row.short_description,
    category: row.category,
    level: row.level,
    pricing_tier: row.pricing_tier,
    price_inr: Number(row.price_inr ?? 0),
    instructor_name: row.instructor_name,
    thumbnail_url: row.thumbnail_url,
    rating: Number(row.rating ?? 0),
    estimated_hours: Number(row.estimated_hours ?? 0),
    total_videos: totalVideos,
    completed_videos: completedVideos,
    percent_complete: percentComplete,
    last_video_id: row.last_video_id ? Number(row.last_video_id) : null,
    enrolled_at: row.enrolled_at,
    last_activity_at: row.last_activity_at
  };
}

export async function getLearnerOverview(userId) {
  const columns = await getEnrollmentsColumns();
  const subjectColumn = columns.has('subject_id') ? 'subject_id' : 'course_id';
  const createdColumn = columns.has('created_at') ? 'created_at' : 'enrolled_at';

  const enrolledRows = await dbQuery(
    `
      SELECT
        s.id,
        s.title,
        s.short_description,
        s.category,
        s.level,
        s.pricing_tier,
        s.price_inr,
        s.instructor_name,
        s.thumbnail_url,
        s.rating,
        s.estimated_hours,
        COUNT(DISTINCT v.id) AS total_videos,
        COALESCE(SUM(CASE WHEN vp.user_id = :userId AND vp.is_completed = 1 THEN 1 ELSE 0 END), 0) AS completed_videos,
        MAX(vp.updated_at) AS last_activity_at,
        (
          SELECT vp2.video_id
          FROM video_progress vp2
          INNER JOIN videos v2 ON v2.id = vp2.video_id
          INNER JOIN sections sec2 ON sec2.id = v2.section_id
          WHERE vp2.user_id = :userId
            AND sec2.subject_id = s.id
          ORDER BY vp2.updated_at DESC
          LIMIT 1
        ) AS last_video_id,
        e.${createdColumn} AS enrolled_at
      FROM enrollments e
      INNER JOIN subjects s ON s.id = e.${subjectColumn}
      LEFT JOIN sections sec ON sec.subject_id = s.id
      LEFT JOIN videos v ON v.section_id = sec.id
      LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.user_id = :userId
      WHERE e.user_id = :userId
      GROUP BY
        s.id,
        s.title,
        s.short_description,
        s.category,
        s.level,
        s.pricing_tier,
        s.price_inr,
        s.instructor_name,
        s.thumbnail_url,
        s.rating,
        s.estimated_hours,
        e.${createdColumn}
      ORDER BY last_activity_at DESC, e.${createdColumn} DESC
    `,
    { userId }
  );

  const enrolledCourses = enrolledRows.map(normalizeOverviewCourse);
  const continueLearning = enrolledCourses
    .filter((course) => course.percent_complete > 0 && course.percent_complete < 100)
    .slice(0, 4);

  const watchedRows = await dbQuery(
    `
      SELECT COALESCE(SUM(last_position_seconds), 0) AS watched_seconds
      FROM video_progress
      WHERE user_id = :userId
    `,
    { userId }
  );

  const watchedSeconds = Number(watchedRows[0]?.watched_seconds ?? 0);
  const completedLessons = enrolledCourses.reduce((sum, course) => sum + course.completed_videos, 0);
  const totalLessons = enrolledCourses.reduce((sum, course) => sum + course.total_videos, 0);
  const completedCourses = enrolledCourses.filter(
    (course) => course.total_videos > 0 && course.completed_videos === course.total_videos
  ).length;
  const inProgressCourses = enrolledCourses.filter(
    (course) => course.completed_videos > 0 && course.completed_videos < course.total_videos
  ).length;

  const recommendedRows = await dbQuery(
    `
      SELECT
        s.id,
        s.title,
        s.short_description,
        s.category,
        s.level,
        s.pricing_tier,
        s.price_inr,
        s.instructor_name,
        s.thumbnail_url,
        s.rating,
        s.estimated_hours,
        COUNT(v.id) AS total_videos
      FROM subjects s
      LEFT JOIN sections sec ON sec.subject_id = s.id
      LEFT JOIN videos v ON v.section_id = sec.id
      WHERE s.id NOT IN (
        SELECT ${subjectColumn}
        FROM enrollments
        WHERE user_id = :userId
      )
      GROUP BY
        s.id,
        s.title,
        s.short_description,
        s.category,
        s.level,
        s.pricing_tier,
        s.price_inr,
        s.instructor_name,
        s.thumbnail_url,
        s.rating,
        s.estimated_hours
      ORDER BY s.enrolled_count DESC, s.rating DESC, s.created_at DESC
      LIMIT 4
    `,
    { userId }
  );

  const recommendedCourses = recommendedRows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    short_description: row.short_description,
    category: row.category,
    level: row.level,
    pricing_tier: row.pricing_tier,
    price_inr: Number(row.price_inr ?? 0),
    instructor_name: row.instructor_name,
    thumbnail_url: row.thumbnail_url,
    rating: Number(row.rating ?? 0),
    estimated_hours: Number(row.estimated_hours ?? 0),
    total_videos: Number(row.total_videos ?? 0)
  }));

  return {
    stats: {
      enrolled_courses: enrolledCourses.length,
      completed_courses: completedCourses,
      in_progress_courses: inProgressCourses,
      completed_lessons: completedLessons,
      total_lessons: totalLessons,
      hours_learned: Number((watchedSeconds / 3600).toFixed(1))
    },
    continue_learning: continueLearning,
    enrolled_courses: enrolledCourses,
    recommended_courses: recommendedCourses
  };
}
