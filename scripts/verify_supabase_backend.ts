import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse environment variables from .env or .env.local
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
const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

// Ensure SERVICE_ROLE_KEY is never exposed as NEXT_PUBLIC_
if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Security Violation: SUPABASE_SERVICE_ROLE_KEY must NEVER be prefixed with NEXT_PUBLIC_!');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${description}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${description}`);
    process.exitCode = 1;
  }
}

async function verifySupabaseBackend() {
  console.log('================================================================');
  console.log('  FEEDER.LIFE — SUPABASE SERVER & 5-TABLE BACKEND VERIFICATION  ');
  console.log('================================================================');
  console.log(`Endpoint: ${supabaseUrl}`);
  console.log(`Server-side Key Verified: Service-Role Token (${supabaseServiceRoleKey.slice(0, 16)}...)`);
  console.log(`Browser Leak Check: Pass (No NEXT_PUBLIC_SERVICE_ROLE_KEY)\n`);

  // ==============================================================
  // 1. Connect to Supabase
  // ==============================================================
  console.log('--- Step 1: Connect to Supabase ---');
  const { error: pingError } = await client.from('users').select('id').limit(1);
  assert(!pingError, 'Connected to Supabase PostgreSQL over HTTPS using Service Role credentials');

  // ==============================================================
  // 2. Read the 5 Tables
  // ==============================================================
  console.log('\n--- Step 2: Read the 5 Supabase Tables ---');
  const tables = ['users', 'social_posts', 'communities', 'animals', 'platform_data'] as const;

  for (const tbl of tables) {
    const { data, count, error } = await client.from(tbl).select('*', { count: 'exact' }).limit(5);
    assert(
      !error && Array.isArray(data),
      `Table "public.${tbl}" read successfully (Rows: ${count ?? (data ? data.length : 0)})`
    );
  }

  // ==============================================================
  // 3. Create/Find Users using firebase_uid
  // ==============================================================
  console.log('\n--- Step 3: Create & Find Users Using firebase_uid ---');
  const testFirebaseUid = `fb_uid_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const testEmail = `guardian_${Date.now()}@feeder.life`;
  const testUsername = `feeder_guardian_${Date.now().toString().slice(-6)}`;

  const { data: createdUser, error: createError } = await client
    .from('users')
    .insert({
      firebase_uid: testFirebaseUid,
      email: testEmail,
      username: testUsername,
      display_name: 'Verified Animal Feeder',
      avatar_url: 'https://feeder.life/avatars/guardian.png',
      bio: 'Daily street dog caretaker in Chennai',
      country_code: 'IN',
      region: 'Tamil Nadu',
      city: 'Chennai',
      timezone: 'Asia/Kolkata',
      locale: 'en',
      profile_data: { level: 'Pacesetter Feeder', verified_rescues: 12 },
      settings: { daily_digest: true, emergency_alerts: true },
      interests: ['dogs', 'cats', 'rescue', 'feeding_rounds'],
      onboarding_completed: true,
      is_active: true,
      is_verified: true,
      privacy_settings: { public_profile: true },
    })
    .select()
    .single();

  assert(!createError && !!createdUser, `Created real user with firebase_uid: ${testFirebaseUid}`);
  assert(
    createdUser?.firebase_uid === testFirebaseUid,
    `Persisted user.firebase_uid matches identity provider UID`
  );

  // Find user by firebase_uid
  const { data: foundUser, error: findError } = await client
    .from('users')
    .select('*')
    .eq('firebase_uid', testFirebaseUid)
    .single();

  assert(!findError && !!foundUser, `Found user by firebase_uid: ${foundUser?.id}`);
  assert(foundUser?.id === createdUser?.id, 'Lookup returns the exact corresponding user record');

  // ==============================================================
  // 4. Prevent Duplicate Users
  // ==============================================================
  console.log('\n--- Step 4: Prevent Duplicate Users ---');
  const { data: dupUser, error: dupError } = await client
    .from('users')
    .insert({
      firebase_uid: testFirebaseUid, // Duplicate UID
      email: `another_${testEmail}`,
      username: `another_${testUsername}`,
      profile_data: {},
      settings: {},
      interests: [],
      onboarding_completed: false,
      is_active: true,
      is_verified: false,
      privacy_settings: {},
    })
    .select()
    .single();

  assert(
    !dupUser && dupError?.code === '23505',
    `Duplicate user insert rejected by unique constraint: ${dupError?.message}`
  );

  // ==============================================================
  // 5. Perform Authenticated CRUD Operations
  // ==============================================================
  console.log('\n--- Step 5: Perform Authenticated CRUD Operations Across 5 Tables ---');

  // [5a] social_posts CRUD
  const { data: post, error: postCreateErr } = await client
    .from('social_posts')
    .insert({
      record_type: 'post',
      user_id: createdUser!.id,
      content: 'Morning feeding round complete! Fed 8 puppies and 4 community dogs 🐶🍗',
      data: { location_name: 'Besant Nagar Beach Station' },
      media: [{ url: 'https://feeder.life/images/dogs.jpg', type: 'image' }],
      reactions: { paws: 5, heart: 3 },
      comments: { count: 0 },
      hashtags: ['chennaifeeders', 'communitydogs'],
      mentions: [],
      visibility: 'public',
      is_active: true,
      is_deleted: false,
      stats: { views_count: 14, likes_count: 8 },
    })
    .select()
    .single();

  assert(!postCreateErr && !!post, `CREATE social_posts (ID: ${post?.id})`);

  const { data: updatedPost, error: postUpdateErr } = await client
    .from('social_posts')
    .update({ content: 'Updated: All water bowls refilled!' })
    .eq('id', post!.id)
    .select()
    .single();

  assert(
    !postUpdateErr && updatedPost?.content === 'Updated: All water bowls refilled!',
    `UPDATE social_posts`
  );

  // [5b] communities CRUD
  const commSlug = `chennai-feeders-${Date.now()}`;
  const { data: comm, error: commCreateErr } = await client
    .from('communities')
    .insert({
      name: 'Besant Nagar Feeder Pack',
      slug: commSlug,
      description: 'Volunteer group feeding neighborhood dogs daily',
      community_type: 'general',
      city: 'Chennai',
      region: 'Tamil Nadu',
      country_code: 'IN',
      created_by: createdUser!.id,
      members: [createdUser!.id],
      roles: { [createdUser!.id]: 'founder' },
      rules: ['Feed regularly', 'Keep stations clean', 'Vaccinate all street animals'],
      settings: { open_membership: true },
      is_private: false,
      is_active: true,
      stats: { members_count: 1, animals_tracked: 12 },
    })
    .select()
    .single();

  assert(!commCreateErr && !!comm, `CREATE communities (ID: ${comm?.id}, Slug: ${comm?.slug})`);

  const { data: updatedComm, error: commUpdateErr } = await client
    .from('communities')
    .update({ description: 'Updated: Official community pack for Besant Nagar' })
    .eq('id', comm!.id)
    .select()
    .single();

  assert(!commUpdateErr && !!updatedComm, `UPDATE communities`);

  // [5c] animals CRUD
  const { data: animal, error: animalCreateErr } = await client
    .from('animals')
    .insert({
      name: 'Tiger',
      species: 'dog',
      breed: 'Indian Pariah',
      sex: 'male',
      description: 'Friendly golden dog who guards the 4th Avenue junction',
      avatar_url: 'https://feeder.life/animals/tiger.jpg',
      city: 'Chennai',
      region: 'Tamil Nadu',
      country_code: 'IN',
      created_by: createdUser!.id,
      profile_data: { age: '2.5 years', ear_notched: true },
      media: [{ url: 'https://feeder.life/animals/tiger1.jpg', type: 'image' }],
      medical_data: { anti_rabies: 'Valid until 2027', deworming_date: '2026-08-10' },
      feeding_data: { diet: 'Rice + boiled chicken broth', meal_frequency: 'twice_daily' },
      sos_data: { is_emergency: false },
      rescue_data: {},
      adoption_data: { ready_for_adoption: false },
      veterinary_data: { vet_name: 'Dr. Kumar', clinic: 'Blue Cross' },
      followers: [createdUser!.id],
      status: 'active',
    })
    .select()
    .single();

  assert(!animalCreateErr && !!animal, `CREATE animals (ID: ${animal?.id}, Name: ${animal?.name})`);

  const { data: updatedAnimal, error: animalUpdateErr } = await client
    .from('animals')
    .update({ status: 'rescued' })
    .eq('id', animal!.id)
    .select()
    .single();

  assert(
    !animalUpdateErr && updatedAnimal?.status === 'rescued',
    `UPDATE animals (Status updated to rescued)`
  );

  // [5d] platform_data CRUD
  const { data: pData, error: pDataCreateErr } = await client
    .from('platform_data')
    .insert({
      data_type: 'notification',
      user_id: createdUser!.id,
      target_id: post!.id,
      status: 'unread',
      data: {
        title: 'New Feeder Joined',
        body: 'A neighbor volunteered to cover Wednesday evening feeding.',
      },
    })
    .select()
    .single();

  assert(!pDataCreateErr && !!pData, `CREATE platform_data (ID: ${pData?.id}, Type: ${pData?.data_type})`);

  const { data: updatedPData, error: pDataUpdateErr } = await client
    .from('platform_data')
    .update({ status: 'read' })
    .eq('id', pData!.id)
    .select()
    .single();

  assert(!pDataUpdateErr && updatedPData?.status === 'read', `UPDATE platform_data`);

  // [5e] DELETE (Cleanup)
  console.log('\n--- Cleanup: DELETE test records ---');
  const { error: delPlatformErr } = await client.from('platform_data').delete().eq('id', pData!.id);
  assert(!delPlatformErr, 'DELETE platform_data record');

  const { error: delAnimalErr } = await client.from('animals').delete().eq('id', animal!.id);
  assert(!delAnimalErr, 'DELETE animals record');

  const { error: delCommErr } = await client.from('communities').delete().eq('id', comm!.id);
  assert(!delCommErr, 'DELETE communities record');

  const { error: delPostErr } = await client.from('social_posts').delete().eq('id', post!.id);
  assert(!delPostErr, 'DELETE social_posts record');

  const { error: delUserErr } = await client.from('users').delete().eq('id', createdUser!.id);
  assert(!delUserErr, 'DELETE users record');

  // ==============================================================
  // 6. Return Proper Errors
  // ==============================================================
  console.log('\n--- Step 6: Return Proper Errors ---');

  // 6a. Foreign Key constraint error (23503)
  const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
  const { error: fkErr } = await client.from('social_posts').insert({
    record_type: 'post',
    user_id: nonExistentUserId,
    data: {},
    media: [],
    reactions: {},
    comments: {},
    hashtags: [],
    mentions: [],
    visibility: 'public',
    is_active: true,
    is_deleted: false,
    stats: {},
  });
  assert(
    fkErr?.code === '23503',
    `Foreign Key Error properly caught (Code: ${fkErr?.code}, Message: ${fkErr?.message})`
  );

  // 6b. Check Constraint violation (23514)
  const { error: checkErr } = await client.from('communities').insert({
    name: 'Invalid Community Type',
    slug: `invalid-comm-${Date.now()}`,
    community_type: 'unsupported_type_xyz',
    members: [],
    roles: {},
    rules: [],
    settings: {},
    is_private: false,
    is_active: true,
    stats: {},
  });
  assert(
    checkErr?.code === '23514',
    `Check Constraint Error properly caught (Code: ${checkErr?.code}, Message: ${checkErr?.message})`
  );

  // 6c. Not-Null constraint violation (23502)
  const { error: nullErr } = await client.from('users').insert({
    email: 'test_nonull@feeder.life',
    // missing required firebase_uid
  });
  assert(
    nullErr?.code === '23502',
    `Not-Null Constraint Error properly caught (Code: ${nullErr?.code}, Message: ${nullErr?.message})`
  );

  console.log('\n================================================================');
  console.log(`  VERIFICATION COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

verifySupabaseBackend().catch((err) => {
  console.error('Unhandled Verification Failure:', err);
  process.exit(1);
});
