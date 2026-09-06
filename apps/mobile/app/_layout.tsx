import { router, Stack } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
              {/* Every screen used to hide the header entirely and build its
                  own top row from scratch — fine on Android (the hardware/
                  gesture back button always works), but left iOS and web
                  users with no way back off a screen like calendar,
                  notification settings, or "about" except closing the app.
                  A shared native header gives every pushed screen a back
                  arrow for free (React Navigation only shows one when
                  there's actually a previous screen to return to, and
                  already flips its side/direction under RTL — see
                  syncAppDirection above). Title text is deliberately empty:
                  screens already show their own heading inline below it. */}
              <Stack
                screenOptions={{
                  headerShown: true,
                  headerTitle: '',
                  headerBackTitle: '',
                  headerBackButtonDisplayMode: 'minimal',
                  headerTintColor: colors.teal600,
                  headerStyle: { backgroundColor: colors.paper0 },
                  headerShadowVisible: false,
                  // headerTintColor alone rendered invisible on web (arrow
                  // came out the same color as its own background — a
                  // react-navigation/web theming quirk, not something
                  // reproducible to inspect further in this sandbox). A
                  // custom headerLeft sidesteps it entirely: this Text's
                  // color is set directly, with no theme/tint indirection
                  // for a platform's header renderer to drop.
                  headerLeft: ({ canGoBack }) =>
                    canGoBack ? (
                      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
                        <Text style={styles.backButtonText}>‹</Text>
                      </Pressable>
                    ) : null,
                }}
              >
                {/* These are the app's entry/gate screens — reached via
                    router.replace (not pushed), so there's never actually a
                    previous screen to go back to, but without this they'd
                    still show an empty, pointless header bar above their
                    own centered content. */}
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="register" options={{ headerShown: false }} />
                <Stack.Screen name="paywall" options={{ headerShown: false }} />
                <Stack.Screen name="blocked" options={{ headerShown: false }} />
              </Stack>
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
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    color: colors.teal600,
    fontSize: 28,
    fontWeight: '700',
  },
});
