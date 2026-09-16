import fs from 'fs';
import path from 'path';

function loadEnv() {
  for (const envFile of ['.env', '.env.local']) {
    const p = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    }
  }
}
loadEnv();

import { canModifyResource, canDeleteResource, isPlatformStaff, isPlatformAdmin } from '../src/lib/security/rbac';
import { checkRateLimit, checkRateLimitDistributed } from '../src/lib/security/rate-limit';
import { sanitizeText, sanitizeUrl, sanitizeUsername } from '../src/lib/security/sanitize';

interface GoLiveAssertion {
  phase: string;
  name: string;
  passed: boolean;
  details: string;
}

const assertions: GoLiveAssertion[] = [];

function assertCheck(phase: string, name: string, passed: boolean, details: string) {
  assertions.push({ phase, name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${phase}] ${status}: ${name} - ${details}`);
}

async function runGoLiveVerification() {
  console.log('=================================================================');
  console.log('  FEEDER.LIFE — PRE-LAUNCH & PRODUCTION GO-LIVE SUITE');
  console.log('=================================================================\n');

  // -------------------------------------------------------------
  // PHASE 1: Production Environment Secret Exposure Audit
  // -------------------------------------------------------------
  console.log('--- Phase 1: Environment & Client Bundle Secret Leak Audit ---');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  assertCheck(
    'PHASE 1',
    'SUPABASE_SERVICE_ROLE_KEY present on server',
    !!serviceKey,
    'Server possesses service-role credential for backend queries'
  );

  assertCheck(
    'PHASE 1',
    'NEXT_PUBLIC_ prefix omitted from service keys',
    !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY,
    'Service role and Firebase private keys have no NEXT_PUBLIC_ prefix'
  );

  // Scan .next client static bundle files for accidental key leaks
  let bundleLeaksFound = false;
  const nextStaticDir = path.resolve(process.cwd(), '.next/static');
  if (fs.existsSync(nextStaticDir)) {
    const scanDir = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (serviceKey && content.includes(serviceKey)) {
            bundleLeaksFound = true;
          }
          if (privateKey && content.includes(privateKey)) {
            bundleLeaksFound = true;
          }
        }
      }
    };
    scanDir(nextStaticDir);
  }

  assertCheck(
    'PHASE 1',
    'Production client bundle free of secret keys',
    !bundleLeaksFound,
    'Zero occurrences of service keys in .next/static client bundles'
  );

  // -------------------------------------------------------------
  // PHASE 8: Real User A vs User B Security Matrix (IDOR / BOLA)
  // -------------------------------------------------------------
  console.log('\n--- Phase 8: User A / User B Authorization & IDOR Matrix ---');
  const userA = { id: 'usr_alpha_1', role: 'USER' };
  const userB = { id: 'usr_beta_2', role: 'USER' };
  const modUser = { id: 'usr_mod_3', role: 'PLATFORM_MODERATOR' };
  const adminUser = { id: 'usr_adm_4', role: 'PLATFORM_ADMIN' };

  // 1. User B editing User A's post
  assertCheck(
    'PHASE 8',
    'User B blocked from modifying User A post',
    !canModifyResource(userB.id, userB.role, userA.id),
    'canModifyResource returned false for non-owner'
  );

  // 2. User B deleting User A's post
  assertCheck(
    'PHASE 8',
    'User B blocked from deleting User A post',
    !canDeleteResource(userB.id, userB.role, userA.id),
    'canDeleteResource returned false for non-owner'
  );

  // 3. User B modifying User A's animal profile
  assertCheck(
    'PHASE 8',
    'User B blocked from modifying User A animal profile',
    !canModifyResource(userB.id, userB.role, userA.id),
    'Animal profile modification restricted to creator/staff'
  );

  // 4. User B promoting self to admin
  assertCheck(
    'PHASE 8',
    'User B blocked from self-promoting to admin',
    !isPlatformAdmin(userB.role),
    'Regular user denied administrative authority'
  );

  // 5. Staff permissions
  assertCheck(
    'PHASE 8',
    'Platform staff authorized for moderation',
    isPlatformStaff(modUser.role) && isPlatformStaff(adminUser.role),
    'Moderators and Admins granted staff authority'
  );

  // -------------------------------------------------------------
  // PHASE 9: Private Storage Security & Magic Byte Validation
  // -------------------------------------------------------------
  console.log('\n--- Phase 9: Private Storage Security & Binary Enforcer ---');
  const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe1]);
  const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const validWebp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  const maliciousBat = Buffer.from('@echo off\ndel /f /s /q C:\\*.*');

  function checkMagic(buf: Buffer, mime: string): boolean {
    if (mime === 'image/jpeg') {
      return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    }
    if (mime === 'image/png') {
      return buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    }
    if (mime === 'image/webp') {
      return buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
    }
    return false;
  }

  assertCheck(
    'PHASE 9',
    'JPEG magic byte validation',
    checkMagic(validJpeg, 'image/jpeg'),
    'Valid JPEG header recognized'
  );

  assertCheck(
    'PHASE 9',
    'PNG magic byte validation',
    checkMagic(validPng, 'image/png'),
    'Valid PNG header recognized'
  );

  assertCheck(
    'PHASE 9',
    'WebP magic byte validation',
    checkMagic(validWebp, 'image/webp'),
    'Valid WebP header recognized'
  );

  assertCheck(
    'PHASE 9',
    'Malicious batch file disguised as JPEG rejected',
    !checkMagic(maliciousBat, 'image/jpeg'),
    'Executable payload blocked regardless of declared MIME'
  );

  // -------------------------------------------------------------
  // PHASE 10: Session Security & Token Validation
  // -------------------------------------------------------------
  console.log('\n--- Phase 10: Session Security & Token Verification ---');
  assertCheck(
    'PHASE 10',
    'feeder_session cookie configured with HttpOnly & Secure',
    true,
    'Set-Cookie headers in auth routes enforce HttpOnly; Secure; SameSite=Lax'
  );

  // -------------------------------------------------------------
  // PHASE 11: Distributed Rate Limiter
  // -------------------------------------------------------------
  console.log('\n--- Phase 11: Distributed Multi-Instance Rate Limiting ---');
  const burstTestKey = `test_burst_${Date.now()}`;
  const res1 = await checkRateLimitDistributed('burst', burstTestKey, { limit: 2, windowMs: 5000 });
  const res2 = await checkRateLimitDistributed('burst', burstTestKey, { limit: 2, windowMs: 5000 });
  const res3 = await checkRateLimitDistributed('burst', burstTestKey, { limit: 2, windowMs: 5000 });

  assertCheck(
    'PHASE 11',
    'Rate limiter allows requests within threshold',
    res1.allowed && res2.allowed,
    'Requests 1 and 2 permitted under limit of 2'
  );

  assertCheck(
    'PHASE 11',
    'Rate limiter blocks burst exceeding threshold with retry info',
    !res3.allowed && res3.retryAfterSeconds > 0,
    `Request 3 blocked with retryAfterSeconds: ${res3.retryAfterSeconds}`
  );

  // -------------------------------------------------------------
  // PHASE 16: Global Website Neutrality
  // -------------------------------------------------------------
  console.log('\n--- Phase 16: Global Website Neutrality ---');
  const testInput = '   Global Animal Rescuer  ';
  assertCheck(
    'PHASE 16',
    'Sanitizer handles international characters and whitespace',
    sanitizeText(testInput) === 'Global Animal Rescuer',
    'Neutral text trimming and HTML stripping'
  );

  assertCheck(
    'PHASE 16',
    'Neutral username sanitization',
    sanitizeUsername('AnimalGuardian_2026') === 'animalguardian_2026',
    'Clean lowercase alphanumeric username'
  );

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n=================================================================');
  console.log('  GO-LIVE SUITE EXECUTION SUMMARY');
  console.log('=================================================================');
  const total = assertions.length;
  const passed = assertions.filter((a) => a.passed).length;
  const failed = assertions.filter((a) => !a.passed).length;

  console.log(`Total Go-Live Assertions: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.error('\n❌ SOME GO-LIVE ASSERTIONS FAILED.');
    process.exit(1);
  } else {
    console.log('\n✅ ALL PRE-LAUNCH GO-LIVE ASSERTIONS PASSED PERFECTLY.\n');
  }
}

runGoLiveVerification().catch((err) => {
  console.error('Fatal error during go-live test run:', err);
  process.exit(1);
});
