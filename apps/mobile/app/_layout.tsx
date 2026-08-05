import { Stack } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../src/hooks/useAuth';
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
          <Stack screenOptions={{ headerShown: false }} />
        </DirectionSync>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
