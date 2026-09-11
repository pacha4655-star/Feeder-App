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

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // On native Android (Capacitor WebView), requests MUST use an absolute HTTPS backend URL
  if (isNativeApp()) {
    const base = getApiBaseUrl();
    if (base) {
      return `${base}${path}`;
    }
    const errorMsg = `[Feeder API Config Error] Native Android request to '${endpoint}' blocked: VITE_API_BASE_URL is missing in production build. Define VITE_API_BASE_URL in .env.production.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // On Web (browser):
  // Relative '/api/...' is the authoritative web standard.
  // In development, Vite/Express handles it on localhost:3000.
  // In production on Vercel, Vercel Serverless handles it on the same origin without CORS or DNS failure.
  // If an external backend URL is explicitly configured AND matches window.location.origin, preserve it:
  const base = getApiBaseUrl();
  if (base && typeof window !== 'undefined' && window.location.origin === base) {
    return `${base}${path}`;
  }

  return path;
};


