import { Alert, Platform } from 'react-native';

/**
 * `Alert.alert()` from react-native is a silent no-op on web (react-native-
 * web doesn't implement it) — any screen shared between native and web that
 * uses it directly just does nothing when tapped there: no dialog, no error
 * shown, no confirmation, and (worse) any code inside an Alert.alert button
 * callback simply never runs. app/payment.web.tsx already worked around
 * this in its own web-only file by calling the browser's confirm()/alert()
 * directly; these two helpers do the same for screens that are NOT split
 * into separate native/web files (e.g. MyDedicationsScreen, paywall.tsx),
 * so they behave correctly on both platforms from one code path.
 */

/** Shows a message. Resolves once dismissed (native) or immediately (web, synchronous alert()). */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** Resolves true if confirmed, false if cancelled — works the same on native and web. */
export function confirmAsync(title: string, message?: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'ביטול', style: 'cancel', onPress: () => resolve(false) },
      { text: 'אישור', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
