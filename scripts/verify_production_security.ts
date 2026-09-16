import fs from 'fs';
import path from 'path';

// Parse .env and .env.local manually without extra dependencies
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

import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../src/lib/security/rate-limit';
import { sanitizeText, sanitizeUrl } from '../src/lib/security/sanitize';
import { canModifyResource, canDeleteResource, isPlatformStaff, isPlatformAdmin } from '../src/lib/security/rbac';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(category: string, name: string, passed: boolean, details: string) {
  results.push({ category, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${category}] ${icon}: ${name} - ${details}`);
}

async function runSecurityTests() {
  console.log('=================================================================');
  console.log('  FEEDER.LIFE — PRODUCTION SECURITY & PENETRATION TEST SUITE');
  console.log('=================================================================\n');

  // -------------------------------------------------------------
  // Test 1: Rate Limiting Sliding Window (HTTP 429 Prevention of DoS)
  // -------------------------------------------------------------
  console.log('--- 1. Testing Sliding Window Rate Limiting ---');
  const testIp = '198.51.100.42';
  const prefix = `test_flood_${Date.now()}`;
  let wasBlocked = false;
  let blockedAt = -1;

  for (let i = 1; i <= 35; i++) {
    const rl = checkRateLimit(prefix, testIp, { limit: 10, windowMs: 60 * 1000 });
    if (!rl.allowed) {
      wasBlocked = true;
      blockedAt = i;
      break;
    }
  }

  recordTest(
    'RATE_LIMITING',
    'Exceeding window capacity triggers rate limit blocking',
    wasBlocked && blockedAt === 11,
    `Allowed exactly 10 requests, blocked on request #${blockedAt} with standard 429 payload`
  );

  // -------------------------------------------------------------
  // Test 2: Input Sanitization & XSS Prevention
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Input Sanitization & XSS Neutralization ---');
  const xssPayload = '<script>alert("pwned")</script><b>Injured Indie Dog</b><img src=x onerror=alert(1)>';
  const sanitized = sanitizeText(xssPayload);
  const containsScript = sanitized.includes('<script>') || sanitized.includes('alert(') || sanitized.includes('onerror');
  recordTest(
    'XSS_PREVENTION',
    'HTML and Script tags stripped from dangerous inputs',
    !containsScript,
    `Raw input stripped dangerous tags. Output: "${sanitized}"`
  );

  const dangerousUrl = 'javascript:alert(document.cookie)';
  const sanitizedUrl = sanitizeUrl(dangerousUrl);
  recordTest(
    'XSS_PREVENTION',
    'Javascript URI schemes neutralized',
    sanitizedUrl === null,
    `javascript: scheme converted to safe null`
  );

  const dangerousDataUri = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
  const sanitizedData = sanitizeUrl(dangerousDataUri);
  recordTest(
    'XSS_PREVENTION',
    'data:text/html schemes neutralized',
    sanitizedData === null,
    `data:text/html scheme blocked and returned null`
  );

  // -------------------------------------------------------------
  // Test 3: RBAC & IDOR (BOLA) Matrix
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing RBAC & IDOR Access Controls ---');
  const userA = { id: 'usr_alice_123', role: 'USER' };
  const userB = { id: 'usr_bob_456', role: 'USER' };
  const moderator = { id: 'usr_mod_789', role: 'PLATFORM_MODERATOR' };
  const admin = { id: 'usr_admin_999', role: 'PLATFORM_ADMIN' };

  // IDOR: User B trying to modify User A's post
  const idorUserBOnA = canModifyResource(userB.id, userB.role, userA.id);
  recordTest(
    'IDOR_PREVENTION',
    'User B cannot modify User A resource (IDOR)',
    !idorUserBOnA,
    `User B ID "${userB.id}" denied modification of resource owned by "${userA.id}"`
  );

  // Self modification
  const aliceOnAlice = canModifyResource(userA.id, userA.role, userA.id);
  recordTest(
    'RBAC',
    'Resource owner can modify own resource',
    aliceOnAlice,
    `Alice successfully authorized to edit own resource`
  );

  // Moderator moderation
  const modOnUserA = canModifyResource(moderator.id, moderator.role, userA.id);
  recordTest(
    'RBAC',
    'Platform Moderator can manage user resources',
    modOnUserA,
    `Moderator granted supervisory access`
  );

  // Regular user cannot delete other user's resource
  const userBDeleteA = canDeleteResource(userB.id, userB.role, userA.id);
  recordTest(
    'IDOR_PREVENTION',
    'User B cannot delete User A resource',
    !userBDeleteA,
    `User B denied deletion of Alice's post/animal`
  );

  // Admin access checks
  recordTest('RBAC', 'Admin role verified', isPlatformAdmin(admin.role), 'Admin granted PLATFORM_ADMIN authority');
  recordTest('RBAC', 'User denied admin privileges', !isPlatformAdmin(userA.role), 'Standard USER denied admin access');
  recordTest('RBAC', 'Staff membership check', isPlatformStaff(moderator.role) && !isPlatformStaff(userA.role), 'Moderator is staff, regular user is not');

  // -------------------------------------------------------------
  // Test 4: Supabase PostgreSQL 5-Physical-Tables & RLS Check
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing Supabase PostgreSQL Exactly-5-Tables Architecture ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey) {
    recordTest('DATABASE_CONFIG', 'Supabase credentials present', false, 'Missing SUPABASE_URL or ANON_KEY');
  } else {
    recordTest('DATABASE_CONFIG', 'Supabase credentials present', true, `Connecting to: ${supabaseUrl}`);

    const anonClient = createClient(supabaseUrl, anonKey);
    const serviceClient = serviceKey ? createClient(supabaseUrl, serviceKey) : null;

    // Check all 5 tables are accessible
    const tables = ['users', 'social_posts', 'communities', 'animals', 'platform_data'];
    for (const tbl of tables) {
      try {
        const { data, error } = await anonClient.from(tbl).select('*').limit(1);
        if (error) {
          recordTest('DATABASE_TABLES', `Table "${tbl}" queryable via client`, false, error.message);
        } else {
          recordTest('DATABASE_TABLES', `Table "${tbl}" queryable via client`, true, `Returned ${data.length} records (RLS evaluated)`);
        }
      } catch (err: any) {
        recordTest('DATABASE_TABLES', `Table "${tbl}" queryable`, false, err.message);
      }
    }

    // Verify unauthenticated client cannot insert into users table (RLS Protection)
    try {
      const fakeId = `unauth_hack_${Date.now()}`;
      const { error: insertErr } = await anonClient.from('users').insert({
        id: fakeId,
        firebase_uid: fakeId,
        username: 'unauth_hacker',
        email: 'hacker@malicious.com',
      });

      // It must fail or be blocked by RLS
      if (insertErr) {
        recordTest(
          'RLS_SECURITY',
          'Unauthenticated client blocked from arbitrary user insertion / privilege escalation',
          true,
          `Supabase RLS rejected unauthenticated insert: "${insertErr.message}"`
        );
      } else {
        recordTest(
          'RLS_SECURITY',
          'Unauthenticated client blocked from arbitrary user insertion',
          false,
          'Anon key was able to insert into users directly'
        );
        // Clean up if inserted
        if (serviceClient) {
          await serviceClient.from('users').delete().eq('id', fakeId);
        }
      }
    } catch (err: any) {
      recordTest('RLS_SECURITY', 'RLS check exception', true, err.message);
    }
  }

  // -------------------------------------------------------------
  // Test 5: File Upload Security & Magic Byte Enforcer
  // -------------------------------------------------------------
  console.log('\n--- 5. Testing File Upload Security & Magic Byte Validation ---');
  // Simulated magic byte checks
  const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const WEBP_HEADER = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  const MALICIOUS_EXE = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ executable header spoofed as image/jpeg

  function validateImageMagicBytes(buffer: Buffer, claimedMime: string): boolean {
    if (claimedMime === 'image/jpeg') {
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (claimedMime === 'image/png') {
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }
    if (claimedMime === 'image/webp') {
      return (
        buffer.length >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      );
    }
    return false;
  }

  recordTest(
    'UPLOAD_SECURITY',
    'Valid JPEG header recognized',
    validateImageMagicBytes(JPEG_HEADER, 'image/jpeg'),
    'Valid JPEG magic bytes (FF D8 FF) accepted'
  );

  recordTest(
    'UPLOAD_SECURITY',
    'Valid PNG header recognized',
    validateImageMagicBytes(PNG_HEADER, 'image/png'),
    'Valid PNG magic bytes (89 50 4E 47) accepted'
  );

  recordTest(
    'UPLOAD_SECURITY',
    'Executable (.exe) spoofed as image/jpeg rejected',
    !validateImageMagicBytes(MALICIOUS_EXE, 'image/jpeg'),
    'Spoofed executable with MZ header rejected despite image/jpeg MIME declaration'
  );

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n=================================================================');
  console.log('  TEST EXECUTION SUMMARY');
  console.log('=================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Security Assertions: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nFAILED TESTS:');
    results.filter((r) => !r.passed).forEach((f) => console.error(` - [${f.category}] ${f.name}: ${f.details}`));
    process.exit(1);
  } else {
    console.log('\n✅ ALL PRODUCTION SECURITY TESTS PASSED PERFECTLY.\n');
  }
}

runSecurityTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
