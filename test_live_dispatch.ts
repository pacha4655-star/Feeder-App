import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

import { dispatchEmergencyToResponders } from './src/server/dispatchService.ts';
import { sendEmergencyPushNotification } from './src/server/notificationService.ts';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runLiveTest() {
  console.log('=== STEP 1: Test Emergency Insertion & Real Responder Assignment ===');
  
  // 1. Insert real emergency record
  const { data: testReq, error: reqErr } = await supabase.from('help_requests').insert({
    firebase_uid: 'test_requester_user',
    emergency_type: 'Pet Accident',
    description: 'Automated test incident verification',
    latitude: 13.0827,
    longitude: 80.2707,
    address: 'Chennai Central, Chennai',
    created_at: new Date().toISOString()
  }).select('*').single();

  if (reqErr) {
    console.error('Failed to create help_request:', reqErr.message);
    process.exit(1);
  }
  console.log('1. help_requests row created with real ID:', testReq.id);

  // 2. Run real dispatch to active responders
  const dispatchRes = await dispatchEmergencyToResponders(
    testReq.id,
    'test_requester_user',
    'Pet Accident',
    'Chennai Central, Chennai',
    13.0827,
    80.2707
  );
  console.log('2. Dispatch result message:', dispatchRes.message);
  console.log('   Responders notified:', dispatchRes.responderCount);
  console.log('   FCM Push status:', dispatchRes.push?.status);

  // 3. Verify rescue_assignments created in Supabase Cloud
  const { data: assignments } = await supabase
    .from('rescue_assignments')
    .select('*')
    .eq('help_request_id', testReq.id);
  console.log('3. Real rescue_assignments created in Supabase:', assignments?.length);
  if (assignments && assignments.length > 0) {
    console.log('   Assigned responder UID:', assignments[0].responder_uid);
    console.log('   Assignment status:', assignments[0].status);
  }

  // 4. Verify in-app notifications
  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('actor_uid', 'test_requester_user');
  console.log('4. Real in-app notifications created in Supabase:', notifs?.length);

  // 5. Verify rescue_audit_logs
  const { data: logs } = await supabase
    .from('rescue_audit_logs')
    .select('event_type, details')
    .eq('help_request_id', testReq.id);
  console.log('5. Audit log entries created:');
  logs?.forEach(l => console.log(`   [${l.event_type}]: ${l.details}`));

  // 6. Test Real Google FCM Communication & Invalid Token Deactivation
  console.log('\n=== STEP 2: Testing Real Google FCM API & Invalid Token Deactivation ===');
  
  // Register a dummy/expired test token for the admin in responder_devices
  const fakeToken = 'eXample_invalid_or_expired_fcm_token_1234567890abcdefghijklmnopqrstuvwxyz';
  await supabase.from('responder_devices').upsert({
    firebase_uid: '50Coe4d0Tag9keLTqt16NTIUmVw1', // real UID of pacha4655@gmail.com
    push_token: fakeToken,
    platform: 'web',
    device_type: 'web',
    is_active: true,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'push_token' });

  console.log('1. Upserted test token into responder_devices (is_active = true)');

  // Call real sendEmergencyPushNotification -> this sends to Google FCM servers via Firebase Admin SDK!
  const pushTestRes = await sendEmergencyPushNotification(
    testReq.id,
    'Pet Accident',
    'Chennai Central',
    13.0827,
    80.2707
  );
  console.log('2. Real Google FCM response received:');
  console.log('   Status:', pushTestRes.status);
  console.log('   Sent count:', pushTestRes.sentCount);
  console.log('   Failure count:', pushTestRes.failureCount);

  // Verify that the invalid token was deactivated automatically in responder_devices
  const { data: devAfter } = await supabase
    .from('responder_devices')
    .select('is_active')
    .eq('push_token', fakeToken)
    .single();
  console.log('3. Was invalid token deactivated in responder_devices?', devAfter?.is_active === false ? 'YES (is_active = false)' : 'NO');

  // Verify that push_invalid_token audit log was created
  const { data: invalidLogs } = await supabase
    .from('rescue_audit_logs')
    .select('event_type, details')
    .eq('help_request_id', testReq.id)
    .eq('event_type', 'push_invalid_token');
  console.log('4. push_invalid_token audit record created?', invalidLogs && invalidLogs.length > 0 ? 'YES' : 'NO');

  // Clean up test records
  await supabase.from('help_requests').delete().eq('id', testReq.id);
  await supabase.from('responder_devices').delete().eq('push_token', fakeToken);
  if (notifs && notifs.length > 0) {
    await supabase.from('notifications').delete().eq('actor_uid', 'test_requester_user');
  }
  console.log('\n=== Cleaned up all test artifacts cleanly ===');
  process.exit(0);
}

runLiveTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
