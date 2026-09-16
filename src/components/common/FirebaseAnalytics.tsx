'use client';

import { useEffect } from 'react';
import { getFirebaseAnalytics } from '@/lib/firebase/config';

/**
 * Initializes Firebase Analytics on the client side.
 * Safely handles SSR and ensures analytics runs only when supported in the browser.
 */
export default function FirebaseAnalytics() {
  useEffect(() => {
    getFirebaseAnalytics().catch(() => {
      // Analytics initialization silent catch
    });
  }, []);

  return null;
}
