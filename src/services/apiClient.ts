import { getFirebaseIdToken } from './firebaseAuth';
import { resolveApiUrl, isNativeApp, getApiBaseUrl } from '../utils/apiConfig';

/**
 * Authenticated fetch helper for backend API endpoints.
 * Automatically injects the fresh Firebase ID Token into Authorization header.
 */
export async function authenticatedFetch<T = any>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const token = await getFirebaseIdToken();
  if (!token) {
    throw new Error('Authentication required: You must be logged in with Firebase to perform this action.');
  }

  if (isNativeApp() && !getApiBaseUrl()) {
    throw new Error(
      'Feeder backend server is not configured. Build requires VITE_API_BASE_URL to connect to Feeder cloud services on Android.'
    );
  }

  const targetUrl = resolveApiUrl(endpoint);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  const timeoutDuration = options.timeoutMs || 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

  try {
    const { timeoutMs: _t, ...fetchOptions } = options;
    const response = await fetch(targetUrl, {
      ...fetchOptions,
      headers,
      signal: fetchOptions.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = `Request failed (HTTP ${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson.error) {
          errorMsg = errorJson.error;
        }
      } catch (e) {}
      throw new Error(errorMsg);
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request to '${endpoint}' timed out after ${Math.round(timeoutDuration / 1000)} seconds.`);
    }
    throw err;
  }
}

