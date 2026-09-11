/**
 * Notification Service
 * 
 * Manages:
 * 1. Server-side Firebase Cloud Messaging (FCM) Admin SDK setup
 * 2. Responder Device Push Token Registration & Lifecycle (responder_devices)
 * 3. Real emergency push notification broadcast to active responders
 * 4. Automatic cleanup of invalid/stale FCM registration tokens
 * 5. Truthful status reporting (NO mock push, NO simulated delivery)
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { supabaseAdmin } from './supabaseAdmin.js';
import { logRescueEvent } from './dispatchService.js';

export interface DeviceRegistrationPayload {
  pushToken: string;
  platform?: string;
  deviceType?: string;
}

export interface PushSendResult {
  success: boolean;
  status: 'PUSH_ACCEPTED_BY_FCM' | 'NO_ACTIVE_PUSH_DEVICES' | 'NO_ACTIVE_RESPONDERS' | 'BLOCKED / CONFIGURATION REQUIRED' | 'PUSH_SEND_FAILED';
  sentCount: number;
  failureCount?: number;
  missingCredentials?: string[];
  message?: string;
}

// =============================================================================
// Firebase Admin SDK Messaging Initialization
// =============================================================================

let isFcmInitialized = false;
let fcmInitError: string | null = null;
let adminAppInstance: App | null = null;

function initializeFirebaseAdminMessaging(): boolean {
  if (isFcmInitialized) return true;
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminAppInstance = existingApps[0];
    isFcmInitialized = true;
    return true;
  }

  try {
    // Option A: Raw Service Account JSON
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const sa = typeof process.env.FIREBASE_SERVICE_ACCOUNT_KEY === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      adminAppInstance = initializeApp({
        credential: cert(sa),
      });
      isFcmInitialized = true;
      console.log('[NotificationService] Firebase Admin Messaging initialized via FIREBASE_SERVICE_ACCOUNT_KEY.');
      return true;
    }

    // Option B: Discrete environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'feeder-app-103ec';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    if (clientEmail && privateKeyRaw) {
      const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
      adminAppInstance = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      isFcmInitialized = true;
      console.log('[NotificationService] Firebase Admin Messaging initialized via discrete credentials.');
      return true;
    }

    fcmInitError = 'Missing server credentials: FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_KEY)';
    return false;
  } catch (err: any) {
    fcmInitError = err.message;
    console.warn('[NotificationService] Firebase Admin Messaging init failed:', err.message);
    return false;
  }
}

// Attempt initialization at module load
initializeFirebaseAdminMessaging();

/**
 * Inspects server-side FCM configuration status truthfully
 */
export async function getPushProviderStatus(): Promise<{
  configured: boolean;
  provider: 'fcm' | 'none';
  status: 'CONFIGURED' | 'BLOCKED / CONFIGURATION REQUIRED';
  missingCredentials: string[];
  activeDevicesCount: number;
  vapidConfigured: boolean;
}> {
  const isConfigured = initializeFirebaseAdminMessaging();
  const missing: string[] = [];

  if (!isConfigured) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!process.env.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY');
    }
  }

  const vapidConfigured = Boolean(
    process.env.VITE_FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY
  );

  // Count active devices in DB
  let activeCount = 0;
  try {
    const { count } = await supabaseAdmin
      .from('responder_devices')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    activeCount = count || 0;
  } catch (e) {}

  return {
    configured: isConfigured,
    provider: isConfigured ? 'fcm' : 'none',
    status: isConfigured ? 'CONFIGURED' : 'BLOCKED / CONFIGURATION REQUIRED',
    missingCredentials: missing,
    activeDevicesCount: activeCount,
    vapidConfigured,
  };
}

/**
 * Registers or refreshes a responder's FCM push token
 */
export async function registerResponderDevice(
  firebaseUid: string,
  payload: DeviceRegistrationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!payload.pushToken || !payload.pushToken.trim()) {
      return { success: false, error: 'Push token cannot be empty.' };
    }

    const platform = payload.platform || 'web';
    const deviceType = payload.deviceType || 'web';
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('responder_devices')
      .upsert(
        {
          firebase_uid: firebaseUid,
          push_token: payload.pushToken.trim(),
          platform,
          device_type: deviceType,
          is_active: true,
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: 'push_token' }
      );

    if (error) {
      console.warn('[NotificationService] Failed to register device token:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`[NotificationService] FCM token registered for responder ${firebaseUid} (${platform})`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Sends a real background FCM push notification to all active registered responders
 */
export async function sendEmergencyPushNotification(
  helpRequestId: string,
  emergencyType: string,
  address: string,
  latitude: number,
  longitude: number
): Promise<PushSendResult> {
  try {
    // 1. Query active responders
    const { data: responders, error: respErr } = await supabaseAdmin
      .from('responder_profiles')
      .select('firebase_uid')
      .in('role', ['responder', 'admin'])
      .eq('is_active', true);

    if (respErr || !responders || responders.length === 0) {
      return {
        success: false,
        status: 'NO_ACTIVE_RESPONDERS',
        sentCount: 0,
        message: 'No active responders registered.',
      };
    }

    const responderUids = responders.map(r => r.firebase_uid);

    // 2. Query active registered devices for those responders
    const { data: devices, error: devErr } = await supabaseAdmin
      .from('responder_devices')
      .select('id, firebase_uid, push_token')
      .in('firebase_uid', responderUids)
      .eq('is_active', true);

    if (devErr || !devices || devices.length === 0) {
      await logRescueEvent(
        helpRequestId,
        'SYSTEM',
        'no_active_push_devices',
        'No active registered push devices found for active responders.'
      );
      return {
        success: false,
        status: 'NO_ACTIVE_PUSH_DEVICES',
        sentCount: 0,
        message: 'No active responder devices registered for push notifications.',
      };
    }

    // 3. Verify server-side Firebase Admin Messaging is configured
    const isConfigured = initializeFirebaseAdminMessaging();
    if (!isConfigured) {
      const missing = ['FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
      await logRescueEvent(
        helpRequestId,
        'SYSTEM',
        'push_send_failed',
        'Push send skipped: Server Firebase Admin credentials not configured (BLOCKED / CONFIGURATION REQUIRED).'
      );
      return {
        success: false,
        status: 'BLOCKED / CONFIGURATION REQUIRED',
        sentCount: 0,
        missingCredentials: missing,
        message: 'Background push notifications are not configured on the server.',
      };
    }

    // 4. Dispatch real FCM multicast message
    await logRescueEvent(
      helpRequestId,
      'SYSTEM',
      'push_send_attempted',
      `Attempting FCM push delivery to ${devices.length} registered device(s).`
    );

    const tokens = devices.map(d => d.push_token);
    const message: MulticastMessage = {
      tokens,
      notification: {
        title: '🚨 Emergency Rescue Request',
        body: `Emergency reported: ${emergencyType} at ${address || 'nearby location'}.`,
      },
      data: {
        type: 'EMERGENCY_RESCUE',
        helpRequestId,
        emergencyType,
        latitude: String(latitude || ''),
        longitude: String(longitude || ''),
        route: `/?emergency=${helpRequestId}`,
      },
      webpush: {
        fcmOptions: {
          link: `/?emergency=${helpRequestId}`,
        },
        notification: {
          tag: `emergency-${helpRequestId}`,
          requireInteraction: true,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        },
      },
    };

    const messagingInstance = getMessaging(adminAppInstance || undefined);
    const response = await messagingInstance.sendEachForMulticast(message);
    const invalidTokens: string[] = [];

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errCode = resp.error.code || '';
        if (
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/registration-token-not-registered' ||
          errCode === 'messaging/mismatched-credential' ||
          errCode.includes('invalid') ||
          errCode.includes('not-registered') ||
          errCode.includes('argument')
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    // 5. Deactivate invalid/expired tokens
    if (invalidTokens.length > 0) {
      await supabaseAdmin
        .from('responder_devices')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('push_token', invalidTokens);

      await logRescueEvent(
        helpRequestId,
        'SYSTEM',
        'push_invalid_token',
        `Deactivated ${invalidTokens.length} expired or invalid FCM device token(s).`
      );
    }

    // 6. Record push result
    if (response.successCount > 0) {
      await logRescueEvent(
        helpRequestId,
        'SYSTEM',
        'push_send_success',
        `FCM push accepted for ${response.successCount}/${devices.length} device(s).`
      );
      return {
        success: true,
        status: 'PUSH_ACCEPTED_BY_FCM',
        sentCount: response.successCount,
        failureCount: response.failureCount,
        message: `FCM push notification sent to ${response.successCount} responder device(s).`,
      };
    } else {
      await logRescueEvent(
        helpRequestId,
        'SYSTEM',
        'push_send_failed',
        `FCM push failed for all ${devices.length} device(s).`
      );
      return {
        success: false,
        status: 'PUSH_SEND_FAILED',
        sentCount: 0,
        failureCount: response.failureCount,
        message: 'FCM push delivery failed for all registered devices.',
      };
    }
  } catch (err: any) {
    console.error('[NotificationService] Push delivery exception:', err.message);
    await logRescueEvent(
      helpRequestId,
      'SYSTEM',
      'push_send_failed',
      `Push delivery exception: ${err.message}`
    );
    return {
      success: false,
      status: 'PUSH_SEND_FAILED',
      sentCount: 0,
      message: err.message,
    };
  }
}
