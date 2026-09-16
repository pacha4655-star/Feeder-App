import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

/**
 * Firebase Admin SDK Singleton for Server-side operations.
 * Strictly runs on the server (Node.js runtime).
 * Cryptographically verifies Firebase ID tokens.
 */
function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'feeder-life';

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = rawKey?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  // When no service account private key is provided, initialize with projectId.
  // getAuth().verifyIdToken() will verify against Google's public x509 certs.
  return initializeApp({
    projectId,
  });
}

export const adminApp = getFirebaseAdminApp();
export const adminAuth = getAuth(adminApp);

export interface TokenVerificationResult {
  success: boolean;
  uid?: string;
  email?: string;
  name?: string;
  picture?: string;
  error?: string;
  decodedToken?: DecodedIdToken;
}

/**
 * Verifies a Firebase ID token on the server using the Firebase Admin SDK.
 * Never trusts frontend-supplied user IDs.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<TokenVerificationResult> {
  try {
    if (!idToken || typeof idToken !== 'string') {
      return { success: false, error: 'Missing or invalid token format' };
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'Feeder User'),
      picture: decodedToken.picture,
      decodedToken,
    };
  } catch (err: any) {
    console.error('[Firebase Admin] Error verifying ID token:', err.code || err.message);
    return {
      success: false,
      error: 'Invalid or expired Firebase authentication token',
    };
  }
}
