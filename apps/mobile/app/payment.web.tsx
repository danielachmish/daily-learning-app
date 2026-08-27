import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NedarimIframeParams } from '../src/services/payments';
import { supabase } from '../src/services/supabase';
import { colors } from '../src/theme/colors';

type Phase = 'paying' | 'confirming' | 'success' | 'failed' | 'timeout';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 45; // ~90 seconds

const iframeStyle: React.CSSProperties = { flex: 1, width: '100%', border: 'none' };

/**
 * Embeds Nedarim Plus's secure payment iframe directly — card details are
 * entered there and never touch our app. The iframe's own postMessage
 * result is used only to switch this screen into "confirming" mode
 * sooner; it is NOT trusted as proof of payment (a malicious client could
 * fake a postMessage). The actual answer always comes from polling our
 * own `payments` row, which only the server-side nedarim-callback
 * function (verified by Nedarim's source IP) is allowed to mark paid —
 * same trust boundary as the old Stripe webhook.
 */
export default function PaymentScreenWeb() {
  const { paymentId, iframeUrl, params } = useLocalSearchParams<{
    paymentId: string;
    iframeUrl: string;
    params: string;
  }>();

  const [phase, setPhase] = useState<Phase>('paying');
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const iframeParams: NedarimIframeParams | null = params ? JSON.parse(params) : null;
  const src = iframeParams
    ? `${iframeUrl}?${new URLSearchParams(
        Object.entries(iframeParams).reduce<Record<string, string>>((acc, [key, value]) => {
          acc[key] = String(value ?? '');
          return acc;
        }, {})
      ).toString()}`
    : null;

  function startPolling() {
    if (pollTimerRef.current) return;
    setPhase('confirming');
    pollTimerRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      const { data } = await supabase.from('payments').select('status').eq('id', paymentId).single();

      if (data?.status === 'paid') {
        clearPolling();
        setPhase('success');
      } else if (data?.status === 'failed') {
        clearPolling();
        setPhase('failed');
      } else if (pollCountRef.current >= MAX_POLLS) {
        clearPolling();
        setPhase('timeout');
      }
    }, POLL_INTERVAL_MS);
  }

  function clearPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  useEffect(() => {
    // Any message from the iframe is treated only as a hint to start
    // confirming sooner — the content isn't parsed/trusted, since we
    // don't have Nedarim's exact postMessage schema confirmed.
    function handleMessage(event: MessageEvent) {
      if (typeof event.data !== 'undefined') {
        startPolling();
      }
    }
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'success') {
      const timeout = setTimeout(() => router.replace('/'), 2500);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  if (!src || !paymentId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.message}>חסרים פרטי תשלום. יש לחזור ולנסות שוב.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {phase === 'paying' && (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>תשלום מאובטח</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.cancelText}>ביטול</Text>
            </Pressable>
          </View>
          {/* Raw <iframe> — valid on web via react-native-web's JSX passthrough.
              Plain CSS object, not StyleSheet.create: `border` isn't a
              recognized RN ViewStyle property. */}
          <iframe src={src} style={iframeStyle} />
          <Pressable style={styles.manualCheckButton} onPress={startPolling}>
            <Text style={styles.manualCheckText}>סיימתי לשלם — בדוק סטטוס</Text>
          </Pressable>
        </>
      )}

      {phase === 'confirming' && (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.teal400} />
          <Text style={styles.message}>מוודא מול חברת הסליקה שהתשלום התקבל…</Text>
        </View>
      )}

      {phase === 'success' && (
        <View style={styles.centerFill}>
          <Text style={styles.successText}>התשלום התקבל בהצלחה! 🎉</Text>
        </View>
      )}

      {phase === 'failed' && (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>התשלום לא הושלם.</Text>
          <Pressable style={styles.manualCheckButton} onPress={() => router.back()}>
            <Text style={styles.manualCheckText}>לנסות שוב</Text>
          </Pressable>
        </View>
      )}

      {phase === 'timeout' && (
        <View style={styles.centerFill}>
          <Text style={styles.message}>
            עדיין מעבדים את התשלום — זה יכול לקחת כמה דקות. אפשר לחזור למסך הראשי ולבדוק שוב בהמשך.
          </Text>
          <Pressable style={styles.manualCheckButton} onPress={() => router.replace('/')}>
            <Text style={styles.manualCheckText}>חזרה למסך הראשי</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink900,
  },
  cancelText: {
    fontSize: 14,
    color: colors.slate500,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  message: {
    fontSize: 15,
    color: colors.ink700,
    textAlign: 'center',
  },
  successText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.success,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.danger,
    textAlign: 'center',
  },
  manualCheckButton: {
    margin: 16,
    alignSelf: 'center',
    backgroundColor: colors.teal400,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  manualCheckText: {
    color: colors.onTeal,
    fontSize: 14,
    fontWeight: '700',
  },
});
