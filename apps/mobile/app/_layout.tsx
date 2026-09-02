import { Stack } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppAlertHost } from '../src/components/AppAlertHost';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { colors } from '../src/theme/colors';
import { syncAppDirection } from '../src/utils/appDirection';
import { isDeviceRTL, isRTL } from '../src/utils/rtl';

/**
 * Keeps React Native's native layout direction in sync with the user's
 * language. Before login it falls back to the device's own locale, since no
 * profile exists yet.
 */
function DirectionSync({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const shouldBeRTL = profile ? isRTL(profile.language) : isDeviceRTL();
    syncAppDirection(shouldBeRTL);
  }, [loading, profile?.language]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DirectionSync>
          {/* On web, every screen was built full-bleed with no width cap —
              fine on a phone, but on a wide desktop browser the content
              just hugs one side with a huge empty gap on the other. This
              frame caps the app at phone width and centers it, same
              pattern most mobile-first web apps use for desktop. Native
              is untouched (maxWidth: undefined there, so it's a no-op). */}
          <View style={styles.outer}>
            <View style={styles.frame}>
              <Stack screenOptions={{ headerShown: false }} />
            </View>
          </View>
          {/* Mounted once here so notify()/confirmAsync() (src/utils/alerts.ts)
              work from any screen or service, on-brand instead of the
              browser's/OS's own generic alert chrome. */}
          <AppAlertHost />
        </DirectionSync>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? colors.ink900 : colors.paper0,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    backgroundColor: colors.paper0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'web' ? 0.25 : 0,
    shadowRadius: 40,
  },
});
