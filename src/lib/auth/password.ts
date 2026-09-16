import crypto from 'crypto';

/**
 * Production-grade password hashing using Node.js scrypt with cryptographically random salts.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, combinedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = combinedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      // Legacy or plain compare fallback if any
      return resolve(false);
    }
    const salt = parts[1];
    const key = parts[2];

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
    });
  });
}
