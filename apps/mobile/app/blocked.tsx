import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/hooks/useAuth';
import { t } from '../src/i18n/strings';
import { colors } from '../src/theme/colors';
import { isRTL } from '../src/utils/rtl';

export default function BlockedScreen() {
  const { session, profile, signOut } = useAuth();
  const language = profile?.language ?? 'he';
  const rtl = isRTL(language);
  const s = t(language);

  // Same fix as paywall.tsx: signOut() really does clear the session, but
  // this screen otherwise has no way to know to leave — it would just sit
  // there unchanged, looking like the button did nothing.
  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={[styles.title, rtl && styles.textRTL]}>{s.blocked.title}</Text>
      <Text style={[styles.subtitle, rtl && styles.textRTL]}>{s.blocked.subtitle}</Text>
      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>{s.blocked.signOut}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink900,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: 'center',
    marginBottom: 16,
  },
  textRTL: {
    writingDirection: 'rtl',
  },
  signOutButton: {
    marginTop: 12,
    backgroundColor: colors.teal400,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  signOutText: {
    color: colors.onTeal,
    fontSize: 15,
    fontWeight: '700',
  },
});
