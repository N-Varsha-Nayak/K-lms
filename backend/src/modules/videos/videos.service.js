import { dbQuery } from '../../config/db.js';
import { createHttpError } from '../../utils/errors.js';
import {
  computeLockMap,
  findPrevNext,
  getCompletedVideoIds,
  getOrderedVideosBySubject
} from './unlock.service.js';

async function getSubjectIdForVideo(videoId) {
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

export async function getVideoDetailsForUser(userId, videoId) {
  const subjectId = await getSubjectIdForVideo(videoId);
  const orderedVideos = await getOrderedVideosBySubject(subjectId);
  const completedSet = await getCompletedVideoIds(userId, subjectId);
  const lockMap = computeLockMap(orderedVideos, completedSet);

  const current = orderedVideos.find((video) => Number(video.id) === Number(videoId));
  if (!current) throw createHttpError(404, 'Video not found');

  const nav = findPrevNext(orderedVideos, videoId);
  const lockInfo = lockMap.get(Number(videoId));

  return {
    id: Number(current.id),
    section_id: Number(current.section_id),
    title: current.title,
    description: current.description,
    youtube_url: current.youtube_url,
    order_index: Number(current.order_index),
    duration_seconds: Number(current.duration_seconds),
    previous_video_id: nav.previousVideoId,
    next_video_id: nav.nextVideoId,
    locked: lockInfo?.locked ?? true,
    unlock_reason:
      lockInfo?.unlockReason ?? 'Complete the previous video to unlock this content.'
  };
}
