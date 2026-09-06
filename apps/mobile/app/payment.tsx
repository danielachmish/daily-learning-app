import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/hooks/useAuth';
import { t } from '../src/i18n/strings';
import { colors } from '../src/theme/colors';

/**
 * Native fallback — the real payment flow (app/payment.web.tsx) embeds
 * Nedarim Plus's secure iframe directly, which is a web-only mechanism.
 * A native build would need react-native-webview plus a different
 * message-passing bridge; out of scope while the app is distributed as a
 * web/PWA build (see localNotifications.ts / webPush.ts for the same
 * web-vs-native split pattern elsewhere in payments/notifications).
 */
export default function PaymentScreenNativeFallback() {
  const { profile } = useAuth();
  const s = t(profile?.language ?? 'he');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>{s.paymentNativeFallback.title}</Text>
        <Text style={styles.body}>{s.paymentNativeFallback.body}</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>{s.paymentNativeFallback.back}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink900,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: colors.ink700,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: colors.teal400,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  buttonText: {
    color: colors.onTeal,
    fontSize: 15,
    fontWeight: '700',
  },
});
