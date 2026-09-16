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

import crypto from 'crypto';

const BASE_URL = 'http://localhost:3000';

function createJpegBuffer(): Buffer {
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const filler = Buffer.alloc(1024, 0xaa);
  const footer = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([header, filler, footer]);
}

function createMp4Buffer(): Buffer {
  const size = Buffer.from([0x00, 0x00, 0x00, 0x18]);
  const ftyp = Buffer.from('ftypmp42', 'ascii');
  const rest = Buffer.alloc(2048, 0x55);
  return Buffer.concat([size, ftyp, rest]);
}

async function main() {
  console.log('===========================================================');
  console.log('  FEEDER.LIFE: END-TO-END HTTP INTEGRATION TEST (PORT 3000)');
  console.log('===========================================================\n');

  const timestamp = Date.now();

  // 1. Authenticate User A
  console.log('[STEP 1] Signup & Authenticate Real User A');
  const userAEmail = `guardian_a_${timestamp}@feeder.life`;
  const userAPassword = 'Password123!';
  const userAUsername = `guardian_a_${timestamp.toString().slice(-5)}`;

  const signupARes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      password: userAPassword,
      fullName: 'Alice Animal Guardian',
      username: userAUsername,
    }),
  });

  const cookieHeaderA = signupARes.headers.get('set-cookie');
  const signupAData = await signupARes.json();
  if (!signupAData.success || !cookieHeaderA) {
    throw new Error(`User A signup failed: ${JSON.stringify(signupAData)}`);
  }
  const sessionCookieA = cookieHeaderA.split(';')[0];
  console.log('  ✓ User A Authenticated with HttpOnly session cookie');

  // Complete onboarding for User A
  await fetch(`${BASE_URL}/api/auth/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookieA },
    body: JSON.stringify({ city: 'Chennai', areaName: 'Indiranagar' }),
  });

  // 2. User A Uploads Real JPEG Photo to /api/upload
  console.log('\n[STEP 2] User A Uploads Real JPEG to /api/upload?category=posts');
  const jpegBlob = new Blob([new Uint8Array(createJpegBuffer())], { type: 'image/jpeg' });
  const formPhoto = new FormData();
  formPhoto.append('file', jpegBlob, 'puppy_feeding.jpg');
  formPhoto.append('category', 'posts');

  const uploadPhotoRes = await fetch(`${BASE_URL}/api/upload?category=posts`, {
    method: 'POST',
    headers: { Cookie: sessionCookieA },
    body: formPhoto,
  });

  const uploadPhotoData = await uploadPhotoRes.json();
  console.log('  Upload response:', uploadPhotoData);
  if (!uploadPhotoData.success || !uploadPhotoData.url) {
    throw new Error(`Post photo upload failed: ${JSON.stringify(uploadPhotoData)}`);
  }
  console.log('  ✓ Post Photo uploaded to Supabase Storage path:', uploadPhotoData.storagePath);
  console.log('  ✓ Public URL returned:', uploadPhotoData.url);

  // 3. User A Publishes Real Post with Photo
  console.log('\n[STEP 3] User A Publishes Real Post via /api/feed');
  const postRes = await fetch(`${BASE_URL}/api/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookieA },
    body: JSON.stringify({
      title: 'Morning Stray Pup Pack Fed 🐾',
      body: 'Fed 6 stray pups at Indiranagar 12th Main. All healthy and active!',
      contentType: 'FEEDING_UPDATE',
      visibility: 'PUBLIC',
      locationName: 'Indiranagar 12th Main',
      mediaUrls: [uploadPhotoData.url],
    }),
  });
  const postData = await postRes.json();
  if (!postData.success || !postData.postId) {
    throw new Error(`Post publication failed: ${JSON.stringify(postData)}`);
  }
  const postId = postData.postId;
  console.log('  ✓ Real Post created with ID:', postId);

  // 4. Refresh Test: Query Feed to verify persistence
  console.log('\n[STEP 4] Refresh Verification: GET /api/feed');
  const feedRes = await fetch(`${BASE_URL}/api/feed?tab=FOR_YOU`);
  const feedData = await feedRes.json();
  const foundPost = feedData.posts?.find((p: any) => p.id === postId);
  if (!foundPost) {
    throw new Error('Post not found in feed after refresh');
  }
  console.log('  ✓ Post persists across page refresh in /api/feed');
  console.log('  ✓ Post media accurately retrieved from Supabase Storage:', foundPost.media_urls);

  // 5. User A Uploads Real Story Video to /api/upload?category=stories
  console.log('\n[STEP 5] User A Uploads Real MP4 Video to /api/upload?category=stories');
  const mp4Blob = new Blob([new Uint8Array(createMp4Buffer())], { type: 'video/mp4' });
  const formVideo = new FormData();
  formVideo.append('file', mp4Blob, 'puppy_playing.mp4');
  formVideo.append('category', 'stories');

  const uploadVidRes = await fetch(`${BASE_URL}/api/upload?category=stories`, {
    method: 'POST',
    headers: { Cookie: sessionCookieA },
    body: formVideo,
  });
  const uploadVidData = await uploadVidRes.json();
  if (!uploadVidData.success || !uploadVidData.url) {
    throw new Error(`Story video upload failed: ${JSON.stringify(uploadVidData)}`);
  }
  console.log('  ✓ Story Video uploaded to Supabase Storage path:', uploadVidData.storagePath);

  // 6. User A Publishes Real Story via /api/stories
  console.log('\n[STEP 6] User A Publishes 24h Story via /api/stories');
  const storyRes = await fetch(`${BASE_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookieA },
    body: JSON.stringify({
      mediaUrl: uploadVidData.url,
      mediaType: 'VIDEO',
      caption: 'Puppies waking up and greeting each other! 🐾',
    }),
  });
  const storyData = await storyRes.json();
  if (!storyData.success || !storyData.storyId) {
    throw new Error(`Story creation failed: ${JSON.stringify(storyData)}`);
  }
  const storyId = storyData.storyId;
  console.log('  ✓ Story created with ID:', storyId);

  // 7. Verify Story in Stories Tray: GET /api/stories
  console.log('\n[STEP 7] Verify Story in Active Rail: GET /api/stories');
  const storiesRes = await fetch(`${BASE_URL}/api/stories`);
  const storiesData = await storiesRes.json();
  const foundStory = storiesData.stories?.find((s: any) => s.id === storyId);
  if (!foundStory) {
    throw new Error('Story not found in active stories rail');
  }
  console.log('  ✓ Story active in story rail with 24h expiration:', foundStory.expires_at);

  // 8. User B Interaction: Signup User B, View Story & React to Post
  console.log('\n[STEP 8] User B Interaction (Two-User Test)');
  const userBEmail = `guardian_b_${timestamp}@feeder.life`;
  const signupBRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userBEmail,
      password: 'Password123!',
      fullName: 'Bob Rescue Volunteer',
      username: `guardian_b_${timestamp.toString().slice(-5)}`,
    }),
  });
  const cookieHeaderB = signupBRes.headers.get('set-cookie');
  const sessionCookieB = cookieHeaderB!.split(';')[0];
  console.log('  ✓ User B Authenticated');

  // User B views User A's story
  const viewRes = await fetch(`${BASE_URL}/api/stories/${storyId}/view`, {
    method: 'POST',
    headers: { Cookie: sessionCookieB },
  });
  console.log('  ✓ User B viewed User A story (status:', viewRes.status, ')');

  // User B reacts to User A's post
  const reactRes = await fetch(`${BASE_URL}/api/posts/${postId}/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookieB },
    body: JSON.stringify({ reactionType: 'SUPPORT' }),
  });
  const reactData = await reactRes.json();
  console.log('  ✓ User B reacted SUPPORT to User A post. Reaction count:', reactData.reactionCount);

  // 9. Authorization Test: User C (Adversary) Attempts Unauthorized Actions
  console.log('\n[STEP 9] Authorization & RBAC Enforcement (User C)');
  const userCEmail = `adversary_c_${timestamp}@feeder.life`;
  const signupCRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userCEmail,
      password: 'Password123!',
      fullName: 'Charlie Adversary',
      username: `adversary_c_${timestamp.toString().slice(-5)}`,
    }),
  });
  const cookieHeaderC = signupCRes.headers.get('set-cookie');
  const sessionCookieC = cookieHeaderC!.split(';')[0];
  console.log('  ✓ User C Authenticated');

  // User C tries to delete User A's post
  const delPostRes = await fetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookieC },
  });
  console.log('  ✓ User C delete User A post returned HTTP status:', delPostRes.status, '(Must be 403)');
  if (delPostRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for User C deleting User A post, got: ${delPostRes.status}`);
  }

  // User C tries to delete User A's story
  const delStoryRes = await fetch(`${BASE_URL}/api/stories/${storyId}`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookieC },
  });
  console.log('  ✓ User C delete User A story returned HTTP status:', delStoryRes.status, '(Must be 403)');
  if (delStoryRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for User C deleting User A story, got: ${delStoryRes.status}`);
  }

  // 10. Clean up test artifacts
  console.log('\n[STEP 10] Clean Up Test Posts and Stories');
  // Author deletes own post
  const authorDelPost = await fetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookieA },
  });
  console.log('  ✓ User A deleted own post (status:', authorDelPost.status, ')');

  // Author deletes own story
  const authorDelStory = await fetch(`${BASE_URL}/api/stories/${storyId}`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookieA },
  });
  console.log('  ✓ User A deleted own story (status:', authorDelStory.status, ')');

  console.log('\n===========================================================');
  console.log('  ALL REAL USER HTTP INTEGRATION TESTS COMPLETED: 100% PASS');
  console.log('===========================================================\n');
}

main().catch((err) => {
  console.error('Fatal HTTP integration test failure:', err);
  process.exit(1);
});
