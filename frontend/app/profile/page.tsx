"use client";

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { apiRequest } from '../../lib/apiClient';
import { clearSession, getSessionUser } from '../../lib/authStore';

export default function ProfilePage() {
  const router = useRouter();
  const user = useMemo(() => getSessionUser(), []);

  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      clearSession();
      router.push('/login');
    }
  }

  return (
    <section className="mx-auto max-w-xl">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        {user ? (
          <div className="mt-4 space-y-2 text-sm">
            <p>
              <span className="text-muted">Name:</span> {user.name}
            </p>
            <p>
              <span className="text-muted">Email:</span> {user.email}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No active session found. Please sign in.</p>
        )}

        <div className="mt-6">
          <button className="btn-muted" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </section>
  );
}
