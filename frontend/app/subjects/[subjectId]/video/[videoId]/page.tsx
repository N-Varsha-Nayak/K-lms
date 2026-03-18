"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '../../../../../components/Sidebar';
import VideoPlayer from '../../../../../components/VideoPlayer';
import { apiRequest } from '../../../../../lib/apiClient';
import { buildLessonSegments, getYoutubeThumbnail } from '../../../../../lib/videoMeta';

type VideoItem = {
  id: number;
  title: string;
  locked: boolean;
  is_completed: boolean;
};

type SectionItem = {
  id: number;
  title: string;
  videos: VideoItem[];
};

type SubjectTree = {
  id: number;
  title: string;
  sections: SectionItem[];
};

type VideoDetails = {
  id: number;
  title: string;
  description: string;
  youtube_url: string;
  duration_seconds: number;
  previous_video_id: number | null;
  next_video_id: number | null;
  locked: boolean;
  unlock_reason: string;
};

type VideoProgress = {
  last_position_seconds: number;
};

export default function LearningPage() {
  const params = useParams<{ subjectId: string; videoId: string }>();
  const subjectId = Number(params.subjectId);
  const videoId = Number(params.videoId);

  const [tree, setTree] = useState<SubjectTree | null>(null);
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [progress, setProgress] = useState<VideoProgress>({ last_position_seconds: 0 });
  const [error, setError] = useState('');
  const [selectedSegmentSeconds, setSelectedSegmentSeconds] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setError('');
      try {
        const [treeData, videoData, progressData] = await Promise.all([
          apiRequest<SubjectTree>(`/subjects/${subjectId}/tree`, { auth: true }),
          apiRequest<VideoDetails>(`/videos/${videoId}`, { auth: true }),
          apiRequest<VideoProgress>(`/progress/videos/${videoId}`, { auth: true })
        ]);

        if (!active) return;
        setTree(treeData);
        setVideo(videoData);
        setProgress(progressData);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error && err.message.includes('Unauthorized')
            ? 'Please sign in to continue learning.'
            : err instanceof Error
              ? err.message
              : 'Failed to load learning view'
        );
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [subjectId, videoId]);

  if (error) return <div className="card p-6 text-sm text-red-600">{error}</div>;
  if (!tree || !video) return <div className="card p-6 text-sm text-muted">Loading lesson...</div>;

  const thumbnailUrl = getYoutubeThumbnail(video.youtube_url);
  const lessonSegments = buildLessonSegments(video.title, video.duration_seconds);

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Sidebar subjectId={subjectId} currentVideoId={videoId} sections={tree.sections} />
      <div className="space-y-4">
        <div className="card p-5">
          <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
            {thumbnailUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl}
                  alt={`${video.title} thumbnail`}
                  className="aspect-video w-full object-cover"
                />
              </div>
            ) : null}

            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Now learning</p>
              <h1 className="mt-2 text-xl font-semibold">{video.title}</h1>
              <p className="mt-2 text-sm text-muted">{video.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="pill">{Math.ceil(video.duration_seconds / 60)} min lesson</span>
                <span className="pill">{lessonSegments.length} subtopics</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Lesson sequence</p>
              <h2 className="mt-2 text-lg font-semibold">Subtopics in order</h2>
            </div>
            <p className="text-sm text-muted">Long lessons are broken into guided checkpoints.</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {lessonSegments.map((segment, index) => (
              <button
                key={segment.id}
                type="button"
                onClick={() => setSelectedSegmentSeconds(segment.startSeconds)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400 hover:shadow-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">
                    {index + 1}. {segment.title}
                  </p>
                  <span className="pill">{segment.startLabel}</span>
                </div>
                <p className="mt-2 text-sm text-muted">{segment.focus}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Jump to this moment
                </p>
              </button>
            ))}
          </div>
        </div>

        <VideoPlayer
          subjectId={subjectId}
          videoId={video.id}
          youtubeUrl={video.youtube_url}
          initialPositionSeconds={progress.last_position_seconds ?? 0}
          locked={video.locked}
          unlockReason={video.unlock_reason}
          previousVideoId={video.previous_video_id}
          nextVideoId={video.next_video_id}
          seekToSeconds={selectedSegmentSeconds}
        />
      </div>
    </section>
  );
}
