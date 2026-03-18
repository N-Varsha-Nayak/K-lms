"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProgressBar from '../../components/ProgressBar';
import { apiRequest } from '../../lib/apiClient';
import { LearnerOverview } from '../../lib/courseData';

export default function ProgressPage() {
  const [overview, setOverview] = useState<LearnerOverview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await apiRequest<LearnerOverview>('/progress/overview', { auth: true });
        if (!active) return;
        setOverview(result);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load progress');
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  if (error) return <div className="card p-6 text-sm text-red-600">{error}</div>;

  return (
    <section className="space-y-6">
      <div className="hero-panel">
        <h1 className="text-3xl font-semibold tracking-tight">Learning Progress</h1>
        <p className="mt-2 text-sm text-muted">
          Track enrolled courses, completion rates, and what to resume next.
        </p>
        {overview ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="card border-0 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Enrolled</p>
              <p className="mt-2 text-2xl font-semibold">{overview.stats.enrolled_courses}</p>
            </div>
            <div className="card border-0 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Completed</p>
              <p className="mt-2 text-2xl font-semibold">{overview.stats.completed_courses}</p>
            </div>
            <div className="card border-0 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Hours Learned</p>
              <p className="mt-2 text-2xl font-semibold">{overview.stats.hours_learned}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {overview?.enrolled_courses?.map((course) => {
          const percent = course.percent_complete ?? 0;
          const completedVideos = course.completed_videos ?? 0;

          return (
            <article key={course.id} className="card p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{course.title}</h2>
                  <p className="text-sm text-muted">
                    {completedVideos}/{course.total_videos} lessons completed
                  </p>
                </div>
                {course.last_video_id ? (
                  <Link className="btn-muted" href={`/subjects/${course.id}/video/${course.last_video_id}`}>
                    Resume
                  </Link>
                ) : (
                  <Link className="btn-muted" href={`/subjects/${course.id}`}>
                    Start
                  </Link>
                )}
              </div>
              <ProgressBar value={percent} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
