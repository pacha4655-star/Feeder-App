import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDVq_pULHGgn-XAv3bgPvMuMt0H0YXVsSU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "feeder-life.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "feeder-life",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "feeder-life.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1032872167747",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1032872167747:web:48741c5ffe9e7c782e87f6",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-0LB8LX2YKW",
};

// Initialize Firebase (Singleton pattern to prevent duplicate app errors during HMR)
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth: Auth = getAuth(app);

// Initialize Firebase Storage
const storage: FirebaseStorage = getStorage(app);

// Analytics helper - only initialized on client-side when supported
let analyticsPromise: Promise<Analytics | null> | null = null;

export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
  if (typeof window === 'undefined') return null;
  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => {
      if (supported) {
        return getAnalytics(app);
      }
      return null;
    }).catch(() => null);
  }
  return analyticsPromise;
};

export { app, auth, storage };
export default app;
