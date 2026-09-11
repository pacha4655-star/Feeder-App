import { Animal, Community, HelpRequest, Post, User, AdoptionListing, FosterRequest, FeedingPoint, NotificationItem, NearbyMarker, VeterinaryHospital } from '../types';
import { resolveApiUrl } from '../utils/apiConfig';

async function fetchJson<T>(
  url: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const targetUrl = resolveApiUrl(url);
  const controller = new AbortController();
  const timeoutDuration = options?.timeoutMs || 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

  try {
    const { timeoutMs: _t, ...fetchOptions } = options || {};
    const res = await fetch(targetUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions?.headers
      },
      signal: fetchOptions?.signal || controller.signal,
      ...fetchOptions
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      const errorObj = new Error(err.error || `HTTP error ${res.status}`);
      (errorObj as any).status = res.status;
      throw errorObj;
    }
    return res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutError = new Error(`Request to '${url}' timed out after ${Math.round(timeoutDuration / 1000)} seconds.`);
      (timeoutError as any).isTimeout = true;
      throw timeoutError;
    }
    throw err;
  }
}

export const api = {
  // Location Geocoding & Reverse Geocoding
  async reverseGeocode(lat: number, lng: number): Promise<{ name: string; displayName: string; lat: number; lng: number }> {
    return fetchJson(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);
  },

  async geocode(query: string): Promise<{ results: { name: string; displayName: string; lat: number; lng: number }[] }> {
    return fetchJson(`/api/location/geocode?q=${encodeURIComponent(query)}`);
  },

  // Live & Emergency Veterinary Hospitals Directory
  async getVeterinaryHospitals(params?: {
    lat?: number;
    lng?: number;
    emergencyOnly?: boolean;
    radiusKm?: number;
  }): Promise<VeterinaryHospital[]> {
    const query = new URLSearchParams();
    if (params?.lat !== undefined) query.append('lat', params.lat.toString());
    if (params?.lng !== undefined) query.append('lng', params.lng.toString());
    if (params?.emergencyOnly) query.append('emergencyOnly', 'true');
    if (params?.radiusKm !== undefined) query.append('radiusKm', params.radiusKm.toString());

    const qs = query.toString();
    const data = await fetchJson<{ hospitals: VeterinaryHospital[] }>(
      `/api/location/veterinary${qs ? `?${qs}` : ''}`
    );
    return data.hospitals || [];
  },

  // AI Chatbot (Pawsy) powered by Gemini & Contextual Engine
  async sendChatMessage(
    message: string,
    history?: { role: 'user' | 'model'; text: string }[],
    context?: {
      location?: string;
      userCoords?: { lat: number; lng: number };
      userRole?: string;
    }
  ): Promise<{
    reply: string;
    suggestions?: string[];
    actions?: { type: string; label: string; targetId?: string }[];
    detectedLanguage?: string;
  }> {
    return fetchJson('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, context }),
      timeoutMs: 25000
    });
  },

  // Nearby discovery proxy
  async getNearby(params?: {
    type?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
  } | string): Promise<NearbyMarker[]> {
    if (typeof params === 'string') {
      const data = await fetchJson<{ markers: NearbyMarker[] }>(`/api/nearby?type=${params}`);
      return data.markers || [];
    }

    const query = new URLSearchParams();
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.lat !== undefined) query.append('lat', params.lat.toString());
    if (params?.lng !== undefined) query.append('lng', params.lng.toString());
    if (params?.radiusKm !== undefined) query.append('radiusKm', params.radiusKm.toString());

    const qs = query.toString();
    const data = await fetchJson<{ markers: NearbyMarker[] }>(`/api/nearby${qs ? `?${qs}` : ''}`);
    return data.markers || [];
  },

  // Global search across animal welfare entries
  async search(query: string): Promise<{
    animals: Animal[];
    communities: Community[];
    helpRequests: HelpRequest[];
    posts: Post[];
    users: User[];
  }> {
    return fetchJson(`/api/search?q=${encodeURIComponent(query)}`);
  },

  // Real Feeder User Discovery / People Search
  async searchUsers(query: string): Promise<User[]> {
    const data = await fetchJson<{ success: boolean; users: User[] }>(
      `/api/users/search?q=${encodeURIComponent(query)}`
    );
    return data.users || [];
  }
};
