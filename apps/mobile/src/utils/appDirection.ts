import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';

const LAST_APPLIED_DIRECTION_KEY = 'daily-learning:last-applied-rtl';

/**
 * Forces React Native's native layout direction (flex mirroring, nav
 * transitions, ScrollView, etc — not just text alignment) to match the
 * user's language. Native RTL state persists across restarts once set, so
 * this only actually reloads the app on the rare occasions it's out of
 * sync (first login after registering in a mismatched state, or an
 * explicit language change) — not on every launch.
 */
export async function syncAppDirection(shouldBeRTL: boolean): Promise<void> {
  if (Platform.OS === 'web') {
    // There's no native module backing I18nManager on web, and a "reload"
    // there is just a fresh page load with no memory of forceRTL — the DOM
    // dir attribute is the actual mechanism the browser and
    // react-native-web use to mirror layout, so set it directly.
    const dir = shouldBeRTL ? 'rtl' : 'ltr';
    if (document.documentElement.dir !== dir) {
      document.documentElement.dir = dir;
    }
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(shouldBeRTL);
    return;
  }

  // Guard against a reload loop: in Expo Go, reloadAsync() restarts the JS
  // context but I18nManager.isRTL can read back stale on the next launch,
  // so relying on it alone never converges and this would otherwise fire
  // on every single reload forever. A module-level flag doesn't survive
  // reloadAsync() either — it wipes all JS state — so the last-applied
  // direction has to be persisted to device storage to actually stick.
  const lastApplied = await AsyncStorage.getItem(LAST_APPLIED_DIRECTION_KEY);
  if (lastApplied === String(shouldBeRTL)) return;
  if (I18nManager.isRTL === shouldBeRTL) {
    await AsyncStorage.setItem(LAST_APPLIED_DIRECTION_KEY, String(shouldBeRTL));
    return;
  }

  I18nManager.allowRTL(true);
  I18nManager.forceRTL(shouldBeRTL);
  await AsyncStorage.setItem(LAST_APPLIED_DIRECTION_KEY, String(shouldBeRTL));

  try {
    await Updates.reloadAsync();
  } catch {
    // Not available in this environment (e.g. some Expo Go setups) — the
    // new native direction still takes effect next time the app is
    // manually restarted.
  }
}
