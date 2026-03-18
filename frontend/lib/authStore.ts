const ACCESS_TOKEN_KEY = 'k_lms_access_token';
const USER_KEY = 'k_lms_user';

export type SessionUser = {
  id: number;
  email: string;
  name: string;
};

export function setAccessToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function setSessionUser(user: SessionUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSessionUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

export function clearSession() {
  clearAccessToken();
  clearSessionUser();
}
