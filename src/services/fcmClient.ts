/**
 * Frontend Firebase Cloud Messaging (FCM) Client Service
 * 
 * Handles:
 * 1. Browser Notification API & Service Worker support checks
 * 2. Notification.requestPermission() user permission flow
 * 3. Service worker registration (/firebase-messaging-sw.js)
 * 4. FCM token retrieval using public VAPID key (VITE_FIREBASE_VAPID_KEY)
 * 5. Device token registration with the authenticated backend API
 * 6. Foreground message listener (onMessage) without duplicate alerts
 * 7. Background notification click navigation handling (postMessage)
 * 8. Truthful reporting when VAPID configuration is missing
 */

import { isSupported, getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { app } from './firebaseAuth';
import { authenticatedFetch } from './apiClient';

export type FcmRegistrationStep =
  | 'checking_support'
  | 'requesting_permission'
  | 'registering_service_worker'
  | 'generating_token'
  | 'registering_device'
  | 'success'
  | 'failed';

export interface FcmRegistrationResult {
  success: boolean;
  permission: NotificationPermission | 'unsupported';
  status: 'CONFIGURED' | 'PERMISSION_DENIED' | 'UNSUPPORTED' | 'BLOCKED / CONFIGURATION REQUIRED';
  error?: string;
  step?: FcmRegistrationStep;
}

let messagingInstance: Messaging | null = null;

/**
 * Checks if the current environment supports Push Notifications
 */
export async function isBrowserPushSupported(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === 'undefined') return false;
  const hasApis = (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
  if (!hasApis) return false;

  try {
    return await isSupported();
  } catch (e) {
    return false;
  }
}

/**
 * Gets the current Notification permission state
 */
export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  if (Capacitor.isNativePlatform()) return 'default';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Gets or initializes the Firebase Messaging instance safely
 */
function getMessagingSafe(): Messaging | null {
  if (messagingInstance) return messagingInstance;
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window)) return null;
  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err: any) {
    console.warn('[FCM Client] Failed to initialize Firebase Messaging:', err?.code || err?.message || err);
    return null;
  }
}

/**
 * Requests notification permission, obtains real FCM token, and registers it with the backend.
 * Provides granular progress tracking and truthful error diagnostics without exposing tokens.
 */
export async function registerFcmPushToken(
  onProgress?: (step: FcmRegistrationStep) => void
): Promise<FcmRegistrationResult> {
  // 0. Handle native Android via Capacitor Push Notifications
  if (Capacitor.isNativePlatform()) {
    try {
      onProgress?.('requesting_permission');
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') {
        onProgress?.('failed');
        return {
          success: false,
          permission: 'denied',
          status: 'PERMISSION_DENIED',
          step: 'requesting_permission',
          error: 'Push notification permission was denied on this Android device.',
        };
      }

      onProgress?.('generating_token');
      return await new Promise<FcmRegistrationResult>((resolve) => {
        let completed = false;
        const timeout = setTimeout(() => {
          if (!completed) {
            completed = true;
            resolve({
              success: false,
              permission: 'granted',
              status: 'BLOCKED / CONFIGURATION REQUIRED',
              step: 'generating_token',
              error: 'Native FCM token generation timed out. Ensure google-services.json from Firebase project feeder-app-103ec is in android/app/.',
            });
          }
        }, 10000);

        PushNotifications.addListener('registration', async (token) => {
          if (completed) return;
          completed = true;
          clearTimeout(timeout);
          onProgress?.('registering_device');
          try {
            const regResponse = await authenticatedFetch('/api/notifications/register-device', {
              method: 'POST',
              body: JSON.stringify({
                token: token.value,
                pushToken: token.value,
                deviceType: 'android',
                platform: 'android',
              }),
            });
            if (!regResponse.success) {
              resolve({
                success: false,
                permission: 'granted',
                status: 'BLOCKED / CONFIGURATION REQUIRED',
                step: 'registering_device',
                error: regResponse.error || 'Backend rejected Android device registration.',
              });
              return;
            }
            onProgress?.('success');
            resolve({
              success: true,
              permission: 'granted',
              status: 'CONFIGURED',
              step: 'success',
            });
          } catch (err: any) {
            resolve({
              success: false,
              permission: 'granted',
              status: 'BLOCKED / CONFIGURATION REQUIRED',
              step: 'registering_device',
              error: err.message || 'Failed to register Android device with backend.',
            });
          }
        });

        PushNotifications.addListener('registrationError', (err) => {
          if (completed) return;
          completed = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            permission: 'granted',
            status: 'BLOCKED / CONFIGURATION REQUIRED',
            step: 'generating_token',
            error: `Native FCM registration error: ${err?.error || 'Missing or invalid google-services.json'}. Download from Firebase Console (feeder-app-103ec).`,
          });
        });

        PushNotifications.register().catch((err) => {
          if (completed) return;
          completed = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            permission: 'granted',
            status: 'BLOCKED / CONFIGURATION REQUIRED',
            step: 'generating_token',
            error: `PushNotifications.register() failed: ${err?.message || err}. Ensure google-services.json is configured.`,
          });
        });
      });
    } catch (err: any) {
      onProgress?.('failed');
      return {
        success: false,
        permission: 'granted',
        status: 'BLOCKED / CONFIGURATION REQUIRED',
        step: 'generating_token',
        error: `Native push initialization error: ${err?.message || err}`,
      };
    }
  }

  // 1. Check browser support
  onProgress?.('checking_support');
  const supported = await isBrowserPushSupported();
  if (!supported) {
    onProgress?.('failed');
    return {
      success: false,
      permission: 'unsupported',
      status: 'UNSUPPORTED',
      step: 'checking_support',
      error: 'Your browser environment does not support Firebase Cloud Messaging or Push Notifications.',
    };
  }

  // 2. Check/Request Notification Permission
  onProgress?.('requesting_permission');
  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch (permErr: any) {
      console.warn('[FCM Client] Permission request error:', permErr?.message);
    }
  }

  if (permission !== 'granted') {
    onProgress?.('failed');
    return {
      success: false,
      permission,
      status: 'PERMISSION_DENIED',
      step: 'requesting_permission',
      error: permission === 'denied'
        ? 'Notification permission is blocked in your browser. Click the site settings/padlock icon next to the URL in Chrome, set Notifications to "Allow", and reload.'
        : 'Browser notification prompt was dismissed without granting permission. Click "Enable" and select "Allow".',
    };
  }

  // 3. Check for VAPID public key
  const vapidKey = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_VAPID_KEY) ||
    ''
  ).trim();

  if (!vapidKey) {
    onProgress?.('failed');
    console.warn('[FCM Client] BLOCKED / CONFIGURATION REQUIRED: VITE_FIREBASE_VAPID_KEY is missing.');
    return {
      success: false,
      permission: 'granted',
      status: 'BLOCKED / CONFIGURATION REQUIRED',
      step: 'generating_token',
      error: 'VITE_FIREBASE_VAPID_KEY is missing in frontend configuration. Push notifications cannot be initialized without a valid VAPID public key.',
    };
  }

  try {
    // 4. Register or reuse Service Worker
    onProgress?.('registering_service_worker');
    let swReg: ServiceWorkerRegistration;
    try {
      swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      await navigator.serviceWorker.ready;
    } catch (swErr: any) {
      onProgress?.('failed');
      console.error('[FCM Client] Service worker registration error:', swErr?.message || swErr);
      return {
        success: false,
        permission: 'granted',
        status: 'BLOCKED / CONFIGURATION REQUIRED',
        step: 'registering_service_worker',
        error: `Failed to register Firebase Messaging Service Worker: ${swErr?.message || 'ServiceWorker registration failed'}`,
      };
    }

    // 5. Initialize Messaging
    const messaging = getMessagingSafe();
    if (!messaging) {
      onProgress?.('failed');
      return {
        success: false,
        permission: 'granted',
        status: 'UNSUPPORTED',
        step: 'generating_token',
        error: 'Unable to initialize Firebase Messaging instance on this browser.',
      };
    }

    // 6. Obtain real FCM Token using VAPID public key
    onProgress?.('generating_token');
    let currentToken = '';
    try {
      currentToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swReg,
      });
    } catch (tokenErr: any) {
      onProgress?.('failed');
      const errCode = tokenErr?.code || '';
      const errMsg = tokenErr?.message || '';
      console.error('[FCM Client] getToken error code:', errCode, 'message:', errMsg);

      let classifiedMsg = 'Failed to generate browser push token from Firebase.';
      if (errCode === 'messaging/permission-blocked' || errMsg.includes('permission')) {
        classifiedMsg = 'Notification permission is blocked. Please allow notifications in Chrome site settings.';
      } else if (errCode === 'messaging/failed-service-worker-registration' || errMsg.includes('ServiceWorker')) {
        classifiedMsg = 'Service worker failed to link with Firebase Messaging. Please refresh the page and try again.';
      } else if (errCode === 'messaging/unsupported-browser') {
        classifiedMsg = 'Firebase Messaging is not supported on this browser.';
      } else if (errMsg.includes('vapid') || errMsg.includes('application-server-key')) {
        classifiedMsg = 'Invalid or mismatched VAPID public key in VITE_FIREBASE_VAPID_KEY.';
      }

      return {
        success: false,
        permission: 'granted',
        status: 'BLOCKED / CONFIGURATION REQUIRED',
        step: 'generating_token',
        error: `${classifiedMsg} (${errCode || errMsg})`,
      };
    }

    if (!currentToken || !currentToken.trim()) {
      onProgress?.('failed');
      return {
        success: false,
        permission: 'granted',
        status: 'BLOCKED / CONFIGURATION REQUIRED',
        step: 'generating_token',
        error: 'No registration token returned by Firebase. Please try again.',
      };
    }

    // 7. Register device token on authenticated backend API
    onProgress?.('registering_device');
    try {
      const regResponse = await authenticatedFetch('/api/notifications/register-device', {
        method: 'POST',
        body: JSON.stringify({
          token: currentToken,
          pushToken: currentToken,
          deviceType: 'web',
          platform: 'web',
        }),
      });

      if (!regResponse.success) {
        onProgress?.('failed');
        return {
          success: false,
          permission: 'granted',
          status: 'BLOCKED / CONFIGURATION REQUIRED',
          step: 'registering_device',
          error: regResponse.error || 'Backend rejected device registration.',
        };
      }
    } catch (apiErr: any) {
      onProgress?.('failed');
      console.error('[FCM Client] Backend registration HTTP error:', apiErr?.message);
      return {
        success: false,
        permission: 'granted',
        status: 'BLOCKED / CONFIGURATION REQUIRED',
        step: 'registering_device',
        error: `Backend registration error: ${apiErr.message}`,
      };
    }

    // 8. Completed successfully
    onProgress?.('success');
    console.log('[FCM Client] Real FCM push token registered successfully on backend.');
    return {
      success: true,
      permission: 'granted',
      status: 'CONFIGURED',
      step: 'success',
    };
  } catch (err: any) {
    onProgress?.('failed');
    console.error('[FCM Client] Unexpected error during push token registration:', err?.message || err);
    return {
      success: false,
      permission: 'granted',
      status: 'BLOCKED / CONFIGURATION REQUIRED',
      step: 'failed',
      error: err.message || 'Failed to complete FCM push registration.',
    };
  }
}

/**
 * Sets up foreground FCM message listener
 * Dispatches callback when message is received while app is active
 */
export function setupForegroundFcmListener(
  onEmergencyMessage: (payload: any) => void
): () => void {
  if (Capacitor.isNativePlatform()) {
    try {
      const listenerPromise = PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[FCM Client] Foreground native push notification received:', notification);
        onEmergencyMessage(notification);
      });
      return () => {
        listenerPromise.then(h => h.remove()).catch(() => {});
      };
    } catch (err) {
      console.warn('[FCM Client] Native pushNotificationReceived listener error:', err);
      return () => {};
    }
  }

  const messaging = getMessagingSafe();
  if (!messaging) return () => {};

  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM Client] Foreground message received:', payload);
      onEmergencyMessage(payload);
    });
    return unsubscribe;
  } catch (err) {
    console.warn('[FCM Client] Error setting up onMessage listener:', err);
    return () => {};
  }
}

/**
 * Listens for background notification click messages
 */
export function setupServiceWorkerMessageListener(
  onNavigate: (helpRequestId: string, route: string) => void
): () => void {
  if (Capacitor.isNativePlatform()) {
    try {
      const listenerPromise = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[FCM Client] Background native push notification tapped:', action);
        const data = action.notification?.data;
        if (data && data.helpRequestId) {
          onNavigate(data.helpRequestId, data.route || '/');
        }
      });
      return () => {
        listenerPromise.then(h => h.remove()).catch(() => {});
      };
    } catch (err) {
      console.warn('[FCM Client] Native pushNotificationActionPerformed listener error:', err);
      return () => {};
    }
  }

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'NAVIGATE_EMERGENCY') {
      console.log('[FCM Client] Background notification click event received:', event.data);
      onNavigate(event.data.helpRequestId, event.data.route || '/');
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}
