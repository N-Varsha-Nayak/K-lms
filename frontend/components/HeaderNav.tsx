"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import { clearSession, getSessionUser, SessionUser } from '../lib/authStore';

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getSessionUser());
  }, [pathname]);

  useEffect(() => {
    function syncUser() {
      setUser(getSessionUser());
    }

    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      clearSession();
      setUser(null);
      router.push('/');
      router.refresh();
    }
  }

  return (
    <nav className="flex items-center gap-5 text-sm font-medium text-muted">
      <Link className="hover:text-ink" href="/">
        Home
      </Link>
      <Link className="hover:text-ink" href="/subjects">
        Courses
      </Link>
      {user ? (
        <Link className="hover:text-ink" href="/progress">
          Progress
        </Link>
      ) : null}

      {user ? (
        <>
          <span className="hidden text-ink md:inline">Hi, {user.name.split(' ')[0]}</span>
          <button className="btn-muted !rounded-full !px-4 !py-1.5" onClick={logout}>
            Sign out
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Link className="hover:text-ink" href="/register">
            Join
          </Link>
          <Link className="btn-muted !rounded-full !px-4 !py-1.5" href="/login">
            Sign in
          </Link>
        </div>
      )}
    </nav>
  );
}
