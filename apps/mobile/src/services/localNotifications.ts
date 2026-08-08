import type { Language } from '@daily-learning/shared';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_IDENTIFIER = 'daily-lesson-reminder';
const ANDROID_CHANNEL_ID = 'daily-reminder';

/**
 * Expo Go on Android (SDK 53+) throws as soon as expo-notifications is
 * required at all — remote/push support was pulled from Expo Go, and the
 * module guards against being loaded there. A real dev build or standalone
 * build doesn't have this restriction. Since expo-router eagerly requires
 * every screen (including this one, via notification-settings.tsx) at app
 * launch to build its route table, a static top-level import would crash
 * the whole app on launch inside Expo Go — so it's required lazily here,
 * only when actually supported.
 */
const isExpoGoAndroid =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * expo-notifications ships no web implementation of its scheduling APIs
 * (only badge/push-token/server-registration have `.web.ts` overrides) —
 * `scheduleNotificationAsync`/`cancelScheduledNotificationAsync` fall back to
 * an empty stub and throw `UnavailabilityError` when called on web. Local
 * repeating reminders therefore aren't supported in the browser/PWA build at
 * all (there's no persistent OS-level scheduler to hook into), so this is
 * guarded the same way as the Expo Go Android case rather than letting the
 * throw go uncaught.
 */
const isWeb = Platform.OS === 'web';

let Notifications: typeof NotificationsModule | null = null;
if (!isExpoGoAndroid) {
  Notifications = require('expo-notifications') as typeof NotificationsModule;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const REMINDER_MESSAGES: Record<Language, { title: string; body: string }> = {
  he: { title: 'זמן ללימוד היומי!', body: 'בוא/י ללמוד את הלימוד של היום ולשמור על הרצף.' },
  en: { title: 'Time for your daily lesson!', body: "Come learn today's lesson and keep your streak going." },
};

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function ensureAndroidChannel(): Promise<void> {
  if (!Notifications || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'תזכורת יומית',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function scheduleReminderNotification(
  hour: number,
  minute: number,
  language: Language
): Promise<{ error: string | null }> {
  if (!Notifications) {
    return { error: 'התראות אינן נתמכות באפליקציית Expo Go באנדרואיד — יעבדו בגרסה המותקנת הרגילה.' };
  }

  if (isWeb) {
    return { error: 'תזכורות אינן נתמכות עדיין בגרסת הדפדפן — ההגדרה נשמרה ותופעל כשתתקינו את האפליקציה.' };
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    return { error: 'לא ניתנה הרשאה לשליחת התראות.' };
  }

  await ensureAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => undefined);

  const message = REMINDER_MESSAGES[language];

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: { title: message.title, body: message.body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });

  return { error: null };
}

export async function cancelReminderNotification(): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => undefined);
}
