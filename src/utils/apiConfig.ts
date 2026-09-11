/**
 * Centralized API configuration and URL resolver.
 * 
 * Supports both:
 * 1. Web Local Development: relative '/api/...' URLs directly served by Express / Vite proxy.
 * 2. Mobile Native (Android Capacitor): absolute production backend URLs (via VITE_API_BASE_URL).
 */

import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const getApiBaseUrl = (): string => {
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env && (
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_PRODUCTION_API_BASE_URL
    )) ||
    ''
  ).trim();
  return envUrl.replace(/\/+$/, '');
};

export const isProductionApiConfigured = (): boolean => {
  if (isNativeApp()) {
    return !!getApiBaseUrl();
  }
  return true;
};

export const resolveApiUrl = (endpoint: string): string => {
  if (!endpoint) return '';
  if (
    endpoint.startsWith('http://') ||
    endpoint.startsWith('https://') ||
    endpoint.startsWith('data:') ||
    endpoint.startsWith('blob:')
  ) {
    return endpoint;
  }

  const base = getApiBaseUrl();
  if (base) {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  // On native Android, fail clearly instead of silently falling back to a root-relative path
  if (isNativeApp()) {
    const errorMsg = `[Feeder API Config Error] Native Android request to '${endpoint}' blocked: VITE_API_BASE_URL is missing in production build. Define VITE_API_BASE_URL in .env.production.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
};

