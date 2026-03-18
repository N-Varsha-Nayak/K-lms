"use client";

import { useEffect, useMemo, useState } from 'react';
import CourseCard from '../../components/CourseCard';
import { apiRequest } from '../../lib/apiClient';
import { CatalogSummary, Course } from '../../lib/courseData';

type CatalogResponse = {
  subjects: Course[];
  catalog: CatalogSummary;
};

export default function SubjectsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null);
  const [search, setSearch] = useState('');
  const [pricingTier, setPricingTier] = useState<'all' | 'free' | 'premium'>('all');
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest' | 'title'>('popular');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await apiRequest<CatalogResponse>('/subjects');
        if (!active) return;
        setCourses(result.subjects);
        setCatalog(result.catalog);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load courses');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(courses.map((course) => course.category))).sort()],
    [courses]
  );
  const levels = useMemo(
    () => ['all', ...Array.from(new Set(courses.map((course) => course.level))).sort()],
    [courses]
  );

  const filteredCourses = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    const result = courses.filter((course) => {
      const matchesSearch =
        searchValue.length === 0 ||
        `${course.title} ${course.description} ${course.category} ${course.instructor_name}`
          .toLowerCase()
          .includes(searchValue);
      const matchesTier = pricingTier === 'all' || course.pricing_tier === pricingTier;
      const matchesCategory = category === 'all' || course.category === category;
      const matchesLevel = level === 'all' || course.level === level;

      return matchesSearch && matchesTier && matchesCategory && matchesLevel;
    });

    const sorted = [...result];
    if (sortBy === 'rating') sorted.sort((a, b) => b.rating - a.rating || b.enrolled_count - a.enrolled_count);
    if (sortBy === 'newest') sorted.sort((a, b) => b.id - a.id);
    if (sortBy === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'popular') sorted.sort((a, b) => b.enrolled_count - a.enrolled_count || b.rating - a.rating);
    return sorted;
  }, [category, courses, level, pricingTier, search, sortBy]);

  const freeCourses = filteredCourses.filter((course) => course.pricing_tier === 'free');
  const premiumCourses = filteredCourses.filter((course) => course.pricing_tier === 'premium');

  if (loading) return <div className="card p-6 text-sm text-muted">Loading course catalog...</div>;
  if (error) return <div className="card p-6 text-sm text-red-600">{error}</div>;

  return (
    <section className="space-y-6">
      <div className="hero-panel">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="pill">Course catalog</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Filter free and premium courses the way learners expect.
            </h1>
            <p className="mt-3 text-base text-muted">
              Search by skill, narrow by category and level, then compare free access with premium career-track programs.
            </p>
          </div>
          {catalog ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="card border-0 bg-white/80 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Free</p>
                <p className="mt-2 text-2xl font-semibold">{catalog.free_courses}</p>
              </div>
              <div className="card border-0 bg-white/80 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Premium</p>
                <p className="mt-2 text-2xl font-semibold">{catalog.premium_courses}</p>
              </div>
              <div className="card border-0 bg-white/80 p-4 text-center">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Categories</p>
                <p className="mt-2 text-2xl font-semibold">{catalog.total_categories}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:flex-nowrap xl:items-center">
          <input
            className="input xl:min-w-0 xl:flex-[2.4]"
            placeholder="Search courses, instructors, or topics"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="input xl:w-52"
            value={pricingTier}
            onChange={(event) => setPricingTier(event.target.value as 'all' | 'free' | 'premium')}
          >
            <option value="all">All pricing</option>
            <option value="free">Free only</option>
            <option value="premium">Premium only</option>
          </select>
          <select className="input xl:w-56" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((entry) => (
              <option key={entry} value={entry}>
                {entry === 'all' ? 'All categories' : entry}
              </option>
            ))}
          </select>
          <select className="input xl:w-48" value={level} onChange={(event) => setLevel(event.target.value)}>
            {levels.map((entry) => (
              <option key={entry} value={entry}>
                {entry === 'all' ? 'All levels' : entry}
              </option>
            ))}
          </select>
          <select
            className="input xl:w-56"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as 'popular' | 'rating' | 'newest' | 'title')}
          >
            <option value="popular">Sort by popularity</option>
            <option value="rating">Sort by rating</option>
            <option value="newest">Sort by newest</option>
            <option value="title">Sort by title</option>
          </select>
        </div>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted">{filteredCourses.length} courses match your filters.</p>
          <div className="text-sm text-muted">Filter by pricing, category, level, and skill in one row.</div>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="card p-6 text-sm text-muted">No courses match the selected filters yet.</div>
      ) : null}

      {(pricingTier === 'all' || pricingTier === 'free') && freeCourses.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Free Courses</h2>
            <p className="mt-1 text-sm text-muted">High-value learning paths available immediately.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {freeCourses.map((course) => (
              <CourseCard key={course.id} course={course} ctaLabel="Explore free course" />
            ))}
          </div>
        </div>
      ) : null}

      {(pricingTier === 'all' || pricingTier === 'premium') && premiumCourses.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Premium Courses</h2>
            <p className="mt-1 text-sm text-muted">Deeper programs designed around stronger career outcomes.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {premiumCourses.map((course) => (
              <CourseCard key={course.id} course={course} ctaLabel="View premium course" />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
