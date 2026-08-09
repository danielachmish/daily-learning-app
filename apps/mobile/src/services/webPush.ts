import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Web Push for the browser/PWA build — this is the real fix for daily
 * reminders on web, where expo-notifications has no local-scheduling
 * support at all (see localNotifications.ts). The server (see the
 * send-reminder-pushes edge function) holds each subscribed browser's push
 * endpoint and sends the notification itself at the user's chosen time, so
 * nothing needs to run locally on a timer.
 *
 * Note for iOS: Safari only allows Web Push from a PWA that's been added to
 * the home screen (iOS 16.4+), not from a regular browser tab. That matches
 * exactly how this app is actually being distributed on the web today, so
 * it isn't a special case here — it just won't succeed if the user hasn't
 * installed the PWA yet, and the resulting error message says so.
 */

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  // new Uint8Array(length) allocates its own plain ArrayBuffer (not
  // Uint8Array.from, which types as the more general ArrayBufferLike and
  // doesn't satisfy PushSubscriptionOptionsInit.applicationServerKey).
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isWebPushSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

export async function subscribeToWebPush(userId: string): Promise<{ error: string | null }> {
  if (!isWebPushSupported()) {
    return { error: 'התראות דחיפה אינן נתמכות בדפדפן הזה.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { error: 'לא ניתנה הרשאה לשליחת התראות בדפדפן.' };
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { error: 'קבלת מנוי ההתראות מהדפדפן נכשלה.' };
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'הרשמה להתראות דחיפה נכשלה.' };
  }
}

export async function unsubscribeFromWebPush(): Promise<void> {
  if (!isWebPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  } catch {
    // Best-effort cleanup — an unsubscribe failure here shouldn't block the
    // user from turning the setting off in the UI.
  }
}
