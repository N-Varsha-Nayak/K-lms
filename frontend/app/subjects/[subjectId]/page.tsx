"use client";

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../../lib/apiClient';
import { getSessionUser } from '../../../lib/authStore';
import { getYoutubeThumbnail } from '../../../lib/videoMeta';

type Subject = {
  id: number;
  title: string;
  description: string;
  short_description?: string;
  category: string;
  level: string;
  pricing_tier: 'free' | 'premium';
  price_inr: number;
  instructor_name: string;
  rating: number;
  estimated_hours: number;
  total_videos: number;
  total_sections: number;
  preview_youtube_url?: string | null;
};

export default function SubjectOverviewPage() {
  const params = useParams<{ subjectId: string }>();
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [processing, setProcessing] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const subjectId = Number(params.subjectId);

  useEffect(() => {
    setHasSession(Boolean(getSessionUser()));
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await apiRequest<Subject>(`/subjects/${subjectId}`);
        if (!active) return;
        setSubject(result);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load subject');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [subjectId]);

  async function enrollAndStart() {
    setError('');
    setProcessing(true);
    try {
      await apiRequest(`/subjects/${subjectId}/enroll`, { method: 'POST', auth: true });
      const first = await apiRequest<{ video_id: number }>(`/subjects/${subjectId}/first-video`, {
        auth: true
      });
      router.push(`/subjects/${subjectId}/video/${first.video_id}`);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes('Unauthorized')
          ? 'Please sign in first.'
          : err instanceof Error
            ? err.message
            : 'Unable to start this subject'
      );
    } finally {
      setProcessing(false);
    }
  }

  function startCheckout() {
    setError('');

    if (!getSessionUser()) {
      setError('Please sign in first.');
      return;
    }

    if (subject?.pricing_tier === 'premium') {
      setShowCheckout(true);
      return;
    }

    void enrollAndStart();
  }

  async function completePurchase() {
    setError('');
    await enrollAndStart();
  }

  if (loading) return <div className="card p-6 text-sm text-muted">Loading subject...</div>;
  if (error && !subject) return <div className="card p-6 text-sm text-red-600">{error}</div>;

  const previewThumbnail = subject?.preview_youtube_url
    ? getYoutubeThumbnail(subject.preview_youtube_url)
    : null;

  return (
    <section className="mx-auto max-w-3xl">
      <div className="card p-6 md:p-8">
        {previewThumbnail ? (
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewThumbnail}
              alt={`${subject?.title} preview thumbnail`}
              className="aspect-video w-full object-cover"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <span className="pill">{subject?.category}</span>
          <span className="pill">{subject?.level}</span>
          <span className="pill">
            {subject?.pricing_tier === 'free'
              ? 'Free course'
              : `Premium | INR ${subject ? subject.price_inr.toLocaleString('en-IN') : ''}`}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{subject?.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">{subject?.description}</p>

        <div className="mt-5 grid gap-3 text-sm text-muted md:grid-cols-2">
          <p>Instructor: {subject?.instructor_name}</p>
          <p>Rating: {subject ? subject.rating.toFixed(1) : ''}</p>
          <p>{subject?.total_sections} sections</p>
          <p>{subject?.total_videos} lessons</p>
          <p>{subject?.estimated_hours} estimated hours</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className="btn" onClick={startCheckout} disabled={processing}>
            {subject?.pricing_tier === 'free' ? 'Enroll and start' : 'Join this premium track'}
          </button>
          <Link className="btn-muted" href="/subjects">
            Back to courses
          </Link>
          {!hasSession ? (
            <Link className="btn-muted" href="/login">
              Sign in
            </Link>
          ) : null}
        </div>

        {showCheckout && subject?.pricing_tier === 'premium' ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Payment method</p>
                <h2 className="mt-2 text-xl font-semibold">Purchase {subject.title}</h2>
                <p className="mt-2 text-sm text-muted">
                  Choose a payment method to unlock this premium course and add it to your learning dashboard.
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-soft">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Total</p>
                <p className="mt-1 text-xl font-semibold">
                  INR {subject.price_inr.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                { id: 'upi', label: 'UPI', helper: 'Pay with UPI apps and QR flow' },
                { id: 'card', label: 'Card', helper: 'Credit or debit card checkout' },
                { id: 'netbanking', label: 'Net Banking', helper: 'Use your bank login to pay' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentMethod(option.id as 'upi' | 'card' | 'netbanking')}
                  className={`rounded-2xl border p-4 text-left transition ${
                    paymentMethod === option.id
                      ? 'border-slate-900 bg-white shadow-soft'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">{option.label}</p>
                  <p className="mt-1 text-sm text-muted">{option.helper}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className="btn" onClick={completePurchase} disabled={processing}>
                {processing ? 'Processing purchase...' : `Pay with ${paymentMethod.toUpperCase()} and start`}
              </button>
              <button className="btn-muted" type="button" onClick={() => setShowCheckout(false)} disabled={processing}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}
