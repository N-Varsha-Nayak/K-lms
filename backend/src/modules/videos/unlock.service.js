import { dbQuery } from '../../config/db.js';

export async function getOrderedVideosBySubject(subjectId) {
  return dbQuery(
    `
      SELECT
        v.id,
        v.section_id,
        v.title,
        v.description,
        v.youtube_url,
        v.order_index,
        v.duration_seconds,
        s.order_index AS section_order_index
      FROM videos v
      INNER JOIN sections s ON s.id = v.section_id
      WHERE s.subject_id = :subjectId
      ORDER BY s.order_index ASC, v.order_index ASC, v.id ASC
    `,
    { subjectId }
  );
}

export async function getCompletedVideoIds(userId, subjectId) {
  const rows = await dbQuery(
    `
      SELECT vp.video_id
      FROM video_progress vp
      INNER JOIN videos v ON v.id = vp.video_id
      INNER JOIN sections s ON s.id = v.section_id
      WHERE vp.user_id = :userId
        AND s.subject_id = :subjectId
        AND vp.is_completed = 1
    `,
    { userId, subjectId }
  );

  return new Set(rows.map((row) => Number(row.video_id)));
}

export function computeLockMap(orderedVideos, completedSet) {
  const lockMap = new Map();

  for (let i = 0; i < orderedVideos.length; i += 1) {
    const video = orderedVideos[i];
    if (i === 0) {
      lockMap.set(Number(video.id), {
        locked: false,
        unlockReason: 'First video is always unlocked'
      });
      continue;
    }

    const prevId = Number(orderedVideos[i - 1].id);
    const prevCompleted = completedSet.has(prevId);

    lockMap.set(Number(video.id), {
      locked: !prevCompleted,
      unlockReason: prevCompleted
        ? 'Unlocked after completing previous video'
        : 'Complete the previous video to unlock this content.'
    });
  }

  return lockMap;
}

export function findPrevNext(orderedVideos, videoId) {
  const index = orderedVideos.findIndex((video) => Number(video.id) === Number(videoId));
  if (index === -1) {
    return { previousVideoId: null, nextVideoId: null, index: -1 };
  }

  return {
    index,
    previousVideoId: index > 0 ? Number(orderedVideos[index - 1].id) : null,
    nextVideoId: index < orderedVideos.length - 1 ? Number(orderedVideos[index + 1].id) : null
  };
}
