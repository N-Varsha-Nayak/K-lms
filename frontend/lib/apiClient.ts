import { clearSession, getAccessToken, setAccessToken } from './authStore';
import { API_BASE_URL } from './apiBaseUrl';

async function tryRefreshToken() {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include'
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const json = await response.json();
  if (json.access_token) setAccessToken(json.access_token);
  return json.access_token ?? null;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  retryOn401?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, retryOn401 = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (auth) {
    const accessToken = getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined
  });

  if (response.status === 401 && auth && retryOn401) {
    const newToken = await tryRefreshToken();
    if (!newToken) throw new Error('Unauthorized');
    return apiRequest<T>(path, { ...options, retryOn401: false });
  }

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.message) message = errorData.message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
