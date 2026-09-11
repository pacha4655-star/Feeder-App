import crypto from 'crypto';

interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'feeder-app-103ec';
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCertificates: Record<string, string> = {};
let certsExpiresAt = 0;

/**
 * Fetches Google's public x509 certificates used to sign Firebase Auth ID tokens.
 * Caches them according to HTTP Cache-Control headers.
 */
async function getGooglePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (Object.keys(cachedCertificates).length > 0 && now < certsExpiresAt) {
    return cachedCertificates;
  }

  try {
    const res = await fetch(GOOGLE_CERTS_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch Google certs: HTTP ${res.status}`);
    }

    const cacheControl = res.headers.get('cache-control');
    let maxAge = 3600; // default 1 hour
    if (cacheControl) {
      const match = cacheControl.match(/max-age=(\d+)/);
      if (match && match[1]) {
        maxAge = parseInt(match[1], 10);
      }
    }

    cachedCertificates = await res.json();
    certsExpiresAt = now + maxAge * 1000;
    return cachedCertificates;
  } catch (err) {
    console.error('[Firebase Token Verifier] Error fetching Google public keys:', err);
    if (Object.keys(cachedCertificates).length > 0) {
      return cachedCertificates;
    }
    throw err;
  }
}

/**
 * Parses and verifies a Firebase ID Token using Google's public RS256 certificates.
 * Returns the decoded token containing the verified Firebase UID.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedFirebaseToken> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Firebase ID token is missing or invalid.');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token format.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 1. Decode Header
  let header: { alg?: string; kid?: string; typ?: string };
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  } catch (e) {
    throw new Error('Invalid JWT header.');
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid JWT header: Must use RS256 algorithm with a valid kid.');
  }

  // 2. Decode Payload
  let payload: DecodedFirebaseToken;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (e) {
    throw new Error('Invalid JWT payload.');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  // 3. Verify Audience, Issuer, Expiration, and Subject
  const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error(`Firebase token audience mismatch. Expected "${FIREBASE_PROJECT_ID}", got "${payload.aud}".`);
  }

  if (payload.iss !== expectedIssuer) {
    throw new Error(`Firebase token issuer mismatch. Expected "${expectedIssuer}", got "${payload.iss}".`);
  }

  if (typeof payload.sub !== 'string' || !payload.sub.trim()) {
    throw new Error('Firebase token subject (UID) is empty.');
  }

  if (payload.exp <= nowSeconds) {
    throw new Error('Firebase token has expired.');
  }

  if (payload.iat > nowSeconds + 300) {
    throw new Error('Firebase token issued in the future.');
  }

  // 4. Verify Cryptographic Signature with Google's Public Key
  const certs = await getGooglePublicKeys();
  const publicKey = certs[header.kid];
  if (!publicKey) {
    throw new Error(`Google public key not found for kid: ${header.kid}`);
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const signature = Buffer.from(signatureB64, 'base64url');

  const isValid = verifier.verify(publicKey, signature);
  if (!isValid) {
    throw new Error('Firebase ID token signature verification failed.');
  }

  return {
    ...payload,
    uid: payload.sub
  };
}
