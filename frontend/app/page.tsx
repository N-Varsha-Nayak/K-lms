"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CourseCard from '../components/CourseCard';
import { apiRequest } from '../lib/apiClient';
import { clearSession, getSessionUser, SessionUser } from '../lib/authStore';
import { CatalogSummary, Course, LearnerOverview } from '../lib/courseData';

type CatalogResponse = {
  subjects: Course[];
  catalog: CatalogSummary;
};

export default function HomePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null);
  const [overview, setOverview] = useState<LearnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const sessionUser = getSessionUser();
    setUser(sessionUser);

    async function load() {
      try {
        const catalogResponse = await apiRequest<CatalogResponse>('/subjects');
        if (!active) return;
        setCourses(catalogResponse.subjects);
        setCatalog(catalogResponse.catalog);

        if (sessionUser) {
          try {
            const learnerOverview = await apiRequest<LearnerOverview>('/progress/overview', {
              auth: true
            });
            if (!active) return;
            setOverview(learnerOverview);
          } catch (overviewError) {
            if (!active) return;
            if (overviewError instanceof Error && overviewError.message.includes('Unauthorized')) {
              clearSession();
              setUser(null);
            }
          }
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load the homepage');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const freeCourses = courses.filter((course) => course.pricing_tier === 'free').slice(0, 4);
  const premiumCourses = courses.filter((course) => course.pricing_tier === 'premium').slice(0, 4);

  if (loading) return <div className="card p-6 text-sm text-muted">Loading homepage...</div>;
  if (error) return <div className="card p-6 text-sm text-red-600">{error}</div>;

  return (
    <section className="space-y-8">
      <div className="hero-panel">
        {user && overview ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="pill">Personalized dashboard</p>
                <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                  Welcome back, {user.name.split(' ')[0]}. Keep your learning streak moving.
                </h1>
                <p className="mt-3 text-base text-muted md:text-lg">
                  Your homepage now shows enrolled courses, completed lessons, and what to resume next.
                </p>
              </div>
              <div className="flex gap-3">
                <Link className="btn" href="/subjects">
                  Explore more courses
                </Link>
                <Link className="btn-muted" href="/progress">
                  View full progress
                </Link>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="card border-0 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Enrolled courses</p>
                <p className="mt-2 text-3xl font-semibold">{overview.stats.enrolled_courses}</p>
              </div>
              <div className="card border-0 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Completed courses</p>
                <p className="mt-2 text-3xl font-semibold">{overview.stats.completed_courses}</p>
              </div>
              <div className="card border-0 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Lessons finished</p>
                <p className="mt-2 text-3xl font-semibold">
                  {overview.stats.completed_lessons}/{overview.stats.total_lessons}
                </p>
              </div>
              <div className="card border-0 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Hours learned</p>
                <p className="mt-2 text-3xl font-semibold">{overview.stats.hours_learned}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="max-w-3xl space-y-5">
              <p className="pill">Structured learning path</p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Learn with a catalog that feels closer to Udemy and Coursera.
              </h1>
              <p className="max-w-2xl text-base text-muted md:text-lg">
                Browse by category, level, and pricing tier. Start with free courses or jump into premium career tracks.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link className="btn" href="/register">
                  Start learning
                </Link>
                <Link className="btn-muted" href="/subjects">
                  Browse catalog
                </Link>
              </div>
            </div>

            {catalog ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="card border-0 bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted">Courses</p>
                  <p className="mt-2 text-3xl font-semibold">{catalog.total_courses}</p>
                </div>
                <div className="card border-0 bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted">Free</p>
                  <p className="mt-2 text-3xl font-semibold">{catalog.free_courses}</p>
                </div>
                <div className="card border-0 bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted">Premium</p>
                  <p className="mt-2 text-3xl font-semibold">{catalog.premium_courses}</p>
                </div>
                <div className="card border-0 bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted">Categories</p>
                  <p className="mt-2 text-3xl font-semibold">{catalog.total_categories}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {overview?.continue_learning?.length ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Continue Learning</h2>
              <p className="mt-1 text-sm text-muted">Pick up exactly where you left off.</p>
            </div>
            <Link className="btn-muted" href="/progress">
              All progress
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {overview.continue_learning.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                href={
                  course.last_video_id
                    ? `/subjects/${course.id}/video/${course.last_video_id}`
                    : `/subjects/${course.id}`
                }
                progressPercent={course.percent_complete}
                ctaLabel={course.last_video_id ? 'Resume course' : 'Open course'}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Free Courses</h2>
            <p className="mt-1 text-sm text-muted">Strong entry points with zero upfront cost.</p>
          </div>
          <Link className="btn-muted" href="/subjects">
            View catalog
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {freeCourses.map((course) => (
            <CourseCard key={course.id} course={course} ctaLabel="Explore free course" />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Premium Career Tracks</h2>
            <p className="mt-1 text-sm text-muted">Longer, deeper programs designed around stronger career outcomes.</p>
          </div>
          <Link className="btn-muted" href="/subjects">
            Compare premium paths
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {premiumCourses.map((course) => (
            <CourseCard key={course.id} course={course} ctaLabel="View premium course" />
          ))}
        </div>
      </div>

      {user && overview?.recommended_courses?.length ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Recommended Next</h2>
            <p className="mt-1 text-sm text-muted">Suggested courses based on your current learning track.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overview.recommended_courses.map((course) => (
              <CourseCard key={course.id} course={course} ctaLabel="Preview course" />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
