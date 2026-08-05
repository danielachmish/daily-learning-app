import type { Language } from '@daily-learning/shared';
import * as Localization from 'expo-localization';

/** Whether the UI should be laid out right-to-left for the given language. */
export function isRTL(language: Language): boolean {
  return language === 'he';
}

/**
 * Best-effort RTL default for screens reached before a profile exists
 * (login) — reads the device/browser's actual locale rather than
 * I18nManager.isRTL, which only reflects whatever direction has already
 * been forced (or the untouched LTR default) and is not itself a locale
 * check.
 */
export function isDeviceRTL(): boolean {
  return Localization.getLocales()[0]?.textDirection === 'rtl';
}
