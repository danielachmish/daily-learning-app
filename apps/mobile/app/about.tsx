import { useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/hooks/useAuth';
import { ACCESSIBILITY_STATEMENT_URL, PRIVACY_POLICY_URL, TERMS_URL } from '../src/constants/legalUrls';
import { colors } from '../src/theme/colors';
import { isRTL } from '../src/utils/rtl';

/**
 * The only place besides the (one-time) registration screen where these
 * legal documents are reachable — without this, a user who's already
 * signed up would have no way back to them. Also required in practice:
 * Israeli accessibility regulations expect the accessibility statement to
 * stay reachable from within the service itself, not just at sign-up.
 */
export default function AboutScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const rtl = isRTL(profile?.language ?? 'he');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.backLink}>{rtl ? '‹ חזרה' : 'Back'}</Text>
      </Pressable>

      <Text style={[styles.title, rtl && styles.textRTL]}>אודות ומידע משפטי</Text>

      <View style={styles.linkList}>
        <Pressable style={styles.linkRow} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          <Text style={[styles.linkText, rtl && styles.textRTL]}>מדיניות פרטיות</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => Linking.openURL(TERMS_URL)}>
          <Text style={[styles.linkText, rtl && styles.textRTL]}>תנאי שימוש</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => Linking.openURL(ACCESSIBILITY_STATEMENT_URL)}>
          <Text style={[styles.linkText, rtl && styles.textRTL]}>הצהרת נגישות</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => Linking.openURL('https://danielachmish.com')}>
        <Text style={styles.creditText}>{'נבנה ע"י דניאל לחמיש'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
    padding: 20,
    gap: 8,
  },
  backLink: {
    color: colors.teal600,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink900,
    marginBottom: 12,
  },
  textRTL: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  linkList: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  linkRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  linkText: {
    fontSize: 16,
    color: colors.ink700,
  },
  creditText: {
    textAlign: 'center',
    color: colors.slate300,
    fontSize: 12,
    marginTop: 'auto',
    paddingTop: 24,
    textDecorationLine: 'underline',
  },
});
