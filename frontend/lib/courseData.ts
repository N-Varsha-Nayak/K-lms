export type Course = {
  id: number;
  slug?: string;
  title: string;
  description: string;
  short_description?: string;
  category: string;
  level: string;
  pricing_tier: 'free' | 'premium';
  price_inr: number;
  instructor_name: string;
  thumbnail_url?: string | null;
  preview_youtube_url?: string | null;
  rating: number;
  enrolled_count: number;
  estimated_hours: number;
  total_sections: number;
  total_videos: number;
};

export type CatalogSummary = {
  total_courses: number;
  free_courses: number;
  premium_courses: number;
  total_categories: number;
};

export type LearnerStats = {
  enrolled_courses: number;
  completed_courses: number;
  in_progress_courses: number;
  completed_lessons: number;
  total_lessons: number;
  hours_learned: number;
};

export type LearnerCourse = {
  id: number;
  title: string;
  short_description: string;
  category: string;
  level: string;
  pricing_tier: 'free' | 'premium';
  price_inr: number;
  instructor_name: string;
  thumbnail_url?: string | null;
  preview_youtube_url?: string | null;
  rating: number;
  estimated_hours: number;
  total_videos: number;
  completed_videos?: number;
  percent_complete?: number;
  last_video_id?: number | null;
};

export type LearnerOverview = {
  stats: LearnerStats;
  continue_learning: LearnerCourse[];
  enrolled_courses: LearnerCourse[];
  recommended_courses: LearnerCourse[];
};

export function formatPriceInr(
  priceInr: number,
  pricingTier: Course['pricing_tier'] | LearnerCourse['pricing_tier']
) {
  if (pricingTier === 'free' || priceInr <= 0) return 'Free';
  return `INR ${priceInr.toLocaleString('en-IN')}`;
}
