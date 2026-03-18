import '../styles/globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import HeaderNav from '../components/HeaderNav';

export const metadata: Metadata = {
  title: 'K-LMS',
  description: 'Minimalist LMS platform'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-ink antialiased">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-bg/95 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
            <Link href="/" className="text-base font-semibold tracking-tight">
              K-LMS Academy
            </Link>
            <HeaderNav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</main>
      </body>
    </html>
  );
}
