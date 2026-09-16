import { getDb } from '../src/lib/db';

async function runVerification() {
  console.log('--- STARTING FEEDER.LIFE REAL PRODUCTION VERIFICATION ---');
  const baseUrl = 'http://localhost:3000';
  let passedTests = 0;
  let totalTests = 0;
  let testUserId: string | null = null;
  let user2Id: string | null = null;
  let createdPostId: string | null = null;
  let createdStoryId: string | null = null;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passedTests++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      process.exitCode = 1;
    }
  }

  // 1. Guest Feed check
  console.log('\n[1] Checking Guest Read Access...');
  const resFeed = await fetch(`${baseUrl}/api/feed`);
  assert(resFeed.status === 200, 'GET /api/feed returns HTTP 200 for guest');
  const feedData = await resFeed.json();
  assert(feedData.success === true && Array.isArray(feedData.posts), 'Guest feed returns valid array');

  // 2. Guest Nearby check
  const resNearby = await fetch(`${baseUrl}/api/nearby`);
  assert(resNearby.status === 200, 'GET /api/nearby returns HTTP 200');
  const nearbyData = await resNearby.json();
  assert(nearbyData.success === true && Array.isArray(nearbyData.items), 'Nearby returns valid array');

  // 3. Guest Notifications check
  const resNotifs = await fetch(`${baseUrl}/api/notifications`);
  assert(resNotifs.status === 200, 'GET /api/notifications returns HTTP 200 for guest');
  const notifData = await resNotifs.json();
  assert(notifData.success === true && notifData.unreadCount === 0, 'Guest unread count is 0');

  // 4. Unauthorized Mutation Checks
  console.log('\n[2] Checking Guest Mutation Protection (401s)...');
  const resPostNoAuth = await fetch(`${baseUrl}/api/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test Post', body: 'Test body' }),
  });
  assert(resPostNoAuth.status === 401, 'POST /api/feed rejects unauthenticated requests with 401');

  const resSosNoAuth = await fetch(`${baseUrl}/api/sos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test SOS', animalType: 'DOG' }),
  });
  assert(resSosNoAuth.status === 401, 'POST /api/sos rejects unauthenticated requests with 401');

  // 5. Real User Registration
  console.log('\n[3] Testing Real User Registration...');
  const uniqueTestUser = `tester_${Date.now()}`;
  const testEmail = `${uniqueTestUser}@feeder.life`;
  const testPassword = 'SecurePassword123!';

  const resSignup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      fullName: 'Test Guardian User',
      username: uniqueTestUser,
    }),
  });

  assert(resSignup.status === 200, 'POST /api/auth/signup succeeds with HTTP 200');
  const signupData = await resSignup.json();
  testUserId = signupData.user?.id || null;
  assert(signupData.success === true && signupData.user.email === testEmail, 'User profile properly created');

  // Extract session cookie
  const cookieHeader = resSignup.headers.get('set-cookie');
  assert(cookieHeader !== null && cookieHeader.includes('feeder_session='), 'HttpOnly feeder_session cookie returned');

  const sessionCookie = cookieHeader ? cookieHeader.split(';')[0] : '';

  // 6. Complete Onboarding
  console.log('\n[4] Testing Onboarding Flow...');
  const resOnboard = await fetch(`${baseUrl}/api/auth/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({
      areaName: 'Indiranagar 12th Main',
      cityName: 'Bengaluru',
      feederRole: 'VET',
      bio: 'Veterinary surgeon helping street animals and coordinating rescue sterilizations.',
    }),
  });
  assert(resOnboard.status === 200, 'POST /api/auth/onboarding succeeds with HTTP 200');

  // 7. Create Real Post
  console.log('\n[5] Testing Real Post Creation...');
  const resCreatePost = await fetch(`${baseUrl}/api/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({
      title: 'Community Canine Vaccination Camp Completed',
      body: 'Successfully vaccinated 24 community dogs in Indiranagar 12th Main against rabies and DHPPi today. Clean water points replenished.',
      contentType: 'NORMAL',
      locationName: 'Indiranagar 12th Main, Bengaluru',
      visibility: 'PUBLIC',
    }),
  });
  assert(resCreatePost.status === 200, 'POST /api/feed succeeds for real user');
  const postData = await resCreatePost.json();
  createdPostId = postData.postId;
  assert(postData.success === true && !!postData.postId, `Post created with ID: ${postData.postId}`);

  // 8. React to Post
  console.log('\n[6] Testing Real Reaction...');
  const resReact = await fetch(`${baseUrl}/api/posts/${postData.postId}/react`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({ reactionType: 'CARE' }),
  });
  assert(resReact.status === 200, 'POST /api/posts/:id/react succeeds');
  const reactData = await resReact.json();
  assert(reactData.success === true && reactData.reactionCount === 1, 'Reaction registered in database');

  // 9. Comment on Post
  console.log('\n[7] Testing Real Commenting...');
  const resComment = await fetch(`${baseUrl}/api/posts/${postData.postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({ body: 'Great work team! Medical records updated.' }),
  });
  assert(resComment.status === 200, 'POST /api/posts/:id/comments succeeds');
  const commentData = await resComment.json();
  assert(commentData.success === true && !!commentData.comment.id, 'Comment saved in database');

  // 10. Record Real Feeding Log
  console.log('\n[8] Testing Real Feeding Log...');
  const resFeeding = await fetch(`${baseUrl}/api/feeding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({
      animalType: 'Street Dogs',
      animalCount: 14,
      foodType: 'Boiled chicken, pumpkin & brown rice',
      quantityDesc: '6 kg',
      approxLocationName: 'Indiranagar Metro Station Roundabout',
      notes: 'All dogs healthy; no skin infections noted.',
      visibility: 'PUBLIC',
    }),
  });
  assert(resFeeding.status === 200, 'POST /api/feeding succeeds');
  const feedingData = await resFeeding.json();
  assert(feedingData.success === true && !!feedingData.logId, `Feeding log saved with ID: ${feedingData.logId}`);

  // 11. Create Real Emergency SOS
  console.log('\n[9] Testing Real Emergency SOS...');
  const resSos = await fetch(`${baseUrl}/api/sos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({
      emergencyType: 'INJURED_ANIMAL',
      animalType: 'Kitten',
      urgency: 'HIGH',
      title: 'Kitten with trapped paw near storm drain',
      description: 'Small ginger kitten trapped behind drain grate. Crying loudly.',
      approxLocationName: 'Indiranagar 100ft Road junction',
      approxLat: 12.9716,
      approxLon: 77.5946,
      contactPreference: 'IN_APP',
    }),
  });
  assert(resSos.status === 200, 'POST /api/sos succeeds');
  const sosData = await resSos.json();
  assert(sosData.success === true && !!sosData.caseId, `SOS case saved with ID: ${sosData.caseId}`);

  // 12. Create 24h Story
  console.log('\n[10] Testing 24h Temporary Story System...');
  const resStory = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({
      mediaUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b',
      mediaType: 'IMAGE',
      caption: 'Morning feeding round at the community park!',
    }),
  });
  assert(resStory.status === 200, 'POST /api/stories succeeds');
  const storyData = await resStory.json();
  createdStoryId = storyData.storyId || null;
  assert(storyData.success === true && !!storyData.storyId, 'Story created with 24h expiration');

  const resGetStories = await fetch(`${baseUrl}/api/stories`);
  assert(resGetStories.status === 200, 'GET /api/stories returns active stories');
  const storiesList = await resGetStories.json();
  assert(storiesList.success === true && storiesList.stories.length > 0, 'Active stories rail has our story');

  if (storyData.storyId) {
    const resViewStory = await fetch(`${baseUrl}/api/stories/${storyData.storyId}/view`, {
      method: 'POST',
      headers: { 'Cookie': sessionCookie },
    });
    assert(resViewStory.status === 200, 'POST /api/stories/:id/view records story view');
  }

  // 13. Save Post / Bookmark
  console.log('\n[11] Testing Post Saving & Bookmarks...');
  const resSave = await fetch(`${baseUrl}/api/posts/${postData.postId}/save`, {
    method: 'POST',
    headers: { 'Cookie': sessionCookie },
  });
  assert(resSave.status === 200, 'POST /api/posts/:id/save succeeds');
  const saveData = await resSave.json();
  assert(saveData.success === true && saveData.isSaved === true, 'Post successfully marked as saved');

  // 14. Second User & Social Graph (Follow/Unfollow)
  console.log('\n[12] Testing Social Graph & Following...');
  const secondUser = `guardian_${Date.now()}`;
  const resSignup2 = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `${secondUser}@feeder.life`,
      password: 'SecurePassword123!',
      fullName: 'Second Guardian User',
      username: secondUser,
    }),
  });
  assert(resSignup2.status === 200, 'Second user registered successfully');
  const signup2Data = await resSignup2.json();
  user2Id = signup2Data.user.id;

  // User 1 follows User 2
  const resFollow = await fetch(`${baseUrl}/api/users/${user2Id}/follow`, {
    method: 'POST',
    headers: { 'Cookie': sessionCookie },
  });
  assert(resFollow.status === 200, 'POST /api/users/:id/follow succeeds');
  const followData = await resFollow.json();
  assert(followData.success === true && followData.following === true, 'User 1 is now following User 2');

  const resCheckFollow = await fetch(`${baseUrl}/api/users/${user2Id}/follow`, {
    headers: { 'Cookie': sessionCookie },
  });
  const checkFollowData = await resCheckFollow.json();
  assert(checkFollowData.following === true && checkFollowData.followerCount >= 1, 'Follower stats accurately reflected');

  // 15. Direct Messaging
  console.log('\n[13] Testing Direct Messaging System...');
  const resStartConv = await fetch(`${baseUrl}/api/messages/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({ recipientId: user2Id }),
  });
  assert(resStartConv.status === 200, 'POST /api/messages/conversations creates direct conversation');
  const convData = await resStartConv.json();
  assert(convData.success === true && !!convData.conversationId, 'Conversation ID returned');

  const testConvId = convData.conversationId;
  const resSendMsg = await fetch(`${baseUrl}/api/messages/conversations/${testConvId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({ text: 'Hello, could you coordinate dog feeding tomorrow?' }),
  });
  assert(resSendMsg.status === 200, 'POST /api/messages/conversations/:id sends chat message');
  const sendMsgData = await resSendMsg.json();
  assert(sendMsgData.success === true && !!sendMsgData.message.id, 'Message delivered and saved to database');

  const resGetMsgs = await fetch(`${baseUrl}/api/messages/conversations/${testConvId}`, {
    headers: { 'Cookie': sessionCookie },
  });
  assert(resGetMsgs.status === 200, 'GET /api/messages/conversations/:id retrieves conversation history');
  const msgsData = await resGetMsgs.json();
  assert(msgsData.success === true && msgsData.messages.length >= 1, 'Chat message retrieved from DB');

  // 16. Profile Update
  console.log('\n[14] Testing Profile & Settings Update...');
  const resUpdateProfile = await fetch(`${baseUrl}/api/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify({
      fullName: 'Updated Guardian User',
      bio: 'Animal advocate helping street animals',
      areaName: 'Indiranagar 100ft Rd',
      city: 'Bengaluru',
    }),
  });
  assert(resUpdateProfile.status === 200, 'PUT /api/users/profile succeeds');

  const resGetProfile = await fetch(`${baseUrl}/api/users/profile`, {
    headers: { 'Cookie': sessionCookie },
  });
  assert(resGetProfile.status === 200, 'GET /api/users/profile succeeds');
  const profileData = await resGetProfile.json();
  assert(profileData.profile?.full_name === 'Updated Guardian User', 'Profile updates persisted in DB');

  // 17. Log out
  console.log('\n[15] Testing Real Logout...');
  const resLogout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
    },
  });
  // 18. Cleanup test entities
  console.log('\n[16] Cleaning up test run entities...');
  try {
    const db = getDb();
    if (createdPostId) db.prepare('DELETE FROM posts WHERE id = ?').run(createdPostId);
    if (createdStoryId) db.prepare('DELETE FROM stories WHERE id = ?').run(createdStoryId);
    if (testUserId) db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    if (user2Id) db.prepare('DELETE FROM users WHERE id = ?').run(user2Id);
    console.log('Test artifacts cleanly removed.');
  } catch {}

  console.log(`\n==================================================`);
  console.log(`RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log(`==================================================\n`);
}

runVerification().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
