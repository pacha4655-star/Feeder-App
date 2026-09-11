import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  getIdToken
} from 'firebase/auth';
import { User } from '../types';
import { resolveApiUrl } from '../utils/apiConfig';
import { syncUserProfileToSupabase } from './profileService';

const getEnv = (key: string, defaultValue: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {}
  return defaultValue;
};

// Real Firebase Web App configuration (project: feeder-app-103ec)
export const firebaseConfig = {
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "feeder-app-103ec"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:668347278436:web:f6392619c8aee149126b71"),
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyCEQh1NCkOkBbipzLsCtHbWaBQh8zrI0o0"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "feeder-app-103ec.firebaseapp.com"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "668347278436"),
};

// Initialize Firebase App for AUTHENTICATION ONLY
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Registers a new user with Firebase Authentication and creates their profile in Supabase
 */
export const registerWithEmail = async (
  email: string,
  password: string,
  profileData: Partial<User> = {}
): Promise<FirebaseUser> => {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const fbUser = result.user;

  const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbUser.uid)}`;
  const userProfile: User = {
    id: fbUser.uid,
    name: profileData.name || fbUser.displayName || email.split('@')[0] || 'Feeder Caregiver',
    username: (profileData.username || email.split('@')[0] || 'feeder').toLowerCase().replace(/[^a-z0-9_]/g, ''),
    email: fbUser.email || undefined,
    avatar: profileData.avatar || fbUser.photoURL || defaultAvatar,
    bio: profileData.bio || 'Compassionate animal lover, street feeder & pet protector.',
    location: profileData.location || '',
    roles: profileData.roles && profileData.roles.length > 0 ? profileData.roles : ['Feeder', 'Animal Lover'],
    interests: profileData.interests || ['Street Animals', 'Community Care', 'Adoption'],
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    followerIds: [],
    followingIds: [],
    joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    isVerified: true
  };

  // Sync initial profile to Supabase (non-blocking, use the fresh user object directly)
  // We use a small delay to ensure Firebase auth state is fully propagated before getting token
  setTimeout(async () => {
    try {
      // Force refresh token directly from the freshly created user object
      const token = await getIdToken(fbUser, true);
      if (token) {
        // Directly call the backend with this token
        const targetUrl = resolveApiUrl('/api/profile/sync');
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userProfile),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          console.warn('[Firebase Auth] Profile sync response:', err);
        }
      }
    } catch (err) {
      console.warn('[Firebase Auth] Initial Supabase profile sync notice:', err);
    }
  }, 1000);

  return fbUser;
};


/**
 * Signs in an existing user with Firebase Authentication
 */
export const loginWithEmail = async (email: string, password: string): Promise<FirebaseUser> => {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
};

/**
 * Awaits Firebase Authentication initial state restoration from browser storage.
 * Resolves as soon as auth state is confirmed without race conditions.
 */
let authReadyPromise: Promise<FirebaseUser | null> | null = null;

export const waitForAuthReady = async (): Promise<FirebaseUser | null> => {
  if (auth.currentUser) return auth.currentUser;

  if (!authReadyPromise) {
    authReadyPromise = (async () => {
      try {
        if (typeof (auth as any).authStateReady === 'function') {
          await (auth as any).authStateReady();
          return auth.currentUser;
        }
      } catch (e) {}

      return new Promise<FirebaseUser | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(
          auth,
          (user) => {
            unsubscribe();
            resolve(user);
          },
          () => {
            unsubscribe();
            resolve(null);
          }
        );
      });
    })();
  }

  return authReadyPromise;
};

/**
 * Checks and handles Firebase OAuth redirect result if returning from a redirect sign-in.
 */
export const checkRedirectResult = async (): Promise<FirebaseUser | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return result.user;
    }
  } catch (error: any) {
    console.warn('[Firebase Auth] Redirect result notice:', error.code || error.message);
  }
  return null;
};

/**
 * Signs in a user using Firebase Google OAuth Popup with seamless redirect fallback.
 */
export const signInWithGoogle = async (preferRedirect: boolean = false): Promise<FirebaseUser | null> => {
  if (preferRedirect) {
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn('[Firebase Auth] Google popup sign-in notice:', error.code || error.message);
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request'
    ) {
      console.log('[Firebase Auth] Switching to signInWithRedirect fallback...');
      await signInWithRedirect(auth, googleProvider);
      return null;
    } else if (error.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      throw new Error(`Domain '${currentHost}' is not authorized in Firebase Console > Authentication > Settings > Authorized domains.`);
    }
    throw error;
  }
};

/**
 * Sends a password reset email via Firebase Authentication
 */
export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email.trim());
};

/**
 * Signs out the current Firebase user
 */
export const logoutUser = async (): Promise<void> => {
  authReadyPromise = null;
  await signOut(auth);
};

/**
 * Subscribes to real-time Firebase Auth state changes
 */
export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
  try {
    return onAuthStateChanged(
      auth,
      user => {
        callback(user);
      },
      error => {
        console.warn('[Firebase Auth] Subscription notice:', error);
        callback(null);
      }
    );
  } catch (err) {
    console.warn('[Firebase Auth] subscribeToAuth notice:', err);
    callback(null);
    return () => {};
  }
};

/**
 * Retrieves the current Firebase user
 */
export const getCurrentFirebaseUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * Retrieves the fresh Firebase ID Token for backend API authorization.
 * Seamlessly awaits auth state initialization so page refresh or fast calls do not fail.
 */
export const getFirebaseIdToken = async (forceRefresh: boolean = false): Promise<string | null> => {
  let user = auth.currentUser;
  if (!user) {
    user = await waitForAuthReady();
  }
  if (!user) return null;
  return await getIdToken(user, forceRefresh);
};
