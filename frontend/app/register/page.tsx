"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { apiRequest } from '../../lib/apiClient';
import { setAccessToken, setSessionUser } from '../../lib/authStore';

type RegisterResponse = {
  user: { id: number; email: string; name: string };
  access_token: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '');
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    try {
      const result = await apiRequest<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: { name, email, password }
      });

      setAccessToken(result.access_token);
      setSessionUser(result.user);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md">
      <div className="card p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mb-6 text-sm text-muted">Start your learning journey.</p>

        <form className="space-y-3" onSubmit={onSubmit}>
          <input className="input" type="text" name="name" placeholder="Full name" required />
          <input className="input" type="email" name="email" placeholder="Email" required />
          <input
            className="input"
            type="password"
            name="password"
            minLength={8}
            placeholder="Password (min 8 chars)"
            required
          />
          <button className="btn w-full" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <p className="mt-5 text-sm text-muted">
          Already have an account? <Link href="/login" className="text-ink underline">Sign in</Link>
        </p>
      </div>
    </section>
  );
}
