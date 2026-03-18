const DEFAULT_API_BASE_URL = 'http://127.0.0.1:4000/api';

function normalizeLocalhost(url: string) {
  return url.replace('://localhost', '://127.0.0.1');
}

export const API_BASE_URL = normalizeLocalhost(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
);
