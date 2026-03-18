"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { apiRequest } from '../../lib/apiClient';
import { setAccessToken, setSessionUser } from '../../lib/authStore';

type LoginResponse = {
  user: { id: number; email: string; name: string };
  access_token: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    try {
      const result = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      setAccessToken(result.access_token);
      setSessionUser(result.user);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md">
      <div className="card p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mb-6 text-sm text-muted">Sign in to continue learning.</p>

        <form className="space-y-3" onSubmit={onSubmit}>
          <input className="input" type="email" name="email" placeholder="Email" required />
          <input className="input" type="password" name="password" placeholder="Password" required />
          <button className="btn w-full" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <p className="mt-5 text-sm text-muted">
          New here? <Link href="/register" className="text-ink underline">Create an account</Link>
        </p>
      </div>
    </section>
  );
}
