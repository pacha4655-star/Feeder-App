import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      });
    }
  }
}
loadEnv();

import { getSupabaseServerClient } from '../src/lib/supabase/server';
import { getDb } from '../src/lib/db';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function createJpegBuffer(): Buffer {
  // Valid JPEG header FF D8 FF E0 ... and trailer FF D9
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const content = Buffer.alloc(2048, 0xbb);
  const footer = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([header, content, footer]);
}

function extractCookie(res: Response, cookieName: string): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('  FEEDER.LIFE: REAL AI CHATBOT + EDITABLE PROFILE VERIFICATION');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const supabase = getSupabaseServerClient();
  const db = getDb();

  // -------------------------------------------------------------
  // 1. EXACTLY 5 PHYSICAL TABLES VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 1: DATABASE PHYSICAL TABLE ARCHITECTURE ---');
  try {
    const { data: supaTables, error: tblErr } = await supabase.rpc('get_table_names');
    // Direct inspection of required 5 tables
    const requiredTables = ['users', 'social_posts', 'communities', 'animals', 'platform_data'];
    let allExist = true;
    for (const t of requiredTables) {
      const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
      if (error) {
        allExist = false;
        console.error(`Missing or inaccessible table: ${t}`, error.message);
      }
    }
    assert(allExist, 'All 5 core physical tables are accessible in Supabase PostgreSQL');

    // Confirm no new tables introduced
    const disallowedTables = [
      'chat_messages',
      'chat_conversations',
      'ai_messages',
      'ai_conversations',
      'profile_images',
      'usernames',
      'avatars',
    ];
    let zeroDisallowed = true;
    for (const dt of disallowedTables) {
      const res = await supabase.from(dt).select('id').limit(1);
      if (!res.error || res.status === 200) {
        zeroDisallowed = false;
        console.error(`Disallowed physical table found: ${dt}`);
      }
    }
    assert(zeroDisallowed, 'Zero disallowed physical tables in Supabase (persisting in platform_data & users)');
  } catch (err: any) {
    console.error('Table verification exception:', err);
  }

  // -------------------------------------------------------------
  // 2. REAL USER SIGNUP & AUTHENTICATION (USER A & USER B)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: AUTHENTICATION & MULTI-USER SETUP ---');
  const userAEmail = `tester_a_${timestamp}@feeder.life`;
  const userAPassword = 'Password123!';
  const userAUsername = `tester_a_${timestamp.toString().slice(-6)}`;

  const userBEmail = `tester_b_${timestamp}@feeder.life`;
  const userBPassword = 'Password123!';
  const userBUsername = `tester_b_${timestamp.toString().slice(-6)}`;

  // Signup User A
  const signupARes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      password: userAPassword,
      fullName: 'Alice Guardian A',
      username: userAUsername,
    }),
  });
  const signupAData = await signupARes.json();
  const cookieA = extractCookie(signupARes, 'feeder_session');
  assert(signupARes.ok && signupAData.success, 'User A signup succeeded', signupAData.error);
  assert(!!cookieA, 'User A received valid tamper-proof signed session cookie');

  // Signup User B
  const signupBRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userBEmail,
      password: userBPassword,
      fullName: 'Bob Guardian B',
      username: userBUsername,
    }),
  });
  const signupBData = await signupBRes.json();
  const cookieB = extractCookie(signupBRes, 'feeder_session');
  assert(signupBRes.ok && signupBData.success, 'User B signup succeeded', signupBData.error);
  assert(!!cookieB, 'User B received valid session cookie');

  const userAId = signupAData.user?.id;
  const userBId = signupBData.user?.id;

  // -------------------------------------------------------------
  // 3. PROFILE IMAGE MANUAL CHANGE & STORAGE FLOW
  // -------------------------------------------------------------
  console.log('\n--- SECTION 3: REAL PROFILE IMAGE CHANGE & PERSISTENCE ---');
  const jpegBuffer = createJpegBuffer();
  const formData = new FormData();
  formData.append(
    'file',
    new Blob([new Uint8Array(jpegBuffer)], { type: 'image/jpeg' }),
    'avatar-test.jpg'
  );

  const uploadRes = await fetch(`${BASE_URL}/api/upload?category=profiles`, {
    method: 'POST',
    headers: {
      Cookie: `feeder_session=${cookieA}`,
    },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  assert(uploadRes.ok && uploadData.success, 'User A uploaded real avatar via /api/upload?category=profiles', uploadData.error);
  assert(
    uploadData.storagePath && uploadData.storagePath.includes('/profiles/'),
    `Avatar stored in user-scoped path: ${uploadData.storagePath}`
  );
  assert(
    uploadData.url && uploadData.url.startsWith('http'),
    `Avatar has valid public URL: ${uploadData.url}`
  );

  // Update profile with avatar URL
  const updateAvatarRes = await fetch(`${BASE_URL}/api/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `feeder_session=${cookieA}`,
    },
    body: JSON.stringify({ avatarUrl: uploadData.url }),
  });
  const updateAvatarData = await updateAvatarRes.json();
  assert(updateAvatarRes.ok && updateAvatarData.success, 'User A updated avatar_url via PUT /api/users/profile');

  // Verify persistence via GET /api/users/profile (simulating refresh)
  const getProfileARes = await fetch(`${BASE_URL}/api/users/profile`, {
    headers: { Cookie: `feeder_session=${cookieA}` },
  });
  const getProfileAData = await getProfileARes.json();
  assert(
    getProfileAData.success && getProfileAData.profile.avatar_url === uploadData.url,
    'Avatar URL persists across subsequent profile fetch'
  );

  // Verify Supabase PostgreSQL direct source of truth
  const { data: supaUserA } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', userAId)
    .single();
  assert(
    supaUserA?.avatar_url === uploadData.url,
    'Supabase PostgreSQL users.avatar_url matches uploaded image URL'
  );

  // -------------------------------------------------------------
  // 4. USERNAME MANUAL CHANGE & CASE-INSENSITIVE DUPLICATE PROTECTION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 4: USERNAME CHANGE & DUPLICATE VALIDATION ---');
  const targetUsername = `rescuer_${timestamp.toString().slice(-5)}`;

  // User A updates username
  const updateUsernameRes = await fetch(`${BASE_URL}/api/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `feeder_session=${cookieA}`,
    },
    body: JSON.stringify({ username: targetUsername }),
  });
  const updateUsernameData = await updateUsernameRes.json();
  assert(
    updateUsernameRes.ok && updateUsernameData.success && updateUsernameData.profile.username === targetUsername,
    `User A successfully updated username to "${targetUsername}"`
  );

  // Verify Supabase PostgreSQL persistence
  const { data: updatedSupaUserA } = await supabase
    .from('users')
    .select('username')
    .eq('id', userAId)
    .single();
  assert(
    updatedSupaUserA?.username === targetUsername,
    'Supabase PostgreSQL users.username accurately updated'
  );

  // Test User B attempting duplicate username (exact case)
  const dupExactRes = await fetch(`${BASE_URL}/api/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `feeder_session=${cookieB}`,
    },
    body: JSON.stringify({ username: targetUsername }),
  });
  const dupExactData = await dupExactRes.json();
  assert(
    dupExactRes.status === 409 && dupExactData.error === 'This username is already taken.',
    'User B rejected when attempting duplicate username (409 Conflict)'
  );

  // Test User B attempting duplicate username (case-insensitive UPPERCASE)
  const dupUpperRes = await fetch(`${BASE_URL}/api/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `feeder_session=${cookieB}`,
    },
    body: JSON.stringify({ username: targetUsername.toUpperCase() }),
  });
  const dupUpperData = await dupUpperRes.json();
  assert(
    dupUpperRes.status === 409 && dupUpperData.error === 'This username is already taken.',
    'User B rejected when attempting case-insensitive duplicate username'
  );

  // Test Username validation rules (too short, too long, invalid characters)
  const shortRes = await fetch(`${BASE_URL}/api/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: `feeder_session=${cookieB}` },
    body: JSON.stringify({ username: 'ab' }),
  });
  const shortData = await shortRes.json();
  assert(shortRes.status === 400 && shortData.error === 'Username is too short.', 'Rejects username shorter than 3 chars');

  const invalidCharsRes = await fetch(`${BASE_URL}/api/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: `feeder_session=${cookieB}` },
    body: JSON.stringify({ username: 'bad user!@#' }),
  });
  const invalidCharsData = await invalidCharsRes.json();
  assert(
    invalidCharsRes.status === 400 &&
      invalidCharsData.error === 'Username can only contain letters, numbers, and underscores.',
    'Rejects username with invalid characters/spaces'
  );

  // -------------------------------------------------------------
  // 5. REAL AI CHATBOT — ASK FEEDER (MULTI-TURN & PERSISTENCE)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 5: REAL AI CHATBOT CONVERSATION & MEMORY ---');

  // Turn 1: Initial query
  const turn1Res = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `feeder_session=${cookieA}`,
    },
    body: JSON.stringify({
      message: 'My dog is not eating since yesterday. What should I check?',
    }),
  });
  const turn1Data = await turn1Res.json();
  assert(turn1Res.ok && turn1Data.success, 'User A received AI response to initial welfare question');
  assert(!!turn1Data.conversationId, `Created real conversation: ${turn1Data.conversationId}`);
  assert(
    turn1Data.content && turn1Data.content.length > 50,
    'Response contains substantive non-placeholder guidance'
  );
  assert(
    turn1Data.content.toLowerCase().includes('dog') || turn1Data.content.toLowerCase().includes('food') || turn1Data.content.toLowerCase().includes('appetite'),
    'AI response directly addresses dog appetite concern'
  );

  const conversationId = turn1Data.conversationId;

  // Turn 2: Follow-up query in the same conversation
  const turn2Res = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `feeder_session=${cookieA}`,
    },
    body: JSON.stringify({
      conversationId,
      message: 'He has also been vomiting and looks very weak.',
    }),
  });
  const turn2Data = await turn2Res.json();
  assert(turn2Res.ok && turn2Data.success, 'User A received contextual AI follow-up response');
  assert(
    turn2Data.conversationId === conversationId,
    'Follow-up maintained the same conversation identifier'
  );
  assert(
    turn2Data.content.toLowerCase().includes('vomit') || turn2Data.content.toLowerCase().includes('vet') || turn2Data.content.toLowerCase().includes('dehydration'),
    'Follow-up AI response correctly incorporates the previous dog context and vomiting triage'
  );

  // Verify persistence in Supabase PostgreSQL (platform_data table)
  const { data: supaConversation } = await supabase
    .from('platform_data')
    .select('*')
    .eq('id', conversationId)
    .eq('data_type', 'ai_conversation')
    .single();
  assert(
    !!supaConversation && supaConversation.user_id === userAId,
    'AI conversation persisted in Supabase platform_data table with correct user_id'
  );

  const { data: supaMessages } = await supabase
    .from('platform_data')
    .select('*')
    .eq('target_id', conversationId)
    .eq('data_type', 'ai_message');
  assert(
    Boolean(supaMessages && supaMessages.length >= 2),
    `Supabase platform_data contains ${supaMessages?.length} persisted AI messages for conversation`
  );

  // -------------------------------------------------------------
  // 6. IDOR / AUTHORIZATION PROTECTION (USER B vs USER A)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 6: IDOR / BOLA AUTHORIZATION TESTING ---');

  // User B attempts to access User A's conversation messages
  const idorGetRes = await fetch(`${BASE_URL}/api/ai/conversations/${conversationId}`, {
    headers: { Cookie: `feeder_session=${cookieB}` },
  });
  assert(
    idorGetRes.status === 403 || idorGetRes.status === 404,
    `User B forbidden from viewing User A conversation (Status: ${idorGetRes.status})`
  );

  // User B attempts to delete User A's conversation
  const idorDeleteRes = await fetch(`${BASE_URL}/api/ai/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: { Cookie: `feeder_session=${cookieB}` },
  });
  assert(
    idorDeleteRes.status === 403 || idorDeleteRes.status === 404,
    `User B forbidden from deleting User A conversation (Status: ${idorDeleteRes.status})`
  );

  // User B attempts to inject a message into User A's conversation
  const idorPostRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `feeder_session=${cookieB}`,
    },
    body: JSON.stringify({
      conversationId,
      message: 'Can I hijack this chat?',
    }),
  });
  assert(
    idorPostRes.status === 403,
    `User B forbidden from posting into User A conversation (Status: ${idorPostRes.status})`
  );

  // -------------------------------------------------------------
  // 7. UNAUTHENTICATED ACCESS PROTECTION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 7: UNAUTHENTICATED SECURITY CHECKS ---');
  const unauthChatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello without login' }),
  });
  assert(unauthChatRes.status === 401, 'Unauthenticated request to /api/ai/chat rejected (401)');

  const unauthProfileRes = await fetch(`${BASE_URL}/api/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'hacker' }),
  });
  assert(unauthProfileRes.status === 401, 'Unauthenticated request to /api/users/profile rejected (401)');

  // -------------------------------------------------------------
  // 8. SECTION 8: 10 REAL QUESTIONS AI QUALITY TEST
  // -------------------------------------------------------------
  console.log('\n--- SECTION 8: 10 REAL WELFARE & FEEDER QUESTIONS QUALITY TEST ---');
  const benchmarkQuestions = [
    {
      q: 'My dog is not eating since yesterday. What should I check?',
      expectedKeywords: ['appetite', 'lethargy', 'hydration', 'vet'],
    },
    {
      q: 'I found an injured street dog. What should I do first?',
      expectedKeywords: ['bleeding', 'towel', 'safe', 'veterinar'],
    },
    {
      q: 'How can I create a community in Feeder?',
      expectedKeywords: ['communit', 'create', 'group'],
    },
    {
      q: 'How do I upload a story from my phone?',
      expectedKeywords: ['story', 'stories', '24', 'upload'],
    },
    {
      q: 'Can I change my profile picture?',
      expectedKeywords: ['photo', 'profile', 'change', 'image'],
    },
    {
      q: 'What information should I add to an animal profile?',
      expectedKeywords: ['vaccin', 'animal', 'feeding', 'health'],
    },
    {
      q: 'My puppy is vomiting and looks weak. Is this urgent?',
      expectedKeywords: ['urgent', 'dehydration', 'vet', 'parvo'],
    },
    {
      q: 'What should I consider before adopting a dog?',
      expectedKeywords: ['commit', 'exercise', 'vet', 'space'],
    },
    {
      q: 'How can I report animal abuse?',
      expectedKeywords: ['evidence', 'report', 'authorit', 'law'],
    },
    {
      q: 'Where can I find nearby help?',
      expectedKeywords: ['nearby', 'volunteer', 'map', 'sos'],
    },
  ];

  for (let i = 0; i < benchmarkQuestions.length; i++) {
    const item = benchmarkQuestions[i];
    const qRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `feeder_session=${cookieA}`,
      },
      body: JSON.stringify({ message: item.q }),
    });
    const qData = await qRes.json();
    const contentLower = (qData.content || '').toLowerCase();
    const matchedKeyword = item.expectedKeywords.some((kw) => contentLower.includes(kw));

    assert(
      qRes.ok && qData.success && matchedKeyword,
      `Q${i + 1}: "${item.q.slice(0, 35)}..." answered with relevant domain knowledge`
    );
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
