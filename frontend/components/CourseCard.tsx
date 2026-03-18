import Link from 'next/link';
import { Course, LearnerCourse, formatPriceInr } from '../lib/courseData';
import { getYoutubeThumbnail } from '../lib/videoMeta';

type CourseCardProps = {
  course: Course | LearnerCourse;
  href?: string;
  progressPercent?: number;
  ctaLabel?: string;
};

export default function CourseCard({
  course,
  href = `/subjects/${course.id}`,
  progressPercent,
  ctaLabel = 'View course'
}: CourseCardProps) {
  const description =
    'short_description' in course && course.short_description
      ? course.short_description
      : 'description' in course
        ? course.description
        : '';
  const thumbnailUrl = course.thumbnail_url ?? (course.preview_youtube_url ? getYoutubeThumbnail(course.preview_youtube_url) : null);

  return (
    <article className="card flex h-full flex-col overflow-hidden">
      {thumbnailUrl ? (
        <div className="relative border-b border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={`${course.title} thumbnail`}
            className="aspect-video w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4">
            <p className="text-base font-semibold text-white">{course.title}</p>
            <p className="mt-1 text-sm text-white/80">{course.instructor_name}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="pill">{course.category}</span>
            <span className="pill">{course.level}</span>
            <span className="pill">
              {course.pricing_tier === 'free' ? 'Free course' : 'Premium course'}
            </span>
          </div>
          {!thumbnailUrl ? <h3 className="text-lg font-semibold leading-snug">{course.title}</h3> : null}
        </div>
        <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Price</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {formatPriceInr(course.price_inr, course.pricing_tier)}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-muted">{description}</p>

      <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
        <p>{course.instructor_name}</p>
        <p>{course.rating.toFixed(1)} rating</p>
        <p>{course.estimated_hours} hours</p>
        <p>{course.total_videos} lessons</p>
      </div>

      {typeof progressPercent === 'number' ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-slate-900 transition-all"
              style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted">
          {course.pricing_tier === 'free' ? 'Start learning today' : 'Career-track curriculum'}
        </span>
        <Link className="btn" href={href}>
          {ctaLabel}
        </Link>
      </div>
      </div>
    </article>
  );
}
