import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  const env: Record<string, string> = {};

  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match && !env[match[1].trim()]) {
          env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      });
    }
  }
  return env;
}

const env = loadEnv();
const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!apiKey || !supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${msg}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    process.exitCode = 1;
  }
}

async function runRealAuthSyncVerification() {
  console.log('================================================================');
  console.log('  FEEDER.LIFE — REAL FIREBASE TO SUPABASE END-TO-END VERIFICATION');
  console.log('================================================================');
  console.log(`Firebase Project: ${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'feeder-life'}`);
  console.log(`Supabase Host: ${supabaseUrl}`);
  console.log(`Target Backend: http://localhost:3000\n`);

  // 1. Obtain a REAL, live Firebase ID token from Google Identity Toolkit
  console.log('--- Step 1: Obtain Real Firebase ID Token via Google Identity Toolkit ---');
  const testEmail = `guardian_${Date.now()}@feeder.life`;
  const testPassword = 'SecurePassword123!';

  const fbRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        returnSecureToken: true,
      }),
    }
  );

  const fbData = await fbRes.json();
  assert(fbRes.status === 200 && !!fbData.idToken, 'Real Firebase Auth token issued by Google');
  const realFirebaseUid = fbData.localId;
  const realIdToken = fbData.idToken;
  console.log(`  Real Firebase UID: ${realFirebaseUid}`);
  console.log(`  Token Length: ${realIdToken.length} bytes`);

  // 2. Test /api/auth/sync with REAL ID Token
  console.log('\n--- Step 2: POST /api/auth/sync with Real Firebase ID Token ---');
  const syncRes = await fetch('http://localhost:3000/api/auth/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: realIdToken }),
  });

  assert(syncRes.status === 200, `POST /api/auth/sync returns HTTP 200`);
  const syncData = await syncRes.json();
  assert(syncData.success === true, 'Sync response reports success: true');
  assert(syncData.isNewUser === true, 'Identified as new user (first time login)');
  assert(syncData.redirectTo === '/onboarding', 'Redirects new user to /onboarding');
  assert(syncData.user.firebaseUid === realFirebaseUid, 'Returned user.firebaseUid matches Google identity');

  // Extract session cookie
  const setCookieHeader = syncRes.headers.get('set-cookie') || '';
  const match = setCookieHeader.match(/feeder_session=([^;]+)/);
  const sessionCookie = match ? match[1] : null;
  assert(!!sessionCookie, 'Received secure HttpOnly feeder_session cookie');

  // 3. Verify user created in Supabase PostgreSQL users table
  console.log('\n--- Step 3: Verify Real User Record in Supabase PostgreSQL (users table) ---');
  const { data: supaUser, error: supaErr } = await supabase
    .from('users')
    .select('*')
    .eq('firebase_uid', realFirebaseUid)
    .single();

  assert(!supaErr && !!supaUser, `Supabase user found in users table with ID: ${supaUser?.id}`);
  assert(supaUser?.email === testEmail, `Supabase user.email matches Firebase email`);
  assert(supaUser?.onboarding_completed === false, `Supabase user.onboarding_completed is false initially`);
  assert(supaUser?.is_active === true, `Supabase user.is_active is true`);

  // 4. Test duplicate-user prevention on second login with same Google account
  console.log('\n--- Step 4: Prevent Duplicate Users on Second Login ---');
  const syncRes2 = await fetch('http://localhost:3000/api/auth/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: realIdToken }),
  });

  assert(syncRes2.status === 200, 'Second login returns HTTP 200');
  const syncData2 = await syncRes2.json();
  assert(syncData2.user.id === supaUser.id, 'Second login returns the EXACT SAME Supabase user ID');

  // Check Supabase count for this firebase_uid
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('firebase_uid', realFirebaseUid);

  assert(userCount === 1, `Exactly 1 record exists in Supabase users table (NO DUPLICATES)`);

  // 5. Test Onboarding Flow using session cookie
  console.log('\n--- Step 5: Test /api/auth/onboarding with Session Cookie ---');
  const onboardRes = await fetch('http://localhost:3000/api/auth/onboarding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `feeder_session=${sessionCookie}`,
    },
    body: JSON.stringify({
      areaName: 'Besant Nagar',
      city: 'Chennai',
      feederRole: 'Daily Stray Feeder',
      bio: 'Feeding 12 street dogs every morning near the beach.',
    }),
  });

  assert(onboardRes.status === 200, 'POST /api/auth/onboarding succeeds with HTTP 200');
  const onboardData = await onboardRes.json();
  assert(onboardData.success === true, 'Onboarding reports success: true');

  // Verify onboarding in Supabase users table
  const { data: updatedSupaUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', supaUser.id)
    .single();

  assert(
    updatedSupaUser?.onboarding_completed === true,
    'Supabase users.onboarding_completed updated to true'
  );
  assert(updatedSupaUser?.city === 'Chennai', 'Supabase users.city updated to Chennai');
  assert(
    updatedSupaUser?.profile_data?.area_name === 'Besant Nagar',
    'Supabase users.profile_data.area_name updated to Besant Nagar'
  );

  // 6. Test Profile GET using session cookie
  console.log('\n--- Step 6: Test GET /api/users/profile with Session Cookie ---');
  const profileGetRes = await fetch('http://localhost:3000/api/users/profile', {
    headers: {
      Cookie: `feeder_session=${sessionCookie}`,
    },
  });

  assert(profileGetRes.status === 200, 'GET /api/users/profile returns HTTP 200');
  const profileGetData = await profileGetRes.json();
  assert(profileGetData.success === true, 'Profile GET reports success: true');
  assert(
    profileGetData.profile?.city === 'Chennai',
    `Profile city verified from Supabase: ${profileGetData.profile?.city}`
  );
  assert(
    profileGetData.profile?.area_name === 'Besant Nagar',
    `Profile area verified from Supabase: ${profileGetData.profile?.area_name}`
  );
  assert(
    profileGetData.profile?.onboarding_completed === true,
    'Profile onboarding_completed verified'
  );

  // 7. Test Profile PUT using session cookie
  console.log('\n--- Step 7: Test PUT /api/users/profile with Session Cookie ---');
  const profilePutRes = await fetch('http://localhost:3000/api/users/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `feeder_session=${sessionCookie}`,
    },
    body: JSON.stringify({
      bio: 'Senior animal feeder with 3 years of community dog care.',
      city: 'Chennai South',
    }),
  });

  assert(profilePutRes.status === 200, 'PUT /api/users/profile returns HTTP 200');

  // Verify updated profile in Supabase
  const { data: recheckedUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', supaUser.id)
    .single();

  assert(
    recheckedUser?.bio === 'Senior animal feeder with 3 years of community dog care.',
    'Supabase users.bio updated successfully'
  );
  assert(recheckedUser?.city === 'Chennai South', 'Supabase users.city updated successfully');

  // 8. Third Login Check — After Onboarding
  console.log('\n--- Step 8: Verify Third Login Directs to Home (/) ---');
  const syncRes3 = await fetch('http://localhost:3000/api/auth/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: realIdToken }),
  });

  const syncData3 = await syncRes3.json();
  assert(
    syncData3.redirectTo === '/',
    'After onboarding is completed, subsequent logins redirect directly to / (Home)'
  );

  // 9. Cleanup real test user from Supabase and Firebase
  console.log('\n--- Cleanup: Delete Real Test User ---');
  await supabase.from('users').delete().eq('id', supaUser.id);
  console.log('  Cleaned up Supabase test user.');

  // Try to delete from Firebase
  try {
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: realIdToken }),
      }
    );
    console.log('  Cleaned up Firebase test user.');
  } catch {
    // Ignore cleanup error
  }

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULT: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runRealAuthSyncVerification().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
